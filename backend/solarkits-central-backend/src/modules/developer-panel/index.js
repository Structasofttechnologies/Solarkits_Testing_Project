require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000; 
const ipv4 = process.env.IPV4 || "http://localhost";

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded())
app.use(cors());

app.use('/',require('./routes/root.route'));
app.use('/panels',require('./routes/user_panels.route'));
app.use('/dashboard',require('./routes/dashboard.route'))
app.use('/modules',require('./routes/modules.route'))

app.listen(port, () =>
  console.log(`Server started on ${ipv4}:${port}`)
);