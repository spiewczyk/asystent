import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, expectedToken } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Publiczne ścieżki
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token && token === (await expectedToken())) {
    return NextResponse.next();
  }

  // Niezalogowany -> ekran logowania (dla API zwróć 401)
  if (pathname.startsWith("/api/")) {
    return new NextResponse(JSON.stringify({ error: "Brak autoryzacji" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
