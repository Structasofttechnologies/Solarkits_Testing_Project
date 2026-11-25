require("dotenv").config();
require("./config/databases"); // connects to Mongoose
const express = require("express");
const cookieParser = require('cookie-parser');
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3006;
const ipv4 = process.env.IPV4 || "http://localhost";

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/', require('./routes/root.route'));

app.listen(port, () =>
  console.log(`Account Panel Backend started on ${ipv4}:${port}`)
);
