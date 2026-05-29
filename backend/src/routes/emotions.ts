import { Router } from "express";
import { prisma } from "../prisma";
import { ensureDefaultEmotions } from "../services/emotions";

const router = Router();

router.get("/", async (_req, res) => {
  await ensureDefaultEmotions();
  const emotions = await prisma.emotion.findMany({
    orderBy: { id: "asc" },
    select: { id: true, slug: true, title: true, defaultColorHex: true },
  });
  return res.json({ emotions });
});

export default router;

