

// Data operations using GitHub data.json file
const githubData = {
    // Load data from GitHub data.json file
    load: async () => {
        try {
            const githubToken = getSetting('gh_token');
            const githubUsername = getSetting('gh_username');
            const githubRepo = getSetting('gh_repo');
            const filename = getSetting('gh_filename') || 'data.json';
            
            if (!githubToken || !githubUsername || !githubRepo) {
                console.warn('GitHub credentials not configured for loading');
                // Fallback to local data.json if GitHub credentials not set
                try {
                    const response = await fetch('data.json');
                    if (response.ok) {
                        const data = await response.json();
                        return data || [];
                    }
                } catch (e) {
                    console.warn('Local data.json also not available');
                }
                return [];
            }
            
            // Fetch from GitHub API
            const response = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filename}`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                // If GitHub authentication fails (401, 403), fall back to local data.json
                if (response.status === 401 || response.status === 403) {
                    console.warn('GitHub authentication failed, falling back to local data.json');
                    try {
                        const localResponse = await fetch('data.json');
                        if (localResponse.ok) {
                            const data = await localResponse.json();
                            return data || [];
                        }
                    } catch (e) {
                        console.warn('Local data.json also not available');
                    }
                }
                throw new Error(`GitHub API Error: HTTP ${response.status}: ${response.statusText}`);
            }
            
            const fileData = await response.json();
            const content = atob(fileData.content);
            const data = JSON.parse(content);
            return data || [];
            
        } catch (error) {
            console.error('Error loading data from GitHub:', error);
            // Try to load from local data.json as final fallback
            try {
                const response = await fetch('data.json');
                if (response.ok) {
                    const data = await response.json();
                    return data || [];
                }
            } catch (e) {
                console.warn('Local data.json also not available');
            }
            return [];
        }
    },
    
    // Save data to GitHub data.json file
    // Save data to GitHub data.json file
    save: async (data) => {
        try {
            const githubToken = getSetting('gh_token');
            const githubUsername = getSetting('gh_username');
            const githubRepo = getSetting('gh_repo');
            const filename = getSetting('gh_filename') || 'data.json';
            
            if (!githubToken || !githubUsername || !githubRepo) {
                console.warn('GitHub credentials not configured for saving');
                return false;
            }
            
            // Added cache: 'no-store' to prevent stale SHA errors on back-to-back saves
            const fileResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filename}`, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                cache: 'no-store'
            });
            
            let sha = null;
            if (fileResponse.ok) {
                const fileInfo = await fileResponse.json();
                sha = fileInfo.sha;
            }
            
            // Prepare data
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
            
            // Build request body dynamically to avoid sending 'sha: null'
            const requestBody = {
                message: 'Update wallet data via web app',
                content: content,
                branch: 'main' // NOTE: Change to 'master' if your GitHub repo uses master
            };
            
            // Only attach the SHA if the file already exists
            if (sha) {
                requestBody.sha = sha;
            }
            
            // Update file
            const updateResponse = await fetch(`https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/${filename}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (updateResponse.ok) {
                console.log('Data saved to GitHub successfully');
                return true;
            } else {
                const error = await updateResponse.json();
                console.error('GitHub save error:', error);
                return false;
            }
            
        } catch (error) {
            console.error('Error saving to GitHub:', error);
            return false;
        }
    },
    
    // Add new transaction
    add: async (transaction) => {
        const data = await githubData.load();
        data.push(transaction);
        return await githubData.save(data);
    },
    
    // Update transaction
    update: async (id, updates) => {
        const data = await githubData.load();
        const index = data.findIndex(t => t.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates };
            return await githubData.save(data);
        }
        return false;
    },
    
    // Delete transaction
    delete: async (id) => {
        const data = await githubData.load();
        const filtered = data.filter(t => t.id !== id);
        return await githubData.save(filtered);
    }
};

let transactions = [];

// Default users with PINs
const DEFAULT_USERS = { safar: 'safar1997', renu: 'renu' };
const DEFAULT_PINS = { '7467': 'safar', '9999': 'renu' };
const DEFAULT_ADMINS = ['safar'];
const DEFAULT_PERMS = { safar: { read: 1, write: 1, view: 1, delete: 1 }, renu: { read: 1, write: 0, view: 1, delete: 0 } };

const getUsers = () => { try { return JSON.parse(localStorage.getItem('wallet_users') || '{}'); } catch(e) { return {}; } };
const setUsers = (u) => localStorage.setItem('wallet_users', JSON.stringify(u));
const getUserNames = () => Object.keys({ ...DEFAULT_USERS, ...getUsers() });
const getPassword = (u) => getUsers()[u] || DEFAULT_USERS[u];
const isAdminUser = (u) => { try { return (JSON.parse(localStorage.getItem('wallet_admins') || '[]')).includes(u) || DEFAULT_ADMINS.includes(u); } catch(e) { return DEFAULT_ADMINS.includes(u); } };
const PERMS = ['read', 'write', 'view', 'delete'];

const getPerms = () => { try { return JSON.parse(localStorage.getItem('user_perms') || '{}'); } catch(e) { return {}; } };
const getPerm = (user, perm) => { if (!user) return 0; const p = getPerms(); return (p[user] && p[user][perm]) || (DEFAULT_PERMS[user] && DEFAULT_PERMS[user][perm]) ? 1 : 0; };
const setPerms = (p) => localStorage.setItem('user_perms', JSON.stringify(p));
const getCurrentUser = () => sessionStorage.getItem('wallet_user');
const setCurrentUser = (u) => { if(u) sessionStorage.setItem('wallet_user', u); else sessionStorage.removeItem('wallet_user'); };
const isAdmin = () => isAdminUser(getCurrentUser());
const getTrackUser = () => {
    if (!isAdmin()) return getCurrentUser() || 'safar';
    return sessionStorage.getItem('track_user') || getCurrentUser() || 'safar';
};
const setTrackUser = (u) => sessionStorage.setItem('track_user', u);

// Quick login function for one-click access
function quickLogin(username) {
    const password = getPassword(username);
    if (password) {
        // Set the form values and call doLogin
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        doLogin();
    } else {
        const err = document.getElementById('login-error');
        err.textContent = 'User not found';
    }
}

// Login mode toggle function
function switchLoginMode(mode) {
    const pinSection = document.getElementById('pin-section');
    const passwordSection = document.getElementById('password-section');
    const pinModeBtn = document.getElementById('pin-mode-btn');
    const passwordModeBtn = document.getElementById('password-mode-btn');
    const loginError = document.getElementById('login-error');
    
    // Clear any existing errors
    loginError.textContent = '';
    
    if (mode === 'pin') {
        // Switch to PIN mode
        pinSection.style.display = 'block';
        passwordSection.style.display = 'none';
        pinModeBtn.classList.add('active');
        passwordModeBtn.classList.remove('active');
        
        // Clear password fields
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    } else {
        // Switch to Password mode
        pinSection.style.display = 'none';
        passwordSection.style.display = 'block';
        pinModeBtn.classList.remove('active');
        passwordModeBtn.classList.add('active');
        
        // Clear PIN fields and indicators
        document.getElementById('login-pin').value = '';
        document.getElementById('pin-user-indicator').style.display = 'none';
    }
}

// Expose functions to global window object for HTML onclick handlers
window.quickLogin = quickLogin;
window.switchLoginMode = switchLoginMode;

// PIN-based login function
function doPinLogin() {
    const pinInput = document.getElementById('login-pin');
    const pin = pinInput.value;
    const err = document.getElementById('login-error');
    const userIndicator = document.getElementById('pin-user-indicator');
    
    // Clear previous error
    err.textContent = '';
    
    // Check if PIN is exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
        userIndicator.style.display = 'none';
        return;
    }
    
    // Check if PIN matches any user
    const username = DEFAULT_PINS[pin] || null;
    
    if (!username) {
        err.textContent = 'Invalid PIN';
        userIndicator.style.display = 'none';
        return;
    }
    
    // Show user indicator
    userIndicator.style.display = 'block';
    userIndicator.textContent = `Logging in as: ${username}`;
    userIndicator.style.color = username === 'safar' ? '#007bff' : '#28a745';
    
    // Auto-login after short delay to show the indicator
    setTimeout(() => {
        const password = getPassword(username);
        if (password) {
            // Simulate login process
            setCurrentUser(username);
            setTrackUser(username);
            showApp();
            
            // Clear PIN input
            pinInput.value = '';
            userIndicator.style.display = 'none';
        } else {
            err.textContent = 'User configuration error';
            userIndicator.style.display = 'none';
        }
    }, 300);
}

async function doLogin() {
    const u = (document.getElementById('login-username').value || '').trim().toLowerCase();
    const p = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    
    // Debug logging
    console.log('Login attempt:', { username: u, password: p ? '***' : '', allUsers: getUserNames() });
    
    // Check if user exists in either default users or custom users
    const allUsers = getUserNames();
    if (!allUsers.includes(u)) {
        err.textContent = 'Invalid username or password';
        console.log('User not found in:', allUsers);
        return;
    }
    
    // Get the correct password for this user
    const correctPassword = getPassword(u);
    console.log('Password check:', { correctPassword: correctPassword ? '***' : 'undefined', inputPassword: p ? '***' : '' });
    
    if (!correctPassword || correctPassword !== p) {
        err.textContent = 'Invalid username or password';
        return;
    }
    
    err.textContent = '';
    setCurrentUser(u);
    setTrackUser(u);
    await showApp(); // showApp now handles data loading
}

window.logout = function() {
    setCurrentUser('');
    transactions = []; // Clear transactions on logout
    
    // Clear UI
    document.getElementById('history-list').innerHTML = '';
    document.getElementById('total-asset').innerText = '0.00 AED';
    document.getElementById('total-inc').innerText = '0.00 AED';
    document.getElementById('total-exp').innerText = '0.00 AED';
    document.getElementById('total-balance').innerText = '0.00 AED';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.remove('visible');
    
    // Force modals to hide instead of toggling them
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) settingsModal.style.display = 'none';
    
    const permsModal = document.getElementById('permissions-modal');
    if (permsModal) permsModal.style.display = 'none';
}

window.showPage = function(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    document.getElementById('nav-' + page).classList.add('active');
    if (page === 'users') {
        renderUserList();
        loadGhSettings();
    }
    if (page === 'all-data') {
        loadAllData();
    }
}

function loadGhSettings() {
    document.getElementById('gh-username').value = getSetting('gh_username') || '';
    document.getElementById('gh-repo').value = getSetting('gh_repo') || '';
    document.getElementById('gh-filename').value = getSetting('gh_filename') || 'data.json';
    document.getElementById('gh-token').value = getSetting('gh_token') || '';
}

function saveGhSetting() {
    localStorage.setItem('gh_username', document.getElementById('gh-username').value);
    localStorage.setItem('gh_repo', document.getElementById('gh-repo').value);
    localStorage.setItem('gh_filename', document.getElementById('gh-filename').value);
    localStorage.setItem('gh_token', document.getElementById('gh-token').value);
}

function renderUserList() {
    const list = document.getElementById('user-list');
    const users = getUserNames();
    list.innerHTML = '';
    users.forEach(u => {
        const isAdmin = isAdminUser(u);
        const isDefault = DEFAULT_USERS[u];
        const div = document.createElement('div');
        div.className = 'transaction';
        div.innerHTML = `
            <div class="t-left">
                <div class="t-desc">${u} ${isAdmin ? '(Admin)' : ''} ${isDefault ? '(Default)' : ''}</div>
            </div>
            <div class="t-right">
                <button onclick="editUser('${u}')" style="padding: 8px 15px; width: auto; font-size: 0.85rem; margin-right: 5px;">Edit</button>
                <button onclick="deleteUser('${u}')" ${isDefault ? 'disabled' : ''} style="padding: 8px 15px; width: auto; font-size: 0.85rem; background: ${isDefault ? '#ccc' : '#dc3545'};">Delete</button>
            </div>
        `;
        list.appendChild(div);
    });
}

function editUser(username) {
    document.getElementById('user-username').value = username;
    document.getElementById('user-password').value = '';
}

function deleteUser(username) {
    if (!confirm('Delete user ' + username + '?')) return;
    const users = getUsers();
    delete users[username];
    setUsers(users);
    const perms = getPerms();
    delete perms[username];
    setPerms(perms);
    renderUserList();
    alert('User deleted!');
}

window.saveUser = function() {
    const username = (document.getElementById('user-username').value || '').trim().toLowerCase();
    const password = document.getElementById('user-password').value;
    if (!username || !password) return alert('Please fill username and password');
    const users = getUsers();
    users[username] = password;
    setUsers(users);
    if (!getPerms()[username]) {
        setPerms({ ...getPerms(), [username]: { read: 1, write: 1, view: 1, delete: 0 } });
    }
    clearUserForm();
    renderUserList();
    alert('User saved!');
}

window.clearUserForm = function() {
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
}

async function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.add('visible');
    const u = getCurrentUser();
    document.getElementById('add-transaction-form').style.display = getPerm(u, 'write') ? 'block' : 'none';
    document.getElementById('main-content').style.display = getPerm(u, 'view') ? 'block' : 'none';
    document.getElementById('no-permission-msg').style.display = getPerm(u, 'view') ? 'none' : 'block';
    
    // Show user select and Users button only for admin
    const sel = document.getElementById('user-select');
    sel.style.display = isAdmin() ? 'block' : 'none';
    document.getElementById('permissions-btn').style.display = isAdmin() ? 'block' : 'none';
    document.getElementById('nav-users').style.display = isAdmin() ? 'block' : 'none';
    
    if (isAdmin()) { 
        sel.innerHTML = getUserNames().map(un => `<option value="${un}" ${un === getTrackUser() ? 'selected' : ''}>${un}</option>`).join(''); 
    } else {
        // Non-admin users see only their own transactions
        setTrackUser(u);
    }
    
    // Load data and then initialize UI
    await loadFromGitHub();
    updateUI();
}
window.switchTrackUser = function() {
    if (!isAdmin()) return;
    setTrackUser(document.getElementById('user-select').value);
    updateUI();
}

const getSetting = (key) => localStorage.getItem(key);
const formatAmount = (n) => parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const formatDate = (dateString) => {
    if(!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};
const setToday = () => {
    const n = new Date();
    document.getElementById('t-date').value = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
};

function togglePermissions() {
    const m = document.getElementById('permissions-modal');
    m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
    if (m.style.display === 'flex') {
        const p = getPerms();
        const html = `<table class="permissions-table"><thead><tr><th>User</th>${PERMS.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${getUserNames().map(u=>`<tr><td>${u}</td>${PERMS.map(perm=>`<td><input type="checkbox" id="perm-${u}-${perm}" ${getPerm(u,perm)?'checked':''}></td>`).join('')}</tr>`).join('')}</tbody></table>`;
        document.getElementById('permissions-grid').innerHTML = html;
    }
}
window.savePermissions = function() {
    const p = {};
    getUserNames().forEach(u => { p[u] = {}; PERMS.forEach(perm => { p[u][perm] = document.getElementById(`perm-${u}-${perm}`)?.checked ? 1 : 0; }); });
    setPerms(p);
    const u = getCurrentUser();
    document.getElementById('add-transaction-form').style.display = getPerm(u, 'write') ? 'block' : 'none';
    const canView = getPerm(u, 'view');
    document.getElementById('main-content').style.display = canView ? 'block' : 'none';
    document.getElementById('no-permission-msg').style.display = canView ? 'none' : 'block';
    togglePermissions();
    updateUI();
}

window.toggleSettings = function() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    if(modal.style.display === 'block') {
        document.getElementById('gh-username').value = getSetting('gh_username') || '';
        document.getElementById('gh-repo').value = getSetting('gh_repo') || '';
        document.getElementById('gh-filename').value = getSetting('gh_filename') || 'data.json';
        document.getElementById('gh-token').value = getSetting('gh_token') || '';
    }
}

window.saveSettings = function() {
    localStorage.setItem('gh_username', document.getElementById('gh-username').value);
    localStorage.setItem('gh_repo', document.getElementById('gh-repo').value);
    localStorage.setItem('gh_filename', document.getElementById('gh-filename').value);
    localStorage.setItem('gh_token', document.getElementById('gh-token').value);
    
    toggleSettings();
    loadFromGitHub();
}


// Connection status management
function updateConnectionStatus(status, text) {
    const statusEl = document.getElementById('connection-status');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');
    
    // Remove existing status classes
    dotEl.classList.remove('connected', 'syncing');
    
    if (status === 'connected') {
        dotEl.classList.add('connected');
        textEl.innerText = 'Connected';
    } else if (status === 'syncing') {
        dotEl.classList.add('syncing');
        textEl.innerText = 'Syncing...';
    } else {
        textEl.innerText = 'Disconnected';
    }
}

// Make loadFromGitHub globally accessible for HTML buttons
window.loadFromGitHub = loadFromGitHub;
window.addTransaction = addTransaction;
window.removeTransaction = removeTransaction;


function checkConnection() {
    // Check if GitHub credentials are configured
    const hasCredentials = getSetting('gh_username') && getSetting('gh_repo') && getSetting('gh_token');
    
    if (!hasCredentials) {
        updateConnectionStatus('disconnected');
        return false;
    }
    
    // Test connection by trying to fetch repository info
    const username = getSetting('gh_username');
    const repo = getSetting('gh_repo');
    const token = getSetting('gh_token');
    
    fetch(`https://api.github.com/repos/${username}/${repo}`, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    })
    .then(response => {
        if (response.ok) {
            updateConnectionStatus('connected');
            return true;
        } else {
            updateConnectionStatus('disconnected');
            return false;
        }
    })
    .catch(error => {
        console.error('Connection check failed:', error);
        updateConnectionStatus('disconnected');
        return false;
    });
}

// Migration function to add status field to existing transactions
function migrateTransactions() {
    let needsMigration = false;
    transactions.forEach(t => {
        if (!t.status) {
            t.status = 'active';
            needsMigration = true;
        }
    });
    
    if (needsMigration) {
        // Save the migrated data back to GitHub
        githubData.save(transactions).then(success => {
            if (success) {
                console.log('Transaction migration completed: added status field to existing transactions');
            } else {
                console.warn('Transaction migration failed: could not save updated transactions');
            }
        }).catch(error => {
            console.error('Transaction migration error:', error);
        });
    }
}

async function loadFromGitHub() {
    if (!getPerm(getCurrentUser(), 'read')) { return; }
    
    updateConnectionStatus('syncing');
    
    try {
        transactions = await githubData.load();
        // Ensure all transactions have a user field
        transactions.forEach(t => { 
            if (!t.user) t.user = 'renu'; 
        });
        
        // Migrate existing transactions to add status field
        migrateTransactions();
        
        updateConnectionStatus('connected');
        // Only update UI after data is successfully loaded
        updateUI();
    } catch (error) {
        console.error('Error loading data:', error);
        // Don't immediately set to disconnected - check if it's a connection issue
        const hasCredentials = getSetting('gh_username') && getSetting('gh_repo') && getSetting('gh_token');
        
        if (hasCredentials) {
            // If credentials are set but still failed, it's likely a connection issue
            updateConnectionStatus('disconnected');
        } else {
            // If no credentials, it's expected behavior - keep as connected for local mode
            updateConnectionStatus('connected');
        }
        
        // Still update UI with whatever data we have (could be empty array)
        updateUI();
    }
}

async function saveToGitHub() {
    const addBtn = document.getElementById('add-btn');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = 'Saving...'; }
    
    try {
        const success = await githubData.save(transactions);
        if (success) {
            // Save successful - connection status already updated by loadFromGitHub
        } else {
            // Failed to save - connection status already updated by loadFromGitHub
        }
    } catch (error) {
        console.error('Error saving data:', error);
        // Error occurred - connection status already updated by loadFromGitHub
    }
    
    if (addBtn) { addBtn.disabled = false; addBtn.innerText = 'Add Transaction'; }
}


function updateUI() {
    const trackUser = getTrackUser();
    // Filter transactions by user and exclude cancelled ones from main view
    const filtered = transactions.filter(t => (t.user || 'renu') === trackUser && (t.status || 'active') !== 'cancelled');
    document.getElementById('history-list').innerHTML = '';
    let asset = 0, inc = 0, exp = 0;
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    const canDelete = getPerm(getCurrentUser(), 'delete');
    filtered.forEach((t, i) => {
        const amt = parseFloat(t.amount);
        if(t.type === 'asset') asset += amt; else if(t.type === 'income') inc += amt; else exp += amt;
        const typeClass = t.type === 'asset' ? 'asset' : (t.type === 'income' ? 'inc' : 'exp');
        const sign = (t.type === 'asset' || t.type === 'income') ? '+' : '-';
        const globalIdx = transactions.findIndex(x => x.id === t.id);
        const delBtn = canDelete ? `<span class="del-btn" onclick="removeTransaction(${globalIdx})">&times;</span>` : '';
        const item = document.createElement('div');
        item.className = 'transaction';
        item.innerHTML = `<div class="t-left"><div class="t-desc">${t.desc || '—'}</div><div class="t-meta"><span>${t.date ? formatDate(t.date) : 'No Date'}</span><span class="t-tag">${t.category || 'Uncategorized'}</span></div></div><div class="t-right"><span class="t-amount ${typeClass}">${sign}${formatAmount(amt)} AED</span>${delBtn}</div>`;
        document.getElementById('history-list').appendChild(item);
    });
    document.getElementById('total-asset').innerText = `${formatAmount(asset)} AED`;
    document.getElementById('total-inc').innerText = `${formatAmount(inc)} AED`;
    document.getElementById('total-exp').innerText = `${formatAmount(exp)} AED`;
    const balance = inc - exp;
    document.getElementById('total-balance').innerText = balance < 0 ? `-${formatAmount(Math.abs(balance))} AED` : `${formatAmount(balance)} AED`;
    document.getElementById('balance-card').classList.toggle('negative', balance < 0);
    const categoryTotals = {};
    filtered.forEach(t => {
        const cat = (t.category || '').trim() || 'Uncategorized';
        const amt = parseFloat(t.amount);
        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += (t.type === 'asset' || t.type === 'income') ? amt : -amt;
    });
    const cl = document.getElementById('category-list');
    cl.innerHTML = '';
    Object.entries(categoryTotals).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).forEach(([cat, total]) => {
        const it = document.createElement('div');
        it.className = 'category-item';
        const isPos = total >= 0;
        it.innerHTML = `<span>${cat}</span><span class="cat-amount ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : '-'}${formatAmount(Math.abs(total))} AED</span>`;
        cl.appendChild(it);
    });

    // By Month
    const monthTotals = {};
    filtered.forEach(t => {
        const month = t.date ? t.date.substring(0, 7) : 'Unknown';
        const amt = parseFloat(t.amount);
        if (!monthTotals[month]) monthTotals[month] = 0;
        monthTotals[month] += (t.type === 'asset' || t.type === 'income') ? amt : -amt;
    });
    const ml = document.getElementById('month-list');
    ml.innerHTML = '';
    Object.entries(monthTotals).sort((a, b) => b[0].localeCompare(a[0])).forEach(([month, total]) => {
        const it = document.createElement('div');
        it.className = 'month-card';
        const isPos = total >= 0;
        const [y, m] = month.split('-');
        const monthName = new Date(y, m - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        it.innerHTML = `<h3>${monthName}</h3><p class="${isPos ? '' : ''}" style="color: ${isPos ? '#28a745' : '#dc3545'}">${isPos ? '+' : '-'}${formatAmount(Math.abs(total))} AED</p>`;
        ml.appendChild(it);
    });
}

function removeTransaction(idx) {
    if (!getPerm(getCurrentUser(), 'delete')) return;
    if (confirm('Mark this transaction as cancelled?')) {
        const transactionId = transactions[idx].id;
        
        // Mark transaction as cancelled instead of deleting it
        transactions[idx].status = 'cancelled';
        
        // Update the transaction in GitHub
        githubData.update(transactionId, { status: 'cancelled' }).then(success => {
            if (success) {
                updateUI();
                console.log('Transaction marked as cancelled successfully');
            } else {
                alert('Failed to mark transaction as cancelled. Please try again.');
                // Revert the status change if GitHub update failed
                transactions[idx].status = 'active';
            }
        }).catch(error => {
            console.error('Error marking transaction as cancelled:', error);
            alert('Failed to mark transaction as cancelled. Please check your connection and try again.');
            // Revert the status change if GitHub update failed
            transactions[idx].status = 'active';
        });
    }
}



function addTransaction() {
    if (!getPerm(getCurrentUser(), 'write')) return;
    
    const date = document.getElementById('t-date').value;
    const type = document.getElementById('type').value;
    const desc = document.getElementById('desc').value;
    const category = document.getElementById('category').value;
    const amount = document.getElementById('amount').value;
    
    // Validate required fields
    if(!amount || !date) {
        alert('Please fill date and amount');
        return;
    }
    
    // Validate amount is a valid number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        alert('Please enter a valid positive amount');
        return;
    }
    
    // Create transaction object
    const newTransaction = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        date: date,
        type: type,
        desc: desc || '',
        category: category || 'Uncategorized',
        amount: amount,
        user: getTrackUser(),
        status: 'active'
    };
    
    // Add to local transactions array first
    transactions.push(newTransaction);
    
    // Update UI immediately to provide user feedback
    updateUI();
    
    // Attempt to save to GitHub
    githubData.add(newTransaction).then(success => {
        if (success) {
            // GitHub save successful - clear form fields
            document.getElementById('desc').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('category').value = '';
            setToday();
            
            console.log('Transaction added successfully to both GitHub and local storage');
        } else {
            // GitHub save failed - show warning but keep transaction in local array
            alert('Transaction added locally but failed to sync with GitHub. Please check your connection and try again.');
            console.warn('GitHub save failed, transaction kept locally');
            
            // Clear form fields even on GitHub failure to allow user to add another transaction
            document.getElementById('desc').value = '';
            document.getElementById('amount').value = '';
            document.getElementById('category').value = '';
            setToday();
        }
    }).catch(error => {
        console.error('Error saving transaction to GitHub:', error);
        
        // GitHub save failed - show warning but keep transaction in local array
        alert('Transaction added locally but failed to sync with GitHub. Please check your connection and try again.');
        
        // Clear form fields even on GitHub failure to allow user to add another transaction
        document.getElementById('desc').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('category').value = '';
        setToday();
    });
}

// All Data Page Functions
async function loadAllData() {
    if (!getPerm(getCurrentUser(), 'read')) { 
        document.getElementById('all-data-list').innerHTML = '<p style="text-align:center; color:#999;">No permission to view data</p>';
        return; 
    }
    
    document.getElementById('all-data-list').innerHTML = '<p style="text-align:center; color:#666;">Loading...</p>';
    
    try {
        // Load all data from GitHub data.json
        const allData = await githubData.load();
        document.getElementById('data-count').innerText = `Total records: ${allData.length}`;
        
        if (allData.length === 0) {
            document.getElementById('all-data-list').innerHTML = '<p style="text-align:center; color:#999;">No data found in data.json</p>';
            return;
        }
        
        // Create table HTML
        const tableHtml = createDataTable(allData);
        document.getElementById('all-data-list').innerHTML = tableHtml;
        
    } catch (error) {
        console.error('Error loading all data:', error);
        document.getElementById('all-data-list').innerHTML = `<p style="text-align:center; color:#dc3545;">Error: ${error.message}</p>`;
    }
}

function createDataTable(data) {
    const headers = ['ID', 'Date', 'Type', 'Description', 'Category', 'Amount', 'User', 'Created At', 'Actions'];
    
    let html = `
        <div style="overflow-x: auto; max-height: 60vh; overflow-y: auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        ${headers.map(header => `<th>${header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.forEach((row, index) => {
        const typeClass = row.type === 'asset' ? 'asset' : (row.type === 'income' ? 'inc' : 'exp');
        const sign = (row.type === 'asset' || row.type === 'income') ? '+' : '-';
        const formattedAmount = formatAmount(parseFloat(row.amount || 0));
        
        html += `
                    <tr class="data-row" onclick="highlightRow(this)">
                        <td>${row.id || 'N/A'}</td>
                        <td>${row.date ? formatDate(row.date) : 'No Date'}</td>
                        <td><span style="font-weight: bold; color: ${getTypeColor(row.type)}">${row.type || 'N/A'}</span></td>
                        <td>${row.desc || '—'}</td>
                        <td><span style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem;">${row.category || 'Uncategorized'}</span></td>
                        <td class="${typeClass}">${sign}${formattedAmount} AED</td>
                        <td><strong>${row.user || 'Unknown'}</strong></td>
                        <td>${row.createdAt ? new Date(row.createdAt).toLocaleString() : 'N/A'}</td>
                        <td class="data-actions">
                            <button class="btn-edit" onclick="event.stopPropagation(); editRow('${row.id}')" title="Edit">Edit</button>
                            <button class="btn-delete" onclick="event.stopPropagation(); deleteRow('${row.id}')" title="Delete">Delete</button>
                        </td>
                    </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    return html;
}

function getTypeColor(type) {
    switch(type) {
        case 'asset': return '#d4a017';
        case 'income': return '#28a745';
        case 'expense': return '#dc3545';
        default: return '#666';
    }
}

function highlightRow(row) {
    // Remove previous highlights
    document.querySelectorAll('.data-row').forEach(r => r.style.backgroundColor = '');
    // Highlight selected row
    row.style.backgroundColor = '#e9ecef';
}

function editRow(id) {
    alert(`Edit functionality for record ${id} would be implemented here.\n\nIn a full implementation, this would open an edit form.`);
}

async function deleteRow(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    
    try {
        // Delete from GitHub data.json
        const success = await githubData.delete(id);
        
        if (success) {
            alert('Record deleted successfully');
            loadAllData(); // Refresh the data
        } else {
            alert('Failed to delete record');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        alert('Error deleting record: ' + error.message);
    }
}

function exportData() {
    if (!getPerm(getCurrentUser(), 'read')) { 
        alert('No permission to export data');
        return; 
    }
    
    // Get all data
    loadAllData().then(() => {
        // Wait a moment for data to load, then export
        setTimeout(() => {
            const table = document.querySelector('.data-table');
            if (!table) {
                alert('No data to export');
                return;
            }
            
            // Convert table to CSV
            let csv = [];
            const rows = table.querySelectorAll('tr');
            
            for (let i = 0; i < rows.length; i++) {
                let row = [], cols = rows[i].querySelectorAll('td, th');
                
                for (let j = 0; j < cols.length - 1; j++) { // -1 to exclude Actions column
                    const cellText = cols[j].innerText.replace(/,/g, ''); // Remove commas to avoid CSV issues
                    row.push(`"${cellText}"`);
                }
                
                csv.push(row.join(','));
            }
            
            // Create download link
            const csvContent = csv.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `wallet-app-data-${new Date().toISOString().slice(0,10)}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert('Data exported successfully');
        }, 500);
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            doLogin();
        });
    }
    
    // Add event listener for PIN input to enable auto-login
    const pinInput = document.getElementById('login-pin');
    if (pinInput) {
        pinInput.addEventListener('input', function(e) {
            doPinLogin();
        });
    }
    
    // Add event listeners for login mode buttons as backup to inline onclick
    const pinModeBtn = document.getElementById('pin-mode-btn');
    const passwordModeBtn = document.getElementById('password-mode-btn');
    
    if (pinModeBtn) {
        pinModeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            switchLoginMode('pin');
        });
    }
    
    if (passwordModeBtn) {
        passwordModeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            switchLoginMode('password');
        });
    }
    
    // Add event listeners for quick login buttons as backup to inline onclick
    const safarBtn = document.querySelector('button[onclick*="quickLogin(\'safar\')"]');
    const renuBtn = document.querySelector('button[onclick*="quickLogin(\'renu\')"]');
    
    if (safarBtn) {
        safarBtn.addEventListener('click', function(e) {
            e.preventDefault();
            quickLogin('safar');
        });
    }
    
    if (renuBtn) {
        renuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            quickLogin('renu');
        });
    }
    
    if (getCurrentUser()) {
        showApp();
        // Check connection status after app loads
        setTimeout(checkConnection, 1000);
    } else {
        // Show login screen by default
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.remove('visible');
        // Check connection status even on login screen
        setTimeout(checkConnection, 1000);
    }
    setToday();
});
