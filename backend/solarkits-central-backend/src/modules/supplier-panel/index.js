require('dotenv').config();
require('./config/databases');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3007;
const ipv4 = process.env.IPV4 || 'http://localhost';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:5181', 'http://localhost:5174'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.includes(origin) || origin.startsWith('http://localhost:');
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use('/', express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/auth',     require('./routes/auth.route'));
app.use('/supplier', require('./routes/supplier.route'));
app.use('/plans',    require('./routes/plans.route'));
app.use('/admin',    require('./routes/admin.route'));

app.listen(port, () =>
    console.log(`✅ Supplier Panel Backend started on ${ipv4}:${port}`)
);
