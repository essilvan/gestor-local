"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carrega preferências de "Lembrar-me" salvas localmente
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem("essmendes_remember_me");
      const savedEmail = localStorage.getItem("essmendes_remember_email");
      if (savedRemember === "true" && savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignora erro se localStorage não estiver disponível
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // Validação inicial dos campos
    if (!cleanEmail || !cleanPassword) {
      setErrorMessage("Por favor, preencha todos os campos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Por favor, informe um endereço de e-mail válido.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        console.error("[LoginPage] Falha no Supabase signInWithPassword:", error);
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("invalid_credentials") ||
          error.status === 400
        ) {
          setErrorMessage("Email ou senha inválidos. Verifique suas credenciais.");
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMessage("E-mail ainda não confirmado. Verifique sua caixa de entrada.");
        } else {
          setErrorMessage(error.message || "Erro na autenticação. Tente novamente.");
        }
        setIsLoading(false);
        return;
      }

      if (data?.session) {
        // Gerencia preferência de "Lembrar-me"
        try {
          if (rememberMe) {
            localStorage.setItem("essmendes_remember_me", "true");
            localStorage.setItem("essmendes_remember_email", cleanEmail);
          } else {
            localStorage.removeItem("essmendes_remember_me");
            localStorage.removeItem("essmendes_remember_email");
          }
        } catch {
          // ignora falha de storage
        }

        // Determina destino seguro de redirecionamento
        let targetDestination = "/prospeccao";
        if (
          redirectParam &&
          redirectParam.startsWith("/") &&
          !redirectParam.startsWith("//") &&
          redirectParam !== "/login"
        ) {
          targetDestination = redirectParam;
        }

        // Força atualização da árvore de rotas e redireciona
        router.refresh();
        window.location.href = targetDestination;
      } else {
        setErrorMessage("Sessão não iniciada. Verifique suas credenciais e tente novamente.");
        setIsLoading(false);
      }
    } catch (err: unknown) {
      console.error("[LoginPage] Exceção durante o login:", err);
      const msg = err instanceof Error ? err.message : "Erro inesperado ao conectar ao servidor.";
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-600 selection:text-white">
      {/* Luzes de Fundo Ambientais (Glow) */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[150px]" />

      {/* Grid Textura Sutil */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1f2430_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

      {/* Card Glassmorphic Centralizado */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800/90 bg-[#14151f]/80 p-7 sm:p-9 shadow-2xl shadow-black/80 backdrop-blur-xl">
        {/* CABEÇALHO */}
        <div className="flex flex-col items-center text-center">
          {/* Logo EssMendes */}
          <div className="mb-4 relative">
            <div className="relative p-1 rounded-2xl bg-gradient-to-b from-slate-700/40 to-transparent">
              <Image
                src="/images/logo-essmendes.png"
                alt="EssMendes Tecnologia"
                width={190}
                height={55}
                priority
                className="h-11 sm:h-12 w-auto object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]"
              />
            </div>
          </div>

          {/* Badge Gestor Local PRO */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 shadow-sm shadow-emerald-950/50">
            <Sparkles className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span>Gestor Local PRO</span>
          </div>

          {/* Nome da Marca e Título */}
          <h1 className="mt-4 text-xl sm:text-2xl font-black tracking-tight text-white">
            EssMendes Tecnologia
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 max-w-xs leading-relaxed">
            Painel exclusivo de Inteligência de Mercado, Auditoria de Busca &amp; Prospecção Local.
          </p>
        </div>

        {/* NOTIFICAÇÃO DE ERRO (RED BANNER) */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200 backdrop-blur-sm animate-in fade-in-50 duration-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <span className="font-bold text-red-300 block">Falha na autenticação</span>
              <p className="mt-0.5 text-red-200/90 leading-normal">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* FORMULÁRIO DE LOGIN */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* Campo E-mail */}
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              E-mail corporativo
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="seu.email@essmendes.com.br"
                className="block w-full rounded-xl border border-slate-700/80 bg-[#0b0c10]/90 py-2.5 pl-10 pr-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 transition"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-300"
              >
                Senha de acesso
              </label>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••••••"
                className="block w-full rounded-xl border border-slate-700/80 bg-[#0b0c10]/90 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Ocultar senha" : "Ver senha"}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Lembrar-me */}
          <div className="flex items-center justify-between pt-1">
            <label
              htmlFor="rememberMe"
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-slate-200 cursor-pointer select-none"
            >
              <div className="relative flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded-md border border-slate-600 bg-[#0b0c10] transition checked:border-emerald-500 checked:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                />
                <Check className="pointer-events-none absolute left-0.5 top-0.5 h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
              </div>
              <span className="font-medium text-slate-300">Lembrar-me</span>
            </label>

            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" />
              Sessão protegida
            </span>
          </div>

          {/* Botão Entrar no Sistema */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-500 shadow-lg shadow-emerald-950/50 border border-emerald-500/30 transition-all duration-200 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Entrando no Sistema...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Rodapé do Card */}
        <div className="mt-7 pt-5 border-t border-slate-800/80 flex flex-col items-center gap-2 text-center text-[11px] text-slate-400">
          <div>
            Ainda não possui acesso autorizado?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline underline-offset-4 transition"
            >
              Solicitar credenciais
            </Link>
          </div>
          <p className="text-[10px] text-slate-500">
            &copy; {new Date().getFullYear()} EssMendes Tecnologia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginLoadingFallback() {
  return (
    <div className="min-h-screen w-full bg-[#0b0c10] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#14151f]/80 p-8 flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <p className="text-xs text-slate-400">Carregando painel de acesso seguro...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
