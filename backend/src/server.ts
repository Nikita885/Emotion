import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import entriesRouter from "./routes/entries";
import emotionsRouter from "./routes/emotions";
import meEmotionColorsRouter from "./routes/meEmotionColors";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ ok: true, name: "emotion-backend" });
});

app.use("/auth", authRouter);
app.use("/entries", entriesRouter);
app.use("/emotions", emotionsRouter);
app.use("/me", meEmotionColorsRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});