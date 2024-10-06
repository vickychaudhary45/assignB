const { Client } = require("pg");

const client = new Client({
  // Change 'Client' to 'client'
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "vicky",
  database: "postgres",
});

client.connect();

client.query(`SELECT * FROM users`, (err, result) => {
  if (!err) {
    console.log(result.rows);
  } else {
    console.error(err); // Log the error if it occurs
  }
  client.end();
});

// const { Client } = require("pg");
// const fs = require("fs");

// // Create a new client instance
// const client = new Client({
//   host: "localhost",
//   port: 5432,
//   user: "postgres",
//   password: "vicky", // Replace with your actual password
//   database: "postgres",
// });

// // Connect to the database
// client.connect();

// // Path to your JSON file
// const filePath = "users_202410060839FiniF.json";

// // Function to get columns from the database
// const getDbColumns = async () => {
//   const res = await client.query(`
//     SELECT column_name
//     FROM information_schema.columns
//     WHERE table_name = 'users'
//   `);
//   return res.rows.map((row) => row.column_name);
// };

// // Read the JSON file
// fs.readFile(filePath, "utf8", async (err, data) => {
//   if (err) {
//     console.error("Error reading the file:", err);
//     client.end();
//     return;
//   }

//   // Parse the JSON data
//   try {
//     const jsonData = JSON.parse(data);
//     const users = jsonData.users;

//     // Log column names from JSON file
//     const jsonColumns = Object.keys(users[0]);
//     console.log("JSON Columns:", jsonColumns);
//     console.log("JSON Columns Count:", jsonColumns.length);
//     console.log(users.length, 'users');

//     // Get and log columns from the database
//     // const dbColumns = await getDbColumns();
//     // console.log("Database Columns:", dbColumns);
//     // console.log("Database Columns Count:", dbColumns.length);

//     // Check if the number of columns match
//     // if (dbColumns.length !== jsonColumns.length) {
//     //   console.error("Column count mismatch: Database columns:", dbColumns.length, "JSON columns:", jsonColumns.length);
//     //   client.end();
//     //   return;
//     // }

//     // Iterate through each user in the JSON file
//     // for (const user of users) {
//     //   const query = `
//     //     INSERT INTO users (
//     //       ${dbColumns.join(", ")}
//     //     ) VALUES (
//     //       ${dbColumns.map((_, index) => `$${index + 1}`).join(", ")}
//     //     )
//     //   `;

//     //   const values = dbColumns.map((col) => user[col] || null); // Create values based on database columns

//     //   console.log("Inserting user:", user.username);
//     //   console.log("Values count:", values.length);

//     //   // Insert the user
//     //   try {
//     //     await client.query(query, values);
//     //     console.log("User inserted:", user.username);
//     //   } catch (err) {
//     //     console.error("Error inserting user:", err);
//     //   }
//     // }

//     // End the client connection after all inserts are done
//     client.end();

//   } catch (parseErr) {
//     console.error("Error parsing JSON:", parseErr);
//     client.end();
//   }
// });

// // const { Client } = require('pg');

// // // Create a new client instance
// // const client = new Client({
// //   host: 'localhost',
// //   port: 5432,
// //   user: 'postgres',  // Replace with your actual user
// //   password: 'vicky', // Replace with your actual password
// //   database: 'postgres', // Replace with your database name
// // });

// // // Connect to the database
// // client.connect();

// // // Query to get column names
// // const query = `
// //   SELECT column_name
// //   FROM information_schema.columns
// //   WHERE table_name = 'users';
// // `;

// // // Execute the query
// // client.query(query, (err, res) => {
// //   if (err) {
// //     console.error("Error retrieving column names:", err);
// //   } else {
// //     const columnNames = res.rows.map(row => row.column_name);
// //     console.log("Columns in 'users' table:", columnNames);
// //   }

// //   // End the client connection
// //   client.end();
// // });
