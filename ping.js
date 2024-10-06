const initializeConnections = require('./config/db'); // Adjust the path accordingly
require('dotenv').config();

module.exports.dbCheck = async (event, context, callback) => {
  let dbStatus = {};
  let dbStatus1 = {};
  try {
    // Get the database connections
    const { KnexMaster, KnexB2BLms } = await initializeConnections();

    // Check the Master database connection
    const masterData = await KnexMaster.raw('select 1+1 as result');
    if (masterData) {
      dbStatus = 'Masterdata Connected';
    }

    // Check the B2B LMS database connection
    const b2blmsData = await KnexB2BLms.raw('select 1+1 as result');
    if (b2blmsData) {
      dbStatus1 = 'B2B LMS Connected';
    }
  } catch (error) {
    console.log('Some error occurred: ', error);
    dbStatus = 'Not Connected';
    dbStatus1 = 'Not Connected';
  } finally {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: `Hello, the current time is ${new Date().toTimeString()}.`,
        db_status: dbStatus,
        db_status1: dbStatus1,
      }),
    };

    callback(null, response);
  }
};

module.exports.time = async (event, context, callback) => {
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: `Hello, the current time is ${new Date().toTimeString()}.`,
    }),
  };

  callback(null, response);
};