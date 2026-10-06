import { Pool } from "pg";

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "demoproject",
  password: "data123",
  port: 5432,
});