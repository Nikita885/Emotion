import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../prisma";
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../auth/tokens";
import { ensureDefaultEmotions } from "../services/emotions";

const router = Router();

const CredentialsSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(6).max(200),
});

function setAuthCookies(res: any, access: string, refresh: string) {
  const isProd = process.env.NODE_ENV === "production";
  const common = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
  res.cookie("access_token", access, { ...common, maxAge: 15 * 60 * 1000 });
  res.cookie("refresh_token", refresh, { ...common, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res: any) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
}

router.post("/register", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "EMAIL_TAKEN" });

  await ensureDefaultEmotions();

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, emotionPaletteSetAt: true },
    });

    // Инициализируем цвета (по дефолтам), чтобы фронт мог сразу редактировать.
    const emotions = await tx.emotion.findMany({ select: { id: true, defaultColorHex: true } });
    if (emotions.length > 0) {
      await tx.userEmotionColor.createMany({
        data: emotions.map((e) => ({
          userId: created.id,
          emotionId: e.id,
          colorHex: e.defaultColorHex,
        })),
      });
    }

    return created;
  });

  const payload = { sub: String(user.id), email: user.email };
  const access = signAccessToken(payload);
  const refresh = signRefreshToken(payload);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(refresh, 12) },
  });

  setAuthCookies(res, access, refresh);
  return res.json({ user });
});

router.post("/login", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT" });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

  const payload = { sub: String(user.id), email: user.email };
  const access = signAccessToken(payload);
  const refresh = signRefreshToken(payload);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash: await bcrypt.hash(refresh, 12) },
  });

  setAuthCookies(res, access, refresh);
  return res.json({
    user: { id: user.id, email: user.email, emotionPaletteSetAt: user.emotionPaletteSetAt },
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.refresh_token as string | undefined;
  if (!token) return res.status(401).json({ error: "UNAUTHORIZED" });

  try {
    const payload = verifyRefreshToken(token);
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId)) return res.status(401).json({ error: "UNAUTHORIZED" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash) return res.status(401).json({ error: "UNAUTHORIZED" });
    const ok = await bcrypt.compare(token, user.refreshTokenHash);
    if (!ok) return res.status(401).json({ error: "UNAUTHORIZED" });

    const nextPayload = { sub: String(user.id), email: user.email };
    const access = signAccessToken(nextPayload);
    const refresh = signRefreshToken(nextPayload);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refresh, 12) },
    });

    setAuthCookies(res, access, refresh);
    return res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
});

router.post("/logout", async (req, res) => {
  const token = req.cookies?.refresh_token as string | undefined;
  clearAuthCookies(res);

  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const userId = Number(payload.sub);
      if (Number.isFinite(userId)) {
        await prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
      }
    } catch {
      // ignore
    }
  }

  return res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const access = req.cookies?.access_token as string | undefined;
  if (!access) return res.json({ user: null });
  try {
    const { sub } = verifyAccessToken(access);
    const id = Number(sub);
    if (!Number.isFinite(id)) return res.json({ user: null });
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, emotionPaletteSetAt: true },
    });
    return res.json({ user: user ?? null });
  } catch {
    return res.json({ user: null });
  }
});

export default router;

