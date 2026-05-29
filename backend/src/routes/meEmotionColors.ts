import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { ensureDefaultEmotions } from "../services/emotions";

const router = Router();

const ColorHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const PutSchema = z.object({
  items: z
    .array(
      z.object({
        emotionId: z.number().int().positive(),
        colorHex: ColorHexSchema,
      }),
    )
    .max(200),
});

router.use(requireAuth);

// Возвращает цвета пользователя для каждой эмоции.
// Если каких-то строк нет — создаём их с дефолтным цветом.
router.get("/emotion-colors", async (req: AuthedRequest, res) => {
  await ensureDefaultEmotions();

  const emotions = await prisma.emotion.findMany({
    select: { id: true, defaultColorHex: true },
    orderBy: { id: "asc" },
  });

  const existing = await prisma.userEmotionColor.findMany({
    where: { userId: req.user!.id },
    select: { emotionId: true, colorHex: true },
  });

  const byEmotionId = new Map(existing.map((x) => [x.emotionId, x.colorHex]));

  const missing = emotions
    .filter((e) => !byEmotionId.has(e.id))
    .map((e) => ({ userId: req.user!.id, emotionId: e.id, colorHex: e.defaultColorHex }));

  if (missing.length > 0) {
    await prisma.userEmotionColor.createMany({ data: missing });
    for (const m of missing) byEmotionId.set(m.emotionId, m.colorHex);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { emotionPaletteSetAt: true },
  });

  const items = emotions.map((e) => ({
    emotionId: e.id,
    colorHex: byEmotionId.get(e.id) ?? e.defaultColorHex,
  }));

  return res.json({ items, paletteSetAt: user?.emotionPaletteSetAt ?? null });
});

router.put("/emotion-colors", async (req: AuthedRequest, res) => {
  await ensureDefaultEmotions();

  const parsed = PutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const items = parsed.data.items;

  // Проверим, что emotionId существует (и принадлежит нашим эмоциям).
  const ids = Array.from(new Set(items.map((i) => i.emotionId)));
  const existing = await prisma.emotion.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (existing.length !== ids.length) return res.status(400).json({ error: "UNKNOWN_EMOTION" });

  // Upsert пачкой: Prisma не умеет multi-upsert одной командой,
  // поэтому делаем транзакцией.
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.userEmotionColor.upsert({
        where: { userId_emotionId: { userId: req.user!.id, emotionId: item.emotionId } },
        update: { colorHex: item.colorHex, updatedAt: new Date() },
        create: { userId: req.user!.id, emotionId: item.emotionId, colorHex: item.colorHex },
      });
    }

    await tx.user.update({
      where: { id: req.user!.id },
      data: { emotionPaletteSetAt: new Date() },
    });
  });

  return res.json({ ok: true });
});

export default router;

