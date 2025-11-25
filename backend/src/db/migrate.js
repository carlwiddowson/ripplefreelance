const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Starting database migration...');
  console.log(`Connecting to: ${databaseUrl.split('@')[1] || 'database'}`);

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // Read schema SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    console.log('✅ Database schema created successfully');
    console.log('\nTables created:');
    console.log('  - users');
    console.log('  - gigs');
    console.log('  - transactions');
    console.log('  - escrows');
    console.log('  - reviews');
    console.log('  - sessions');
    console.log('\nViews created:');
    console.log('  - user_stats');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✨ Migration complete!');
  }
}

migrate();
