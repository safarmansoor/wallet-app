const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());

// Database connection pool
let dbPool = null;

// Initialize database connection
function initializeDatabase(url) {
    if (dbPool) {
        dbPool.end();
    }
    
    dbPool = new Pool({
        connectionString: url,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    return dbPool;
}

// API endpoint to handle database operations
app.post('/api/database', async (req, res) => {
    const { url, key, operation, table, fields, order, orderOptions, data, options, field, value } = req.body;
    
    // Validate required parameters
    if (!url || !key || !operation || !table) {
        return res.status(400).json({
            data: [],
            error: 'Missing required parameters: url, key, operation, or table'
        });
    }
    
    try {
        // Initialize database connection
        const pool = initializeDatabase(url);
        
        let result;
        
        switch (operation) {
            case 'select':
                // Build SELECT query
                const selectFields = fields || '*';
                const orderClause = order ? `ORDER BY ${order} ${orderOptions?.ascending === false ? 'DESC' : 'ASC'}` : '';
                
                const selectQuery = `SELECT ${selectFields} FROM ${table} ${orderClause}`;
                console.log('Executing SELECT query:', selectQuery);
                
                result = await pool.query(selectQuery);
                break;
                
            case 'upsert':
                if (!data) {
                    throw new Error('Data is required for upsert operation');
                }
                
                // Build UPSERT query
                const columns = Object.keys(data).join(', ');
                const values = Object.values(data);
                const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
                const conflictFields = options?.onConflict || 'id';
                
                const upsertQuery = `
                    INSERT INTO ${table} (${columns}) 
                    VALUES (${placeholders}) 
                    ON CONFLICT (${conflictFields}) 
                    DO UPDATE SET ${Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ')}
                `;
                
                console.log('Executing UPSERT query:', upsertQuery);
                console.log('With values:', values);
                
                result = await pool.query(upsertQuery, values);
                break;
                
            case 'delete':
                if (!field || !value) {
                    throw new Error('Field and value are required for delete operation');
                }
                
                // Build DELETE query
                const deleteQuery = `DELETE FROM ${table} WHERE ${field} = $1`;
                console.log('Executing DELETE query:', deleteQuery);
                console.log('With value:', value);
                
                result = await pool.query(deleteQuery, [value]);
                break;
                
            default:
                throw new Error(`Unsupported operation: ${operation}`);
        }
        
        // Close the connection
        await pool.end();
        
        res.json({
            data: result.rows || [],
            error: null
        });
        
    } catch (error) {
        console.error('Database operation error:', error);
        
        // Close the connection on error
        if (dbPool) {
            try {
                await dbPool.end();
            } catch (closeError) {
                console.error('Error closing database connection:', closeError);
            }
        }
        
        res.json({
            data: [],
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend API is running' });
});

// Start server
app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
    console.log('API endpoints:');
    console.log(`  POST /api/database - Handle database operations`);
    console.log(`  GET  /api/health   - Health check`);
});

module.exports = app;