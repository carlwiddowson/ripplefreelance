#!/usr/bin/env node
require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

async function verifyDatabase() {
  console.log('🔍 Verifying Neon Database Setup...\n');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });

  try {
    // Test connection
    console.log('✓ Testing connection...');
    await pool.query('SELECT NOW()');
    console.log('  Connected successfully!\n');

    // List tables
    console.log('✓ Checking tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'gigs', 'transactions', 'escrows', 'reviews', 'sessions'];
    const actualTables = tablesResult.rows.map(r => r.table_name);
    
    expectedTables.forEach(table => {
      if (actualTables.includes(table)) {
        console.log(`  ✓ ${table}`);
      } else {
        console.log(`  ✗ ${table} (MISSING)`);
      }
    });

    // Check views
    console.log('\n✓ Checking views...');
    const viewsResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    viewsResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check extensions
    console.log('\n✓ Checking extensions...');
    const extResult = await pool.query(`
      SELECT extname FROM pg_extension 
      WHERE extname = 'uuid-ossp'
    `);
    
    if (extResult.rows.length > 0) {
      console.log('  ✓ uuid-ossp enabled');
    } else {
      console.log('  ✗ uuid-ossp (MISSING)');
    }

    // Count records
    console.log('\n✓ Checking record counts...');
    for (const table of expectedTables) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${countResult.rows[0].count} records`);
    }

    console.log('\n✅ Database verification complete!');
    console.log('\n🚀 Your database is ready to use!\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyDatabase();
