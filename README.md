# Wallet App - Supabase Integration

This wallet application has been updated to support Supabase as a database backend while maintaining backward compatibility with GitHub sync.

## Features

- **Dual Database Support**: Can use either Supabase or GitHub for data storage
- **User Management**: Multiple users with different permission levels
- **Transaction Tracking**: Income, expense, and asset tracking
- **Category Analysis**: View spending by category and month
- **Real-time Sync**: Automatic synchronization with configured database

## Setup Instructions

### 1. Supabase Setup

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com) and create a new project
   - Wait for the project to be ready (may take a few minutes)

2. **Create the Database Table**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the following SQL to create the wallet-app table:

```sql
CREATE TABLE IF NOT EXISTS "wallet-app" (
    id BIGINT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE,
    type VARCHAR(20),
    desc TEXT,
    category VARCHAR(100),
    amount DECIMAL(10,2),
    user VARCHAR(50)
);
```

3. **Get Your Credentials**:
   - Go to Settings → API in your Supabase dashboard
   - Copy your Project URL and anon public key

### 2. Application Configuration

1. **Update Supabase Configuration**:
   - Open `supabase-config.js`
   - Replace `YOUR_SUPABASE_PROJECT_URL` with your actual project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon public key

2. **Configure in App**:
   - Open the app and go to Settings (⚙ button)
   - Go to GitHub & Users page
   - Enter your Supabase URL and Anon Key in the Supabase Setup section
   - Click "Save Supabase Settings"

### 3. Data Migration

To migrate your existing data from `data.json` to Supabase:

1. **Manual Import**:
   - Go to Supabase dashboard
   - Navigate to Table Editor
   - Select the "wallet-app" table
   - Click "Import" and upload your `data.json` file
   - Map the fields appropriately

2. **Field Mapping**:
   - `id` → id
   - `createdAt` → created_at
   - `date` → date
   - `type` → type
   - `desc` → desc
   - `category` → category
   - `amount` → amount
   - `user` → user

### 4. Usage

1. **Login**: Use default users (safar/safar1997, renu/renu) or create your own
2. **Add Transactions**: Use the dashboard to add income, expenses, or assets
3. **View Reports**: Check category and monthly breakdowns
4. **User Management**: Admin users can manage other users and permissions

## Database Priority

The app follows this priority order:
1. **Supabase** (if configured) - Primary database
2. **GitHub** (if configured) - Fallback database
3. **Local Storage** - Temporary storage only

## File Structure

- `index.html` - Main application interface
- `app.js` - Application logic with Supabase integration
- `styles.css` - Styling
- `supabase-config.js` - Supabase configuration and client setup
- `data.json` - Original data file (can be removed after migration)

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your Supabase project has the correct URL in the allowed origins
2. **Permission Errors**: Check that your anon key has the necessary permissions
3. **Table Not Found**: Verify the table name is exactly "wallet-app" (case-sensitive)

### Debug Mode

Open browser developer tools to see:
- Database connection status
- Error messages
- Sync operations

## Security Notes

- The anon key is public and should only have read/write permissions to the wallet-app table
- For production, consider using Row Level Security (RLS) policies
- Regularly rotate your API keys

## Backward Compatibility

The app maintains full backward compatibility with GitHub sync. If Supabase is not configured, it will automatically fall back to GitHub storage.

## Support

For issues related to:
- **Supabase Setup**: Check [Supabase Documentation](https://supabase.com/docs)
- **App Functionality**: Review the original GitHub sync instructions
- **Data Migration**: Ensure proper field mapping during import