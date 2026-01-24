import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow setup, auth, and static routes
  if (
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/setup" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/change-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check if setup is actually needed by querying the database
  let setupNeeded = false;
  try {
    const users = await db.query.user.findMany();
    setupNeeded = users.length === 0;
  } catch (error) {
    console.error("Error checking if setup is needed:", error);
    // If we can't check the database, allow the request through
  }

  if (setupNeeded && !pathname.startsWith("/api")) {
    // Setup not completed, redirect to setup on non-API routes
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  // For non-API routes, check if user is authenticated
  if (!pathname.startsWith("/api")) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        // No valid session, redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } catch (error) {
      console.error("Error checking session in middleware:", error);
      // On error, redirect to login for safety
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
