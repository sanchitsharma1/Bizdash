// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
require('dotenv').config(); // To load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 3001;

// --- Database Configuration ---
// Ensure you have these environment variables set in your .env file for local development
// and in your Render environment settings for production.
// Example .env:
// DATABASE_URL=postgresql://user:password@host:port/database
// JWT_SECRET=yourverysecretkey
// BASIC_AUTH_USER=admin
// BASIC_AUTH_PASSWORD=password

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client for DB connection test:', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Error executing DB connection test query:', err.stack);
    }
    console.log('Successfully connected to PostgreSQL database:', result.rows[0].now);
  });
});

// --- Middleware ---
app.use(cors()); // Enable CORS for all routes
app.use(helmet()); // Adds various security headers
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// --- Basic Authentication Middleware (Phase 2 - simplified for MVP) ---
// For a real app, use JWT and bcrypt for password hashing.
// This is a very basic example.
const basicAuth = (req, res, next) => {
  // In a real app, you'd have a proper login route that issues a token.
  // For now, let's allow all requests in development or if no auth is set.
  if (process.env.NODE_ENV !== 'production' || (!process.env.BASIC_AUTH_USER || !process.env.BASIC_AUTH_PASSWORD)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Area"');
    return res.status(401).json({ message: 'Authentication required' });
  }

  const [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');

  if (username === process.env.BASIC_AUTH_USER && password === process.env.BASIC_AUTH_PASSWORD) {
    return next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Area"');
    return res.status(401).json({ message: 'Invalid credentials' });
  }
};
// Apply auth to all routes except a potential future login route
// For MVP, we might leave this off and add it in Phase 2.
// app.use(basicAuth); // Uncomment when ready for basic auth

// --- API Routes ---

// Helper function for consistent API responses
const sendResponse = (res, statusCode, dataOrMessage) => {
  if (statusCode >= 200 && statusCode < 300) {
    res.status(statusCode).json(dataOrMessage);
  } else {
    res.status(statusCode).json({ message: dataOrMessage });
  }
};

// --- Expenses Routes (Phase 1) ---
// GET all expenses
app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
    sendResponse(res, 200, result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    sendResponse(res, 500, 'Failed to fetch expenses');
  }
});

// POST a new expense
app.post('/api/expenses', async (req, res) => {
  const { description, amount, category, date } = req.body;
  if (!description || !amount || !category || !date) {
    return sendResponse(res, 400, 'Missing required fields for expense');
  }
  try {
    const result = await pool.query(
      'INSERT INTO expenses (description, amount, category, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, parseFloat(amount), category, date]
    );
    sendResponse(res, 201, result.rows[0]);
  } catch (error) {
    console.error('Error adding expense:', error);
    sendResponse(res, 500, 'Failed to add expense');
  }
});

// PUT (update) an existing expense
app.put('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, date } = req.body;
  if (!description || !amount || !category || !date) {
    return sendResponse(res, 400, 'Missing required fields for expense update');
  }
  try {
    const result = await pool.query(
      'UPDATE expenses SET description = $1, amount = $2, category = $3, date = $4 WHERE id = $5 RETURNING *',
      [description, parseFloat(amount), category, date, parseInt(id)]
    );
    if (result.rows.length === 0) {
      return sendResponse(res, 404, 'Expense not found');
    }
    sendResponse(res, 200, result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    sendResponse(res, 500, 'Failed to update expense');
  }
});

// DELETE an expense
app.delete('/api/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [parseInt(id)]);
    if (result.rows.length === 0) {
      return sendResponse(res, 404, 'Expense not found');
    }
    sendResponse(res, 200, { message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    sendResponse(res, 500, 'Failed to delete expense');
  }
});

// --- Earnings Routes (Phase 1) ---
// GET all earnings
app.get('/api/earnings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM earnings ORDER BY date DESC');
    sendResponse(res, 200, result.rows);
  } catch (error) {
    console.error('Error fetching earnings:', error);
    sendResponse(res, 500, 'Failed to fetch earnings');
  }
});

// POST a new earning
app.post('/api/earnings', async (req, res) => {
  const { description, amount, source, date } = req.body;
   if (!description || !amount || !source || !date) {
    return sendResponse(res, 400, 'Missing required fields for earning');
  }
  try {
    const result = await pool.query(
      'INSERT INTO earnings (description, amount, source, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, parseFloat(amount), source, date]
    );
    sendResponse(res, 201, result.rows[0]);
  } catch (error) {
    console.error('Error adding earning:', error);
    sendResponse(res, 500, 'Failed to add earning');
  }
});

// PUT (update) an existing earning
app.put('/api/earnings/:id', async (req, res) => {
  const { id } = req.params;
  const { description, amount, source, date } = req.body;
  if (!description || !amount || !source || !date) {
    return sendResponse(res, 400, 'Missing required fields for earning update');
  }
  try {
    const result = await pool.query(
      'UPDATE earnings SET description = $1, amount = $2, source = $3, date = $4 WHERE id = $5 RETURNING *',
      [description, parseFloat(amount), source, date, parseInt(id)]
    );
    if (result.rows.length === 0) {
      return sendResponse(res, 404, 'Earning not found');
    }
    sendResponse(res, 200, result.rows[0]);
  } catch (error) {
    console.error('Error updating earning:', error);
    sendResponse(res, 500, 'Failed to update earning');
  }
});

// DELETE an earning
app.delete('/api/earnings/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM earnings WHERE id = $1 RETURNING *', [parseInt(id)]);
     if (result.rows.length === 0) {
      return sendResponse(res, 404, 'Earning not found');
    }
    sendResponse(res, 200, { message: 'Earning deleted successfully' });
  } catch (error) {
    console.error('Error deleting earning:', error);
    sendResponse(res, 500, 'Failed to delete earning');
  }
});

// --- Inventory Routes (Phase 1) ---
// GET all inventory items
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
    sendResponse(res, 200, result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    sendResponse(res, 500, 'Failed to fetch inventory items');
  }
});

// POST a new inventory item
app.post('/api/inventory', async (req, res) => {
  const { name, quantity, cost_price, selling_price, supplier } = req.body;
  if (!name || quantity === undefined || cost_price === undefined || selling_price === undefined) {
    return sendResponse(res, 400, 'Missing required fields for inventory item');
  }
  try {
    const result = await pool.query(
      'INSERT INTO inventory (name, quantity, cost_price, selling_price, supplier) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, parseInt(quantity), parseFloat(cost_price), parseFloat(selling_price), supplier]
    );
    sendResponse(res, 201, result.rows[0]);
  } catch (error) {
    console.error('Error adding inventory item:', error);
    sendResponse(res, 500, 'Failed to add inventory item');
  }
});

// PUT (update) an existing inventory item
app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const { name, quantity, cost_price, selling_price, supplier } = req.body;
   if (!name || quantity === undefined || cost_price === undefined || selling_price === undefined) {
    return sendResponse(res, 400, 'Missing required fields for inventory item update');
  }
  try {
    const result = await pool.query(
      'UPDATE inventory SET name = $1, quantity = $2, cost_price = $3, selling_price = $4, supplier = $5 WHERE id = $6 RETURNING *',
      [name, parseInt(quantity), parseFloat(cost_price), parseFloat(selling_price), supplier, parseInt(id)]
    );
    if (result.rows.length === 0) {
      return sendResponse(res, 404, 'Inventory item not found');
    }
    sendResponse(res, 200, result.rows[0]);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    sendResponse(res, 500, 'Failed to update inventory item');
  }
});

// DELETE an inventory item
app.delete('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [parseInt(id)]);
    if (result.rows.length === 0) {
      return sendResponse(res, 404, 'Inventory item not found');
    }
    sendResponse(res, 200, { message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    sendResponse(res, 500, 'Failed to delete inventory item');
  }
});

// --- Dashboard Summary Route (Phase 1 & 2) ---
app.get('/api/summary', async (req, res) => {
  try {
    const totalExpensesRes = await pool.query('SELECT SUM(amount) AS total_expenses FROM expenses');
    const totalEarningsRes = await pool.query('SELECT SUM(amount) AS total_earnings FROM earnings');
    const inventoryValueRes = await pool.query('SELECT SUM(quantity * cost_price) AS total_inventory_value FROM inventory');
    
    // For monthly charts (Phase 2)
    const monthlyExpensesRes = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount) AS total
      FROM expenses
      GROUP BY month
      ORDER BY month;
    `);
    const monthlyEarningsRes = await pool.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') AS month, SUM(amount) AS total
      FROM earnings
      GROUP BY month
      ORDER BY month;
    `);

    const summary = {
      totalExpenses: parseFloat(totalExpensesRes.rows[0]?.total_expenses) || 0,
      totalEarnings: parseFloat(totalEarningsRes.rows[0]?.total_earnings) || 0,
      netProfit: (parseFloat(totalEarningsRes.rows[0]?.total_earnings) || 0) - (parseFloat(totalExpensesRes.rows[0]?.total_expenses) || 0),
      totalInventoryValue: parseFloat(inventoryValueRes.rows[0]?.total_inventory_value) || 0,
      monthlyExpenses: monthlyExpensesRes.rows,
      monthlyEarnings: monthlyEarningsRes.rows,
    };
    sendResponse(res, 200, summary);
  } catch (error) {
    console.error('Error fetching summary data:', error);
    sendResponse(res, 500, 'Failed to fetch summary data');
  }
});


// --- Simple Login Route (Phase 2 - very basic) ---
// In a real app: use bcrypt to compare hashed passwords from DB, issue JWT
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    const appUser = process.env.BASIC_AUTH_USER;
    const appPassword = process.env.BASIC_AUTH_PASSWORD;

    if (!appUser || !appPassword) {
        return sendResponse(res, 500, "Authentication not configured on server.");
    }

    if (username === appUser && password === appPassword) {
        // In a real JWT setup, you would generate and return a token here.
        // For this basic example, we'll just confirm success.
        // The frontend will then know it's "logged in".
        sendResponse(res, 200, { message: "Login successful", user: { username } });
    } else {
        sendResponse(res, 401, "Invalid username or password");
    }
});


// --- Root Route & Error Handling ---
app.get('/', (req, res) => {
  res.send('Business Dashboard API is running!');
});

// Catch-all for 404 Not Found errors
app.use((req, res, next) => {
  sendResponse(res, 404, 'Resource not found');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler caught an error:', err.stack);
  sendResponse(res, 500, 'An unexpected error occurred');
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
