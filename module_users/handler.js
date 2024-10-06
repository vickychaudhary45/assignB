const express = require("express");
const serverless = require("serverless-http");
const handleErrors = require("./src/middlewares/handleErrors");
const cors = require("cors");

const app = express();
app.use(cors());

const UsersApiRoutes = require("./src/routes/users.routes");

app.use(express.json());

app.use("/users", UsersApiRoutes);

// HANDLING ERRORS
app.use(handleErrors);

module.exports.app = serverless(app);
