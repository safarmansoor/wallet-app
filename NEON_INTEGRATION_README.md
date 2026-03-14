# Neon Database Integration for Wallet App

This document explains how to connect your wallet app to a real Neon database and migrate your existing data.

## Overview

Your wallet app now supports connecting to a real Neon PostgreSQL database instead of using mock data from `data.json`. The integration includes:

- **Real PostgreSQL database connection** via Neon
- **Data migration** from `data.json` to Neon database
- **Fallback mechanisms** to localStorage when Neon is unavailable
- **Complete CRUD operations** (Create, Read, Update, Delete)
- **User-specific data isolation** (safar/renu users)
- **Error handling** and status reporting

## Prerequisites

1. **Neon Database Account**: You need a Neon PostgreSQL database account
2. **Database URL**: Your Neon database connection string
3. **API Key**: Your Neon API key for authentication

## Setup Instructions

### 1. Get Your Neon Database Credentials

1. Log in to your Neon dashboard
2. Create a new project or select an existing one
3. Note down your connection string (should look like: `postgresql://user:password@ep-xyz.us-east-1.aws.neon.tech/dbname`)
4. Generate an API key from your Neon dashboard settings

### 2. Configure Database Settings

1. Open your wallet app in a browser
2. Log in as admin (safar user)
3. Click the ⚙ (Settings) button
4. In the Settings modal, you'll see a "Data Migration" section
5. Enter your Neon Database URL and API Key
6. Click "Save Neon Settings"

### 3. Set Up Database Table

Your Neon database needs the `wallet-app` table. You can:

**Option A: Use the provided SQL script**
- Run the SQL from `neon-database-setup.sql` in your Neon SQL editor

**Option B: Let the app create it automatically**
- The app will attempt to create the table structure when you first connect

### 4. Migrate Your Existing Data

1. In the Settings modal, click "Migrate Data to Neon"
2. Confirm the migration when prompted
3. The app will:
   - Load all data from your `data.json` file
   - Insert each transaction into your Neon database
   - Report success/failure counts
   - Reload the data from Neon

## Database Schema

The `wallet-app` table uses this structure:

```sql
CREATE TABLE "wallet-app" (
    id BIGINT PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE,
    type VARCHAR(20) CHECK (type IN ('asset', 'income', 'expense')),
    "desc" TEXT,
    category VARCHAR(100),
    amount DECIMAL(10,2),
    user VARCHAR(50) DEFAULT 'renu'
);
```

## How It Works

### Database Connection

The app uses a secure API wrapper approach:
- Your Neon credentials are stored in localStorage
- Database operations are performed via HTTP requests to `/api/*` endpoints
- The app includes fallback to localStorage if Neon is unavailable

### Data Flow

1. **Loading Data**: App connects to Neon → queries all transactions → displays in UI
2. **Adding Transactions**: New transaction → saved to both app state and Neon database
3. **Deleting Transactions**: Transaction removed from UI → deleted from Neon database
4. **User Isolation**: Each user (safar/renu) sees only their own transactions

### Fallback Mechanism

If Neon database is unavailable:
- App automatically falls back to localStorage storage
- All functionality continues to work normally
- Status bar shows connection status
- You can still export data and use all features

## Migration Process

### Migrate from data.json to Neon

1. **Prerequisites**: Neon database configured and table created
2. **Process**:
   - App loads all data from `data.json`
   - Each transaction is inserted into Neon database
   - Conflicts are handled with `ON CONFLICT DO UPDATE`
   - Progress is shown in status bar
   - Final count of successful/failed migrations is displayed

### Backup from Neon to localStorage

1. **Purpose**: Create a backup of your Neon data in browser localStorage
2. **Process**:
   - App queries all data from Neon database
   - Data is saved to localStorage as fallback
   - Useful for offline access or data recovery

## Troubleshooting

### Common Issues

**"Neon database not configured"**
- Check that you've entered both URL and API key in Settings
- Verify your Neon credentials are correct

**"Failed to connect to Neon database"**
- Check your internet connection
- Verify your Neon database is running
- Check that your API key has proper permissions

**Migration fails partway through**
- Check your Neon database connection
- Verify the `wallet-app` table exists
- Check browser console for specific error messages

**Data not appearing after migration**
- Refresh the page after migration completes
- Check that you're logged in as the correct user
- Verify data exists in your Neon database

### Error Messages

The app provides detailed error messages in the status bar and browser console:
- Connection errors
- Query failures
- Migration issues
- Permission problems

## Security Notes

- Your Neon credentials are stored only in your browser's localStorage
- Database connections use HTTPS for security
- No credentials are sent to external servers
- User data is isolated by the `user` field in the database

## Performance

- The app loads all transactions at startup for responsive UI
- Database queries are optimized with proper indexes
- Large datasets are handled efficiently
- Status updates provide feedback during long operations

## Next Steps

After successful migration:

1. **Test the app**: Add, edit, and delete transactions to ensure everything works
2. **Verify data**: Check that all your historical data is present
3. **Monitor performance**: The app should load quickly and respond smoothly
4. **Backup regularly**: Use the backup feature to maintain localStorage copies

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Neon database connection
3. Ensure the `wallet-app` table exists with correct schema
4. Try the fallback localStorage mode to isolate the issue

The app is designed to be robust and should continue working even if Neon database is temporarily unavailable.