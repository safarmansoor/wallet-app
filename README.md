# Wallet App with Neon Database Integration

A modern wallet application with Neon database backend integration for managing financial transactions.

## Features

- **User Authentication**: Secure login system with user management
- **Transaction Management**: Add, view, edit, and delete transactions
- **Multi-User Support**: Admin and regular user roles with permissions
- **Data Visualization**: Category and monthly breakdowns
- **Neon Database**: PostgreSQL database with SSL connections
- **Backend API**: Express.js server with PostgreSQL integration

## Project Structure

```
wallet-app/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling
├── app.js             # Frontend JavaScript (Neon integration)
├── server.js          # Backend API server
├── package.json       # Backend dependencies
├── neon-database-setup.sql  # Database schema
└── README.md          # This file
```

## Installation

### Backend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend server:**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

3. **Server will run on:** `http://localhost:3001`

### Frontend Setup

The frontend is a static HTML/CSS/JS application that runs in the browser.

1. **Open `index.html`** in your browser
2. **Configure Neon Database** in Settings:
   - Enter your Neon database URL
   - Enter your Neon database API key
   - Save settings

## Database Schema

The application uses the following table structure:

```sql
CREATE TABLE "wallet-app" (
    id BIGINT PRIMARY KEY,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL,
    desc TEXT,
    category VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    user VARCHAR(50) NOT NULL
);
```

## API Endpoints

### Backend API (`/api/database`)

**POST** `/api/database` - Handle database operations

**Request Body:**
```json
{
    "url": "postgresql://user:password@host:port/database",
    "key": "your-api-key",
    "operation": "select|upsert|delete",
    "table": "wallet-app",
    "fields": "*", // for select
    "order": "date", // for select
    "data": {}, // for upsert
    "field": "id", // for delete
    "value": 123 // for delete
}
```

**Response:**
```json
{
    "data": [...],
    "error": null
}
```

### Health Check

**GET** `/api/health` - Check server status

## Usage

1. **Login**: Use default users:
   - Admin: `safar` / `safar1997`
   - User: `renu` / `renu`

2. **Add Transactions**: Click "Add Transaction" and fill in the details

3. **View Data**: See transactions in the dashboard with:
   - Recent activity
   - Category breakdown
   - Monthly summary
   - Asset, income, and expense totals

4. **Admin Features**:
   - User management (add/edit/delete users)
   - Permission settings
   - View all data
   - Export data to CSV

## Neon Database Setup

1. **Create Neon Project**: Go to [Neon.tech](https://neon.tech) and create a project
2. **Get Connection String**: Copy the PostgreSQL connection string
3. **Configure**: Enter the connection string in the app settings
4. **Run Schema**: Execute the SQL from `neon-database-setup.sql`

## Security Features

- **CORS enabled** for frontend requests
- **SSL connections** to Neon database
- **Input validation** and error handling
- **Connection pooling** for performance
- **Secure credential handling**

## Development

### Backend Development

```bash
# Install development dependencies
npm install

# Start development server with auto-restart
npm run dev

# Start production server
npm start
```

### Frontend Development

The frontend uses vanilla JavaScript with no build tools required.

### Database Development

```bash
# Connect to Neon database
psql "your-connection-string"

# Run schema setup
\i neon-database-setup.sql
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure frontend is served from a web server (not file://)
2. **Database Connection**: Verify Neon credentials and SSL settings
3. **Port Conflicts**: Change port in `server.js` if needed

### Logs

- Backend logs show database queries and connection status
- Frontend console shows API requests and responses

## Dependencies

### Backend
- `express`: Web framework
- `pg`: PostgreSQL client
- `cors`: Cross-origin resource sharing
- `nodemon`: Development auto-restart

### Frontend
- Vanilla JavaScript (no frameworks)
- Browser localStorage for settings
- Fetch API for HTTP requests

## License

MIT License - see LICENSE file for details.