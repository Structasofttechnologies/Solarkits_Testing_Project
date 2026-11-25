require("dotenv").config();
require("./config/databases"); // Trigger restart 12 Mongoose connections on startup
const express = require("express");

const cookieParser = require('cookie-parser');
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;
const ipv4 = process.env.IPV4 || "http://localhost";

const FRONTEND_URLS = process.env.FRONTEND_URLS.split(",").map(url => url.trim());
app.use(cors({
  origin: FRONTEND_URLS,
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded())

app.use(cookieParser());

app.use('/', require('./routes/auth.route'));

app.listen(port, () =>
  console.log(`Server started on ${ipv4}:${port}`)
);

