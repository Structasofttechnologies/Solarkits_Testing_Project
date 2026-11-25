require("dotenv").config();
const express = require("express");
const cookieParser = require('cookie-parser');
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3003;
const ipv4 = process.env.IPV4 || "http://localhost";

const FRONTEND_URLS = (process.env.FRONTEND_URLS || "").split(",").map(url => url.trim()).filter(Boolean);
app.use(cors({
  origin: FRONTEND_URLS.length ? FRONTEND_URLS : true,
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded())

app.use(cookieParser());

app.use("/api/india/v1", require("./routes/v1.routes"));

// Initialize background scheduler
require("./utils/scheduler");

app.listen(port, () =>
  console.log(`Server started on ${ipv4}:${port}`)
);
// restarted: absolute panel price logic fixed & razorpay watch configured