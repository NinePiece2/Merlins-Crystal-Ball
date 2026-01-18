import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow setup, auth, and static routes
  if (
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/setup" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check if setup is complete via cookie
  const setupComplete = request.cookies.get("setup_complete");

  if (!setupComplete && !pathname.startsWith("/api")) {
    // Setup not marked complete, redirect to setup on non-API routes
    return NextResponse.redirect(new URL("/setup", request.url));
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
