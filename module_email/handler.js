const express = require("express");
const serverless = require("serverless-http");
const handleErrors = require("./src/middleware/handleErrors");
const cors = require("cors");

const app = express();
app.use(cors());

const EmailNotificationRoutes = require("./src/routes/email.routes");

app.use(express.json());

app.use("/emailsettings", EmailNotificationRoutes);

// HANDLING ERRORS
app.use(handleErrors);

module.exports.app = serverless(app);