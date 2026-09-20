import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware do EssMendes Local:
 * 1. Protege rotas administrativas (/admin e /super-admin) com autenticação Supabase
 * 2. Faz o roteamento transparente de subdomínios multi-tenant:
 *    - oficina-do-joao.essmendes.com.br -> /[slug]
 *    - oficina-do-joao.localhost:3000 -> /[slug]
 * 3. Preserva domínio principal, preview no Vercel e rotas do sistema
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const rawHostname = request.headers.get("host") || "";
  const hostname = rawHostname.toLowerCase();
  const hostWithoutPort = hostname.split(":")[0];

  // 1. Ignorar arquivos estáticos, rotas internas do Next.js, API e dashboard do Gestor Local
  if (
    url.pathname === "/" ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/comparativo") ||
    url.pathname.startsWith("/prospeccao") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Proteção de Autenticação para /admin e /super-admin
  if (url.pathname.startsWith("/super-admin") || url.pathname.startsWith("/admin")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", url.pathname);

    let response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            });
            cookiesToSet.forEach(
              ({ name, value, options }: { name: string; value: string; options?: any }) =>
                response.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Se não autenticado, redireciona para login com parâmetro de retorno
      if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", url.pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    return response;
  }

  // 3. Rotas do sistema que nunca devem sofrer rewrite de subdomínio
  const isSystemRoute =
    url.pathname === "/" ||
    url.pathname.startsWith("/login") ||
    url.pathname.startsWith("/register") ||
    url.pathname.startsWith("/diagnostico") ||
    url.pathname.startsWith("/comparativo") ||
    url.pathname.startsWith("/prospeccao") ||
    url.pathname.startsWith("/api");

  if (isSystemRoute) {
    return NextResponse.next();
  }

  // 4. Verificação de Domínio Raiz / Aplicação Principal
  const isRootDomain =
    hostWithoutPort === "essmendes.com.br" ||
    hostWithoutPort === "www.essmendes.com.br" ||
    hostWithoutPort === "local.essmendes.com.br" ||
    hostWithoutPort === "app.essmendes.com.br" ||
    hostWithoutPort === "localhost" ||
    hostWithoutPort === "127.0.0.1" ||
    hostWithoutPort.endsWith(".vercel.app");

  if (isRootDomain) {
    return NextResponse.next();
  }

  // 5. Extração do subdomínio (slug do cliente)
  // Exemplo 1: "oficina-do-joao.essmendes.com.br" -> slug: "oficina-do-joao"
  // Exemplo 2 (local): "oficina-do-joao.localhost:3000" -> slug: "oficina-do-joao"
  let slug = "";
  if (hostWithoutPort.endsWith(".localhost")) {
    slug = hostWithoutPort.replace(".localhost", "");
  } else if (hostWithoutPort.endsWith(".essmendes.com.br")) {
    slug = hostWithoutPort.replace(".essmendes.com.br", "");
  } else {
    // Fallback caso venha com porta ou formato alternativo
    let currentHost = hostname.replace(/:\d+$/, "");
    if (currentHost.includes(".essmendes.com.br")) {
      slug = currentHost.replace(".essmendes.com.br", "");
    }
  }

  slug = slug.trim();

  // 6. Se encontrou um subdomínio válido de cliente, reescreve a rota internamente para /[slug]
  if (
    slug &&
    slug !== "app" &&
    slug !== "www" &&
    slug !== "local" &&
    slug !== "admin" &&
    slug !== "super-admin" &&
    slug !== "comparativo" &&
    slug !== "prospeccao"
  ) {
    if (!url.pathname.startsWith(`/${slug}`)) {
      const rewriteUrl = new URL(
        `/${slug}${url.pathname === "/" ? "" : url.pathname}`,
        request.url
      );
      rewriteUrl.search = url.search;
      return NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: request.headers,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica o middleware em todas as rotas exceto:
     * - api (rotas de API)
     * - comparativo, prospeccao (dashboard Gestor Local)
     * - _next/static (arquivos estáticos JS/CSS)
     * - _next/image (otimização de imagens)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|comparativo|prospeccao).*)",
  ],
};
