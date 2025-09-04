import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes
  const publicPaths = ["/api/auth/signup", "/api/auth/login", "/api/auth/logout"];
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // For /api routes, just let them pass. Auth will be handled in the route itself
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Other routes (like pages) can also be allowed
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"], // applies to all api routes
};
