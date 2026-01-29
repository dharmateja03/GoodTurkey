import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import sitesRoutes from "./routes/sites";
import categoriesRoutes from "./routes/categories";
import timeWindowsRoutes from "./routes/timeWindows";
import syncRoutes from "./routes/sync";
import quotesRoutes from "./routes/quotes";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/sites", sitesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/time-windows", timeWindowsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/quotes", quotesRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
