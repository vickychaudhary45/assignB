const knex = require("knex");
require("dotenv").config();
// const { attachPaginate } = require("knex-paginate");
// attachPaginate();

// Function to initialize a database connection
const initializeDatabase = (dbConfig) => {
  return knex({
    client: dbConfig.client,
    connection: {
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port,
    },
    pool: { min: 0, max: 50 },
  });
};

// Function to initialize all database connections
const initializeConnections = async () => {
  const dbConfigB2BLms = {
    client: "postgresql",
    host: process.env.DB_B2B_LMS_HOST || "localhost",
    user: process.env.DB_B2B_LMS_USER || "postgres",
    password: process.env.DB_B2B_LMS_PASSWORD || "vicky",
    database: process.env.DB_B2B_LMS_NAME || "postgres",
    port: process.env.DB_B2B_LMS_PORT || 5432,
  };

  let KnexB2BLms;

  try {
    KnexB2BLms = initializeDatabase(dbConfigB2BLms);
    console.log("Database connection established successfully for B2B LMS.");
  } catch (error) {
    console.error(
      "Error establishing database connection for B2B LMS:",
      error.message
    );
    throw error;
  }

  // Retrieve application secret directly from environment variables
  const ApplicationSecret = {
    secret: {
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_ISSUER: process.env.JWT_ISSUER,
    },
  };

  return { KnexB2BLms, ApplicationSecret };
};

module.exports = initializeConnections;
