// Neon Database Configuration Setup Script
// This script automatically configures your Neon database settings

function setupNeonConfiguration() {
    // Your Neon database connection URL
    const neonUrl = 'postgresql://neondb_owner:npg_Lu4vzeYQMxI1@ep-frosty-art-amxbq30z-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    
    // Save to localStorage
    localStorage.setItem('neon_url', neonUrl);
    localStorage.setItem('neon_key', ''); // You can add your API key here if needed
    
    console.log('Neon database configuration saved!');
    console.log('URL:', neonUrl);
    
    return {
        url: neonUrl,
        key: ''
    };
}

// Auto-setup when script loads
const config = setupNeonConfiguration();

// Display confirmation
console.log('✅ Neon database configuration complete!');
console.log('You can now use the wallet app with direct Neon database connection.');
console.log('No more 405 errors!');

// Optional: Show a success message
if (typeof document !== 'undefined') {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        font-family: Arial, sans-serif;
    `;
    message.innerHTML = `
        <strong>✅ Neon Database Configured!</strong><br>
        Your wallet app is now configured with direct Neon database connection.<br>
        <small>Connection URL: ${config.url.substring(0, 50)}...</small>
    `;
    document.body.appendChild(message);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        message.style.transition = 'opacity 0.5s';
        message.style.opacity = '0';
        setTimeout(() => message.remove(), 500);
    }, 5000);
}