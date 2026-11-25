require("dotenv").config();
require('./config/databases'); // open all 6 Mongoose connections on startup
const express = require("express");
const cors = require("cors");
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; 
const ipv4 = process.env.IPV4 || "http://localhost";

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded())
app.use(cors());

app.use('/', express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/',require('./routes/root.route'));

app.listen(port, () =>
  console.log(`Server started on ${ipv4}:${port}`)
);