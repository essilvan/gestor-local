import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware do EssMendes Local:
 * 1. Permite caminhos públicos sem autenticação: /login, _next, favicon.ico, arquivos estáticos e imagens públicas
 * 2. Protege rotas do sistema com Supabase Auth: /, /prospeccao, /comparativo, /admin, /super-admin
 * 3. Se usuário não autenticado tentar acessar rota protegida: redireciona para /login?redirect=${pathname}
 * 4. Se usuário autenticado tentar acessar /login: redireciona direto para /prospeccao
 * 5. Mantém o roteamento transparente de subdomínios multi-tenant para vitrines públicas /[slug]
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;
  const rawHostname = request.headers.get("host") || "";
  const hostname = rawHostname.toLowerCase();
  const hostWithoutPort = hostname.split(":")[0];

  // 1. Arquivos estáticos, rotas internas do Next.js, favicon e imagens públicas
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(png|jpe?g|gif|svg|ico|webp|css|js|map|woff2?|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Criação do cliente Supabase SSR no middleware com sincronização de cookies
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let user = null;

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    try {
      // Uso de getUser() para validação criptográfica confiável de token no servidor
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
    } catch (err) {
      console.error("[Middleware] Erro ao validar sessão Supabase:", err);
      user = null;
    }
  }

  // Helper para preservar cookies do Supabase em redirects
  const createRedirectResponse = (targetUrl: URL) => {
    const redirectRes = NextResponse.redirect(targetUrl);
    response.cookies.getAll().forEach((cookie) => {
      redirectRes.cookies.set(cookie.name, cookie.value);
    });
    return redirectRes;
  };

  // 3. Regra: Se usuário AUTENTICADO tentar acessar /login, redireciona para /prospeccao
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (user) {
      const targetUrl = new URL("/prospeccao", request.url);
      return createRedirectResponse(targetUrl);
    }
    return response;
  }

  // 4. Rotas de API mantêm autonomia de autenticação para evitar loops HTML em JSON/Webhooks
  if (pathname.startsWith("/api")) {
    return response;
  }

  // 5. Rotas públicas adicionais
  if (pathname.startsWith("/register") || pathname.startsWith("/diagnostico")) {
    return response;
  }

  // 6. Proteção das rotas da aplicação: /, /prospeccao, /comparativo, /admin, /super-admin
  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/prospeccao") ||
    pathname.startsWith("/comparativo") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin");

  if (isProtectedRoute) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      const fullPath = `${pathname}${url.search || ""}`;
      loginUrl.searchParams.set("redirect", fullPath);
      return createRedirectResponse(loginUrl);
    }
    return response;
  }

  // 7. Roteamento de Subdomínios Multi-Tenant para Vitrines Públicas de Clientes (/[slug])
  const isRootDomain =
    hostWithoutPort === "essmendes.com.br" ||
    hostWithoutPort === "www.essmendes.com.br" ||
    hostWithoutPort === "local.essmendes.com.br" ||
    hostWithoutPort === "app.essmendes.com.br" ||
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1" ||
    hostWithoutPort.endsWith(".vercel.app");

  if (isRootDomain) {
    return response;
  }

  // Extração do subdomínio de cliente
  let slug = "";
  if (hostWithoutPort.endsWith(".localhost")) {
    slug = hostWithoutPort.replace(".localhost", "");
  } else if (hostWithoutPort.endsWith(".essmendes.com.br")) {
    slug = hostWithoutPort.replace(".essmendes.com.br", "");
  } else {
    let currentHost = hostname.replace(/:\d+$/, "");
    if (currentHost.includes(".essmendes.com.br")) {
      slug = currentHost.replace(".essmendes.com.br", "");
    }
  }

  slug = slug.trim();

  // Se subdomínio for válido e não reservado, reescreve internamente para /[slug]
  const reservedSlugs = [
    "app",
    "www",
    "local",
    "admin",
    "super-admin",
    "comparativo",
    "prospeccao",
    "login",
    "register",
    "diagnostico",
    "api",
  ];

  if (slug && !reservedSlugs.includes(slug)) {
    if (!pathname.startsWith(`/${slug}`)) {
      const rewriteUrl = new URL(
        `/${slug}${pathname === "/" ? "" : pathname}`,
        request.url
      );
      rewriteUrl.search = url.search;
      return NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas da aplicação, exceto:
     * - _next/static (arquivos estáticos JS/CSS)
     * - _next/image (otimização de imagens)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
