import "dotenv/config";
import postgres from "postgres";
import fs from "fs";
import path from "path";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

async function runMigrations() {
  const client = postgres(connectionString, { ssl: 'require' });

  console.log("Running migrations...");
  try {
    const migrationsDir = path.join(process.cwd(), "drizzle");
    
    // Get all SQL files and sort them
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationFile = path.join(migrationsDir, file);
      console.log(`Running migration: ${file}`);
      
      const migrationSQL = fs.readFileSync(migrationFile, "utf-8");
      await client.unsafe(migrationSQL);
    }

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
