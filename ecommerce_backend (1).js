// server.js - Node.js/Express.js Backend for E-commerce Store
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

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
        
        // Verify stock availability
        for (let item of items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) {
                return res.status(404).json({ error: `Product with ID ${item.productId} not found` });
            }
            
            if (product.stock < item.quantity) {
                return res.