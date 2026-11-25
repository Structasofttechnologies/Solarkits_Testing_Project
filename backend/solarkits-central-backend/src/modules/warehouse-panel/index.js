require("dotenv").config();
require('./config/databases'); // open all 6 Mongoose connections on startup
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; 
const ipv4 = process.env.IPV4 || "http://localhost";

const FRONTEND_URLS = (process.env.FRONTEND_URLS || "").split(",").map(url => url.trim()).filter(Boolean);
app.use(cors({
  origin: FRONTEND_URLS.length ? FRONTEND_URLS : true,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded())

app.use('/', express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/', require('./routes/root.route'));
app.use('/auth', require('./routes/auth.route'));
app.use('/warehouse', require('./routes/warehouse.route'));

require('./utils/scheduler');

app.listen(port, () =>
  console.log(`Server started on ${ipv4}:${port}`)
);