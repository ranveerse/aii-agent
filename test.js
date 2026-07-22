import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "$Ckodk6D",
  database: "aii",
});

console.log("Connected");