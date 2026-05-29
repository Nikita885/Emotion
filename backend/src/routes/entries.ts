import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

const router = Router();

const DateParamSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((s) => new Date(`${s}T00:00:00.000Z`));

const UpsertEntrySchema = z.object({
  mood: z.number().int().min(0).max(10),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  emotions: z.array(z.string().min(1).max(40)).max(30),
  note: z.string().max(5000).optional().nullable(),
});

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res) => {
  const fromRaw = req.query.from as string | undefined;
  const toRaw = req.query.to as string | undefined;
  if (!fromRaw || !toRaw) return res.status(400).json({ error: "MISSING_RANGE" });

  const fromParsed = DateParamSchema.safeParse(fromRaw);
  const toParsed = DateParamSchema.safeParse(toRaw);
  if (!fromParsed.success || !toParsed.success) return res.status(400).json({ error: "INVALID_RANGE" });

  const from = fromParsed.data;
  const to = toParsed.data;

  const entries = await prisma.entry.findMany({
    where: {
      userId: req.user!.id,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      mood: true,
      colorHex: true,
      emotions: true,
      note: true,
    },
  });

  return res.json({ entries });
});

router.get("/:date", async (req: AuthedRequest, res) => {
  const parsed = DateParamSchema.safeParse(req.params.date);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_DATE" });
  const date = parsed.data;

  const entry = await prisma.entry.findUnique({
    where: { userId_date: { userId: req.user!.id, date } },
    select: { date: true, mood: true, colorHex: true, emotions: true, note: true },
  });

  return res.json({ entry: entry ?? null });
});

router.put("/:date", async (req: AuthedRequest, res) => {
  const dateParsed = DateParamSchema.safeParse(req.params.date);
  if (!dateParsed.success) return res.status(400).json({ error: "INVALID_DATE" });
  const bodyParsed = UpsertEntrySchema.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "INVALID_INPUT" });

  const date = dateParsed.data;
  const { mood, colorHex, emotions, note } = bodyParsed.data;

  const entry = await prisma.entry.upsert({
    where: { userId_date: { userId: req.user!.id, date } },
    update: { mood, colorHex, emotions, note: note ?? null },
    create: { userId: req.user!.id, date, mood, colorHex, emotions, note: note ?? null },
    select: { date: true, mood: true, colorHex: true, emotions: true, note: true },
  });

  return res.json({ entry });
});

router.delete("/:date", async (req: AuthedRequest, res) => {
  const parsed = DateParamSchema.safeParse(req.params.date);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_DATE" });
  const date = parsed.data;

  await prisma.entry.deleteMany({ where: { userId: req.user!.id, date } });
  return res.json({ ok: true });
});

export default router;

