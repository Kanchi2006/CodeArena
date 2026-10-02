const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    user: 'root', password: 'Kamakshi@23', database: 'codearena_db', host: 'localhost'
  });

  const [tables] = await conn.query("SHOW TABLES");
  console.log('Tables:', tables.map(t => Object.values(t)[0]));

  await conn.end();
}
run().catch(console.error);
