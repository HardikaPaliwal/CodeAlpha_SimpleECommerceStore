// server.js - Complete Node.js/Express.js Backend for E-commerce Store
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production'; // In production, use environment variable

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// In-memory database (in production, use MongoDB/MySQL/PostgreSQL)
let users = [];
let products = [
    {
        id: 1,
        name: "Smartphone Pro",
        price: 699.99,
        description: "Latest smartphone with advanced features",
        category: "Electronics",
        stock: 50,
        image: "smartphone.jpg"
    },
    {
        id: 2,
        name: "Laptop Ultra",
        price: 1299.99,
        description: "High-performance laptop for professionals",
        category: "Electronics",
        stock: 30,
        image: "laptop.jpg"
    },
    {
        id: 3,
        name: "Wireless Headphones",
        price: 199.99,
        description: "Premium noise-canceling headphones",
        category: "Audio",
        stock: 100,
        image: "headphones.jpg"
    },
    {
        id: 4,
        name: "Smart Watch",
        price: 299.99,
        description: "Fitness tracking smartwatch",
        category: "Wearables",
        stock: 75,
        image: "smartwatch.jpg"
    },
    {
        id: 5,
        name: "Gaming Console",
        price: 499.99,
        description: "Next-gen gaming console",
        category: "Gaming",
        stock: 25,
        image: "console.jpg"
    },
    {
        id: 6,
        name: "4K Monitor",
        price: 399.99,
        description: "Ultra-high definition monitor",
        category: "Electronics",
        stock: 40,
        image: "monitor.jpg"
    }
];
let orders = [];

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
};

// Routes

// Home route - serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Check if user already exists
        const existingUser = users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create new user
        const newUser = {
            id: users.length + 1,
            name,
            email,
            password: hashedPassword,
            createdAt: new Date()
        };
        
        users.push(newUser);
        
        // Generate JWT token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get all products
app.get('/api/products', (req, res) => {
    try {
        res.json({
            success: true,
            products: products
        });
    } catch (error) {
        console.error('Products fetch error:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});

// Get single product by ID
app.get('/api/products/:id', (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({
            success: true,
            product: product
        });
    } catch (error) {
        console.error('Product fetch error:', error);
        res.status(500).json({ error: 'Error fetching product' });
    }
});

// Add product to cart (protected route)
app.post('/api/cart/add', verifyToken, (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Insufficient stock' });
        }
        
        res.json({
            success: true,
            message: 'Product added to cart',
            item: {
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity
            }
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Error adding to cart' });
    }
});

// Process Order (protected route)
app.post('/api/orders', verifyToken, (req, res) => {
    try {
        const { items, totalAmount } = req.body;
        
        // Validation
        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'Order must contain at least one item' });
        }
        
        // Verify stock availability and calculate total
        let calculatedTotal = 0;
        for (let item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) {
                return res.status(404).json({ error: `Product with ID ${item.productId} not found` });
            }
            
            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}` 
                });
            }
            
            calculatedTotal += product.price * item.quantity;
        }
        
        // Verify total amount
        if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
            return res.status(400).json({ error: 'Total amount mismatch' });
        }
        
        // Create order
        const newOrder = {
            id: orders.length + 1,
            userId: req.user.id,
            items: items,
            totalAmount: calculatedTotal,
            status: 'confirmed',
            createdAt: new Date()
        };
        
        // Update stock
        for (let item of items) {
            const product = products.find(p => p.id === item.productId);
            product.stock -= item.quantity;
        }
        
        orders.push(newOrder);
        
        res.status(201).json({
            success: true,
            message: 'Order processed successfully',
            order: newOrder
        });
        
    } catch (error) {
        console.error('Order processing error:', error);
        res.status(500).json({ error: 'Error processing order' });
    }
});

// Get user's orders (protected route)
app.get('/api/orders', verifyToken, (req, res) => {
    try {
        const userOrders = orders.filter(order => order.userId === req.user.id);
        res.json({
            success: true,
            orders: userOrders
        });
    } catch (error) {
        console.error('Orders fetch error:', error);
        res.status(500).json({ error: 'Error fetching orders' });
    }
});

// Get specific order by ID (protected route)
app.get('/api/orders/:id', verifyToken, (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const order = orders.find(o => o.id === orderId && o.userId === req.user.id);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('Order fetch error:', error);
        res.status(500).json({ error: 'Error fetching order' });
    }
});

// Update user profile (protected route)
app.put('/api/users/profile', verifyToken, (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const user = users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.name = name;
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Error updating profile' });
    }
});

// Admin route to add products (protected)
app.post('/api/admin/products', verifyToken, (req, res) => {
    try {
        const { name, price, description, category, stock } = req.body;
        
        // Validation
        if (!name || !price || !description || !category || stock === undefined) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const newProduct = {
            id: products.length + 1,
            name,
            price: parseFloat(price),
            description,
            category,
            stock: parseInt(stock),
            image: `product${products.length + 1}.jpg`
        };
        
        products.push(newProduct);
        
        res.status(201).json({
            success: true,
            message: 'Product added successfully',
            product: newProduct
        });
        
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ error: 'Error adding product' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 E-commerce Server is running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💾 Using in-memory database`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});