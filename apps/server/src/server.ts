
import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";

const app = express();

const PORT = 5000;

app.use(express.json());
app.use(cors());

// =========================
// TEST DATABASE CONNECTION
// =========================

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "DemoProject API is running 🚀",
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

// =========================
// AUTH ROUTES
// =========================

app.use("/", authRoutes);
app.use("/", courseRoutes);
app.use("/", subscriptionRoutes);
// =========================
// START SERVER
// =========================

const server = app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

