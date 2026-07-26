const pool = require("./database");

async function testConnection() {
  try {

    const result = await pool.query(
      "SELECT NOW()"
    );

    console.log(
      "DATABASE CONNECTED"
    );

    console.log(result.rows[0]);

  } catch (err) {

    console.error(
      "DATABASE ERROR:TEST"
    );

    console.error(err);

  }
}

testConnection();