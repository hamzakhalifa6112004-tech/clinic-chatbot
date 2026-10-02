import "dotenv/config";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from .env");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      status TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'confirmed', 'cancelled')),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      preferred_time TEXT NOT NULL,
      reason TEXT NOT NULL
    )
  `);
  const { rows } = await pool.query("SELECT count(*) FROM bookings");
  console.log("Connected. bookings table is ready. Rows:", rows[0].count);
} catch (err) {
  console.error("Database setup failed:", err.message);
} finally {
  await pool.end();
}
