import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../[...nextauth]/route";
import { PrismaAuthRepository } from "@/core/auth/infrastructure/PrismaAuthRepository";
import { signAuthToken, getAuthCookieName, getCsrfCookieName } from "@/core/auth/auth-server";
import { createCsrfToken } from "@/core/auth/csrf";
import { cookies } from "next/headers";

const DEFAULT_COMPANY_ID = "05cb4cc6-c215-4d41-84b3-98c6013cda27";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10;

export async function GET(request: Request) {
  try {
    let email: string | undefined;

    const session = await getServerSession(authOptions);
    console.log("[Google Auth Success] retrieved session:", session);

    if (session?.user?.email) {
      email = session.user.email;
    } else {
      console.log("[Google Auth Success] getServerSession returned null, trying getToken fallback...");
      const token = await getToken({
        req: request as any,
        secret: process.env.AUTH_SECRET,
      });
      console.log("[Google Auth Success] retrieved JWT token:", token);
      if (token?.email) {
        email = token.email;
      }
    }

    if (!email) {
      console.warn("[Google Auth Success] session/token not found or empty. Redirecting to login.");
      return NextResponse.redirect(new URL("/login?error=session_expired", request.url));
    }

    const normalizedEmail = email.trim().toLowerCase();
    const repo = new PrismaAuthRepository();
    const dbUser = await repo.findUserByIdentifier(normalizedEmail);

    if (!dbUser) {
      console.warn(`[Google Auth Success] user not found in database for email: ${normalizedEmail}`);
      return NextResponse.redirect(new URL("/login?error=not_registered", request.url));
    }

    if (!dbUser.is_active) {
      console.warn(`[Google Auth Success] user is inactive in database: ${normalizedEmail}`);
      return NextResponse.redirect(new URL("/login?error=inactive", request.url));
    }

    await repo.updateLastLoginAt(dbUser.id);

    const tenantId = dbUser.company_id || DEFAULT_COMPANY_ID;

    const tokenPayload = await signAuthToken({
      userId: dbUser.id,
      tenantId,
      email: dbUser.email ?? undefined,
    });

    const csrfToken = createCsrfToken();

    // Use sameSite: "lax" to ensure the browser sends the session cookies on the cross-site redirect
    // back from Google's servers to /main_dashboard. "strict" blocks cookies on redirects.
    const cookieOpts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE_MAX_AGE,
    };

    const cookieStore = await cookies();
    cookieStore.set(getAuthCookieName(), tokenPayload, cookieOpts);
    cookieStore.set(getCsrfCookieName(), csrfToken, { ...cookieOpts, httpOnly: false });

    console.log(`[Google Auth Success] Successfully set cookies via cookies() with SameSite=Lax. Redirecting user ${normalizedEmail} to /main_dashboard.`);
    return NextResponse.redirect(new URL("/main_dashboard", request.url));
  } catch (err) {
    console.error("[Google Auth Success] Critical error in handler:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
