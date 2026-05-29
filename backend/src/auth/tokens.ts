import jwt from "jsonwebtoken";

export type AccessTokenPayload = {
  sub: string; // userId
  email: string;
};

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "30d";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = requireEnv("ACCESS_TOKEN_SECRET");
  return jwt.sign(payload, secret, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(payload: AccessTokenPayload): string {
  const secret = requireEnv("REFRESH_TOKEN_SECRET");
  return jwt.sign(payload, secret, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = requireEnv("ACCESS_TOKEN_SECRET");
  return jwt.verify(token, secret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): AccessTokenPayload {
  const secret = requireEnv("REFRESH_TOKEN_SECRET");
  return jwt.verify(token, secret) as AccessTokenPayload;
}

