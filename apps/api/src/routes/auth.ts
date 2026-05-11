import type { FastifyInstance } from "fastify";
import {
  appUrl,
  clearSession,
  createOAuthState,
  createSession,
  exchangeGoogleCodeForUser,
  getCurrentUser,
  googleRedirectUri,
  publicUser,
  upsertOAuthUser,
  validateOAuthState
} from "../lib/auth.js";

type CallbackQuery = {
  code?: string;
  state?: string;
  error?: string;
};

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/session", async (request) => {
    const user = await getCurrentUser(request);
    return { user: publicUser(user), demo: !request.cookies?.shippy_session && process.env.ALLOW_DEMO_AUTH !== "false" };
  });

  app.get("/auth/google", async (_request, reply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
      return reply.code(501).send({ message: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    }

    const state = createOAuthState(reply);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", googleRedirectUri());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "select_account");

    return reply.redirect(url.toString());
  });

  app.get<{ Querystring: CallbackQuery }>("/auth/google/callback", async (request, reply) => {
    if (request.query.error) {
      return reply.redirect(appUrl(`/dashboard?auth_error=${encodeURIComponent(request.query.error)}`));
    }

    if (!request.query.code || !request.query.state || !validateOAuthState(request, reply, request.query.state)) {
      return reply.redirect(appUrl("/dashboard?auth_error=invalid_oauth_state"));
    }

    try {
      const googleUser = await exchangeGoogleCodeForUser(request.query.code);
      const user = await upsertOAuthUser(googleUser);
      await createSession(reply, user.id);
      return reply.redirect(appUrl("/dashboard"));
    } catch (error) {
      request.log.error(error);
      return reply.redirect(appUrl("/dashboard?auth_error=oauth_failed"));
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    await clearSession(request, reply);
    return { ok: true };
  });
}
