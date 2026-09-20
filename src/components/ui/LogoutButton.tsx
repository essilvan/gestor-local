"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
}

export function LogoutButton({ className = "", showText = true }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      // Força a limpeza e redireciona com atualização completa de sessão
      router.refresh();
      window.location.href = "/login";
    } catch (err) {
      console.error("[LogoutButton] Erro ao deslogar:", err);
      window.location.href = "/login";
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      title="Sair do sistema (Logout)"
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0b0c10] hover:bg-red-500/15 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group ${className}`}
    >
      {isLoggingOut ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
      ) : (
        <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-400 transition-colors" />
      )}
      {showText && (
        <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
      )}
    </button>
  );
}
