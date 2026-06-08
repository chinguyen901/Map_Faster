import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

const PUBLIC_ROUTES = ["/login", "/register", "/verify-otp", "/forgot-password", "/reset-password"];
const API_AUTH_ROUTES = ["/api/auth/register", "/api/auth/verify-otp", "/api/auth/login",
  "/api/auth/forgot-password", "/api/auth/reset-password"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public auth routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();
  if (API_AUTH_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();

  // Check JWT
  const token = req.cookies.get("auth-token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await verifyJWT(token);
  if (!user) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("auth-token");
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|icon\\.svg|manifest\\.json|apple-touch-icon\\.png|icon-192\\.png|icon-512\\.png).*)",
  ],
};
