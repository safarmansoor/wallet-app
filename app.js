

// Import Supabase configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Get Supabase credentials from localStorage or use defaults
const getSupabaseUrl = () => localStorage.getItem('supabase_url') || 'https://vbifyocsjuljqowptysp.supabase.co';
const getSupabaseKey = () => localStorage.getItem('supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiaWZ5b2NzanVsanFvd3B0eXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQ0OTQsImV4cCI6MjA4ODgzMDQ5NH0.ZDYp0Iumr7BOAOF_w4SBaIy0r3JNXBU7hh9DgNbHgmg'

// Initialize Supabase client (only if credentials are available)
let supabase = null;

function initializeSupabase() {
    const url = getSupabaseUrl();
    const key = getSupabaseKey();
    
    if (url && key && url.startsWith('http')) {
        try {
            supabase = createClient(url, key);
            console.log('Supabase initialized successfully');
            return true;
        } catch (error) {
            console.error('Supabase initialization error:', error);
            return false;
        }
    }
    return false;
}

let transactions = [];
let fileSha = null;

// Default users
const DEFAULT_USERS = { safar: 'safar1997', renu: 'renu' };
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
window.quickLogin = function(username) {
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

function doLogin() {
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
    showApp();
    loadFromGitHub(); // Sync data on login
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
    toggleSettings();
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

function showApp() {
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
    
    // Initialize UI with current data
    updateUI();
}
function switchTrackUser() {
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
        
        // Load Supabase settings
        document.getElementById('supabase-url').value = getSetting('supabase_url') || '';
        document.getElementById('supabase-key').value = getSetting('supabase_key') || '';
    }
}

window.saveSettings = function() {
    localStorage.setItem('gh_username', document.getElementById('gh-username').value);
    localStorage.setItem('gh_repo', document.getElementById('gh-repo').value);
    localStorage.setItem('gh_filename', document.getElementById('gh-filename').value);
    localStorage.setItem('gh_token', document.getElementById('gh-token').value);
    
    // Save Supabase settings
    localStorage.setItem('supabase_url', document.getElementById('supabase-url').value);
    localStorage.setItem('supabase_key', document.getElementById('supabase-key').value);
    
    toggleSettings();
    loadFromGitHub();
}

function showStatus(msg) { document.getElementById('status-bar').innerText = msg; }

async function loadFromGitHub() {
    if (!getPerm(getCurrentUser(), 'read')) { showStatus('No read permission'); return; }
    
    // Always use Supabase since it's configured in the code
    await loadFromSupabase();
}

async function loadFromSupabase() {
    try {
        // Initialize Supabase if not already done
        if (!supabase) {
            const initialized = initializeSupabase();
            if (!initialized) {
                showStatus('Supabase not configured');
                return;
            }
        }
        
        showStatus('Loading from Supabase...');
        const { data, error } = await supabase
            .from('wallet-app')
            .select('*')
            .order('date', { ascending: false });
        
        if (error) {
            console.error('Supabase error:', error);
            showStatus('Supabase connection failed: ' + error.message);
            return;
        }
        
        transactions = data || [];
        transactions.forEach(t => { if (!t.user) t.user = 'renu'; });
        showStatus('Loaded from Supabase');
        updateUI();
    } catch (error) {
        console.error('Supabase error:', error);
        showStatus('Supabase connection failed: ' + error.message);
    }
}

async function saveToGitHub() {
    showStatus('Saving...');
    const addBtn = document.getElementById('add-btn');
    if (addBtn) { addBtn.disabled = true; addBtn.innerText = 'Saving...'; }
    
    // Always use Supabase since it's configured in the code
    await saveToSupabase();
    
    if (addBtn) { addBtn.disabled = false; addBtn.innerText = 'Add Transaction'; }
}

async function saveToSupabase() {
    try {
        // Initialize Supabase if not already done
        if (!supabase) {
            const initialized = initializeSupabase();
            if (!initialized) {
                showStatus('Supabase not configured');
                return;
            }
        }
        
        showStatus('Saving to Supabase...');
        const latestTransaction = transactions[transactions.length - 1];
        
        const { data, error } = await supabase
            .from('wallet-app')
            .upsert(latestTransaction, { onConflict: 'id' });
        
        if (error) {
            console.error('Supabase save error:', error);
            showStatus('Supabase save failed: ' + error.message);
            return;
        }
        
        showStatus('Saved to Supabase');
    } catch (error) {
        console.error('Supabase save error:', error);
        showStatus('Supabase save failed: ' + error.message);
    }
}

function updateUI() {
    const trackUser = getTrackUser();
    const filtered = transactions.filter(t => (t.user || 'renu') === trackUser);
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
    if (confirm('Delete this transaction?')) {
        const transactionId = transactions[idx].id;
        transactions.splice(idx, 1);
        updateUI();
        
        // Always use Supabase since it's configured in the code
        deleteFromSupabase(transactionId);
    }
}

async function deleteFromSupabase(transactionId) {
    try {
        // Initialize Supabase if not already done
        if (!supabase) {
            const initialized = initializeSupabase();
            if (!initialized) {
                showStatus('Supabase not configured');
                return;
            }
        }
        
        showStatus('Deleting from Supabase...');
        const { error } = await supabase
            .from('wallet-app')
            .delete()
            .eq('id', transactionId);
        
        if (error) {
            console.error('Supabase delete error:', error);
            showStatus('Supabase delete failed: ' + error.message);
            return;
        }
        
        showStatus('Deleted from Supabase');
    } catch (error) {
        console.error('Supabase delete error:', error);
        showStatus('Supabase delete failed: ' + error.message);
    }
}

function addTransaction() {
    if (!getPerm(getCurrentUser(), 'write')) return;
    const date = document.getElementById('t-date').value, type = document.getElementById('type').value;
    const desc = document.getElementById('desc').value, category = document.getElementById('category').value, amount = document.getElementById('amount').value;
    if(!amount || !date) return alert('Please fill date and amount');
    transactions.push({ id: Date.now(), createdAt: new Date().toISOString(), date, type, desc: desc || '', category, amount, user: getTrackUser() });
    updateUI();
    saveToGitHub();
    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
    setToday();
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
    
    if (getCurrentUser()) {
        showApp();
    } else {
        // Show login screen by default
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app').classList.remove('visible');
    }
    setToday();
});
