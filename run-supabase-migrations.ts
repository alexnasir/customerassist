import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

async function run() {
  console.log('--- SUPABASE DIRECT MIGRATION & SEED ENGINE ---');
  
  if (!supabaseUrl) {
    console.error('❌ Error: SUPABASE_URL is missing in .env');
    process.exit(1);
  }

  // Parse project ID from URL (e.g. https://vnntmdjgeomessxalcsv.supabase.co -> vnntmdjgeomessxalcsv)
  const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.(?:co|net)/);
  if (!match) {
    console.error('❌ Error: Could not parse project ID from SUPABASE_URL:', supabaseUrl);
    process.exit(1);
  }

  const projectId = match[1];
  const dbHost = `db.${projectId}.supabase.co`;
  const dbPort = 6543; // Transaction pooler port for Supabase
  const dbUser = 'postgres';
  const dbPassword = supabaseSecretKey; // The password provided in .env

  console.log(`Connecting to Postgres:`);
  console.log(`Host: ${dbHost}`);
  console.log(`Port: ${dbPort}`);
  console.log(`User: ${dbUser}`);
  console.log(`Database: postgres`);

  // We try connection with port 6543 first, then fallback to 5432 if needed.
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase Postgres database successfully!');

    console.log('Running Migrations...');
    
    // Create sync table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS duka_letu_sync (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL
      );
    `;
    await client.query(createTableQuery);
    console.log('✅ Table "duka_letu_sync" created/verified.');

    // Enable Row Level Security (RLS) and create public policy so app can read/write
    console.log('Configuring Row Level Security policies...');
    try {
      await client.query('ALTER TABLE duka_letu_sync ENABLE ROW LEVEL SECURITY;');
      
      // Drop policy if it exists and recreate
      await client.query('DROP POLICY IF EXISTS "Allow public access" ON duka_letu_sync;');
      await client.query('CREATE POLICY "Allow public access" ON duka_letu_sync FOR ALL USING (true);');
      console.log('✅ Row Level Security policy "Allow public access" configured.');
    } catch (policyErr: any) {
      console.log('⚠️ Notice: Policy configuration warning (may already exist or need admin role):', policyErr.message);
    }

    // Now seed the database
    const dbPath = path.join(process.cwd(), 'db.json');
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Error: db.json not found at:', dbPath);
      await client.end();
      process.exit(1);
    }

    const rawData = fs.readFileSync(dbPath, 'utf-8');
    const dbData = JSON.parse(rawData);

    console.log('Seeding db.json payload into "duka_letu_sync"...');

    const upsertQuery = `
      INSERT INTO duka_letu_sync (id, data, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
    `;

    await client.query(upsertQuery, [
      'database_state',
      JSON.stringify(dbData),
      new Date().toISOString()
    ]);

    console.log('✅ Seeding completed successfully!');
    console.log('🚀 Supabase Cloud Sync state is now fully initialized and active!');

    await client.end();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error connecting to Postgres or executing migration:', err.message || err);
    console.log('\n--- FALLBACK SOLUTION ---');
    console.log('Direct TCP connection failed. This usually means the database password is set to something else or port 6543/5432 is restricted.');
    console.log('Please copy and run the following SQL inside your Supabase dashboard SQL Editor to create the table manually:');
    console.log('\n==================================================');
    console.log(`CREATE TABLE IF NOT EXISTS duka_letu_sync (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE duka_letu_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON duka_letu_sync FOR ALL USING (true);`);
    console.log('==================================================\n');
    console.log('Once the table is created, you can use the push sync button on the Dashboard view in the app UI to seed the data instantly!');
    
    try {
      await client.end();
    } catch (e) {}
    process.exit(2);
  }
}

run();
