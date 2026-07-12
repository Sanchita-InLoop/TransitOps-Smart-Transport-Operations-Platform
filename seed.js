const { Client } = require('pg');
const fs = require('fs');

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  let sql = fs.readFileSync('clean_schema.sql', 'utf8');
  // Strip BOM
  if (sql.charCodeAt(0) === 0xFEFF) {
    sql = sql.slice(1);
  }
  await client.query(sql);
  console.log('Schema imported successfully');
  await client.end();
}

seed().catch(console.error);
