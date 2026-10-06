import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readToken } from "@/lib/token";

/**
 * Première barrière (rapide, sans base de données) : /admin exige un JWT admin, /account un JWT valide.
 * La vraie autorisation est refaite côté serveur à chaque appel API et dans le layout admin.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await readToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (session?.role !== "admin") {
      // Ne révèle pas l'existence de l'admin à un utilisateur non admin.
      return session ? NextResponse.rewrite(new URL("/not-found", req.url)) : NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  // L'administrateur n'a accès qu'à son dashboard : pas de panier, de commande ni d'espace client.
  if (session?.role === "admin" && /^\/(cart|checkout|account|login|register)(\/|$)/.test(pathname)) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  if (pathname.startsWith("/account") && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  if (pathname.startsWith("/admin")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/cart", "/checkout/:path*", "/login", "/register"] };
