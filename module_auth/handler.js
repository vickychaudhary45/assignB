const express = require("express");
const serverless = require("serverless-http");
const handleErrors = require("./src/middleware/handleErrors");
// require("dotenv").config();
const cors = require("cors");

const app = express();
app.use(cors());

const AuthApiRoutes = require("./src/routes/auth.routes");

app.use(express.json());

app.use("/auth", AuthApiRoutes);

// HANDLING ERRORS
app.use(handleErrors);

module.exports.app = serverless(app);
