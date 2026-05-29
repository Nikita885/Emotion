import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import authRouter from "./routes/auth";
import entriesRouter from "./routes/entries";
import emotionsRouter from "./routes/emotions";
import meEmotionColorsRouter from "./routes/meEmotionColors";

dotenv.config();

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

const app = express();

app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/auth", authRouter);
app.use("/entries", entriesRouter);
app.use("/emotions", emotionsRouter);
app.use("/me", meEmotionColorsRouter);

// Serve static frontend in production
const frontendDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDist));
app.get("/*splat", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

const PORT = process.env.PORT || 5000;

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});