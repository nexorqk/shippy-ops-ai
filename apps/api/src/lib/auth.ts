import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ensureDemoUser, prisma } from "../db.js";

export const sessionCookieName = "shippy_session";
const oauthStateCookieName = "shippy_oauth_state";
const sessionDays = 30;

type GoogleUserInfo = {
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function getCurrentUser(request: FastifyRequest) {
  const token = request.cookies?.[sessionCookieName];

  if (token) {
    const session = await prisma.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true }
    });

    if (session && session.expiresAt > new Date()) {
      return session.user;
    }
  }

  if (process.env.ALLOW_DEMO_AUTH !== "false") {
    return ensureDemoUser();
  }

  return null;
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const user = await getCurrentUser(request);
  if (!user) {
    reply.code(401).send({ message: "Authentication required" });
    return null;
  }
  return user;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = await requireUser(request, reply);
  if (!user) return null;

  if (user.role !== "admin") {
    reply.code(403).send({ message: "Admin access required" });
    return null;
  }

  return user;
}

export async function createSession(reply: FastifyReply, userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  reply.setCookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    expires: expiresAt
  });
}

export async function clearSession(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies?.[sessionCookieName];
  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  reply.clearCookie(sessionCookieName, { path: "/" });
}

export function createOAuthState(reply: FastifyReply) {
  const state = crypto.randomBytes(24).toString("base64url");

  reply.setCookie(oauthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 10 * 60
  });

  return state;
}

export function validateOAuthState(request: FastifyRequest, reply: FastifyReply, state: string) {
  const expected = request.cookies?.[oauthStateCookieName];
  reply.clearCookie(oauthStateCookieName, { path: "/" });
  return Boolean(expected && state && expected === state);
}

export async function exchangeGoogleCodeForUser(code: string): Promise<GoogleUserInfo> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: googleRedirectUri()
    })
  });

  if (!tokenResponse.ok) {
    throw new Error("Google token exchange failed.");
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    throw new Error("Google token response did not include an access token.");
  }

  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  });

  if (!userResponse.ok) {
    throw new Error("Google userinfo request failed.");
  }

  const user = (await userResponse.json()) as GoogleUserInfo;
  if (!user.email || user.email_verified === false) {
    throw new Error("Google account email is not verified.");
  }

  return user;
}

export async function upsertOAuthUser(userInfo: GoogleUserInfo) {
  const adminEmails = parseAdminEmails();
  const role = adminEmails.has(userInfo.email.toLowerCase()) ? "admin" : "user";

  return prisma.user.upsert({
    where: { email: userInfo.email },
    update: {
      name: userInfo.name ?? undefined,
      image: userInfo.picture ?? undefined,
      role
    },
    create: {
      email: userInfo.email,
      name: userInfo.name,
      image: userInfo.picture,
      role,
      referralCode: createReferralCode(userInfo.email)
    }
  });
}

export function googleRedirectUri() {
  return `${process.env.API_URL ?? "http://localhost:4000"}/auth/google/callback`;
}

export function appUrl(path = "/dashboard") {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}

export function publicUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus
  };
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseAdminEmails() {
  return new Set((process.env.ADMIN_EMAILS ?? "demo@shippy-ops-ai.local").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

function createReferralCode(email: string) {
  const prefix = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase() || "USER";
  return `${prefix}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function isSecureCookie() {
  return (process.env.APP_URL ?? "").startsWith("https://");
}
