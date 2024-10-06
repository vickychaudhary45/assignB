const express = require("express");
const serverless = require("serverless-http");
const handleErrors = require("./src/middleware/handleErrors");
const cors = require("cors");

const app = express();
app.use(cors());

const RolesApiRoutes = require("./src/routes/roles.routes");

app.use(express.json());

app.use("/roles", RolesApiRoutes);

// HANDLING ERRORS
app.use(handleErrors);

module.exports.app = serverless(app);
