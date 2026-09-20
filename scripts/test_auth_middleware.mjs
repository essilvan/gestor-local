/**
 * Test script for middleware authentication logic in EssMendes Local
 */
import assert from "node:assert";

// Simula validação das regras de caminhos no middleware
function evaluateRouteAccess({ pathname, user }) {
  // 1. Arquivos estáticos e recursos públicos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.(png|jpe?g|gif|svg|ico|webp|css|js|map|woff2?|ttf|eot)$/i.test(pathname)
  ) {
    return { action: "NEXT", destination: pathname };
  }

  // 2. Se autenticado tentando acessar /login -> redireciona para /prospeccao
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (user) {
      return { action: "REDIRECT", destination: "/prospeccao" };
    }
    return { action: "NEXT", destination: pathname };
  }

  // 3. APIs
  if (pathname.startsWith("/api")) {
    return { action: "NEXT", destination: pathname };
  }

  // 4. Rotas públicas adicionais
  if (pathname.startsWith("/register") || pathname.startsWith("/diagnostico")) {
    return { action: "NEXT", destination: pathname };
  }

  // 5. Rotas protegidas
  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/prospeccao") ||
    pathname.startsWith("/comparativo") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/super-admin");

  if (isProtectedRoute) {
    if (!user) {
      return { action: "REDIRECT", destination: `/login?redirect=${pathname}` };
    }
    return { action: "NEXT", destination: pathname };
  }

  // Outros caminhos (ex: vitrine pública de cliente)
  return { action: "NEXT", destination: pathname };
}

console.log("====================================================");
console.log("🧪 TESTES DE REGRAS DE ROTEAMENTO E AUTH DO MIDDLEWARE");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

// 1. Usuário Deslogado (user: null)
test("Deslogado acessando '/' deve redirecionar para /login?redirect=/", () => {
  const res = evaluateRouteAccess({ pathname: "/", user: null });
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/login?redirect=/");
});

test("Deslogado acessando '/prospeccao' deve redirecionar para /login?redirect=/prospeccao", () => {
  const res = evaluateRouteAccess({ pathname: "/prospeccao", user: null });
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/login?redirect=/prospeccao");
});

test("Deslogado acessando '/comparativo' deve redirecionar para /login?redirect=/comparativo", () => {
  const res = evaluateRouteAccess({ pathname: "/comparativo", user: null });
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/login?redirect=/comparativo");
});

test("Deslogado acessando '/admin' deve redirecionar para /login?redirect=/admin", () => {
  const res = evaluateRouteAccess({ pathname: "/admin", user: null });
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/login?redirect=/admin");
});

test("Deslogado acessando '/login' deve ser PERMITIDO (NEXT)", () => {
  const res = evaluateRouteAccess({ pathname: "/login", user: null });
  assert.strictEqual(res.action, "NEXT");
  assert.strictEqual(res.destination, "/login");
});

test("Deslogado acessando recursos estáticos e públicos deve ser PERMITIDO", () => {
  assert.strictEqual(evaluateRouteAccess({ pathname: "/favicon.ico", user: null }).action, "NEXT");
  assert.strictEqual(evaluateRouteAccess({ pathname: "/_next/static/chunk.js", user: null }).action, "NEXT");
  assert.strictEqual(evaluateRouteAccess({ pathname: "/images/logo-essmendes.png", user: null }).action, "NEXT");
  assert.strictEqual(evaluateRouteAccess({ pathname: "/robots.txt", user: null }).action, "NEXT");
  assert.strictEqual(evaluateRouteAccess({ pathname: "/sitemap.xml", user: null }).action, "NEXT");
});

// 2. Usuário Autenticado (user: { id: 'uuid-123' })
const fakeUser = { id: "user-123", email: "teste@essmendes.com.br" };

test("Autenticado acessando '/login' deve redirecionar para /prospeccao", () => {
  const res = evaluateRouteAccess({ pathname: "/login", user: fakeUser });
  assert.strictEqual(res.action, "REDIRECT");
  assert.strictEqual(res.destination, "/prospeccao");
});

test("Autenticado acessando '/' deve ser PERMITIDO (NEXT)", () => {
  const res = evaluateRouteAccess({ pathname: "/", user: fakeUser });
  assert.strictEqual(res.action, "NEXT");
  assert.strictEqual(res.destination, "/");
});

test("Autenticado acessando '/prospeccao' deve ser PERMITIDO (NEXT)", () => {
  const res = evaluateRouteAccess({ pathname: "/prospeccao", user: fakeUser });
  assert.strictEqual(res.action, "NEXT");
  assert.strictEqual(res.destination, "/prospeccao");
});

test("Autenticado acessando '/comparativo' deve ser PERMITIDO (NEXT)", () => {
  const res = evaluateRouteAccess({ pathname: "/comparativo", user: fakeUser });
  assert.strictEqual(res.action, "NEXT");
  assert.strictEqual(res.destination, "/comparativo");
});

test("Autenticado acessando '/admin' deve ser PERMITIDO (NEXT)", () => {
  const res = evaluateRouteAccess({ pathname: "/admin", user: fakeUser });
  assert.strictEqual(res.action, "NEXT");
  assert.strictEqual(res.destination, "/admin");
});

console.log(`\n====================================================`);
console.log(`📊 TOTAL: ${passed} PASSOU | ${failed} FALHOU`);
console.log(`====================================================`);

if (failed > 0) {
  process.exit(1);
}
