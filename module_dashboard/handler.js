const express = require("express");
const serverless = require("serverless-http");
const handleErrors = require("./src/middleware/handleErrors");
const cors = require("cors");

const app = express();
app.use(cors());

const DashboardApiRoutes = require("./src/routes/dashboard.routes");

app.use(express.json());

app.use("/dashboard", DashboardApiRoutes);

// HANDLING ERRORS
app.use(handleErrors);

module.exports.app = serverless(app);
