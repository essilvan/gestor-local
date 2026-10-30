"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  Copy,
  Download,
  Check,
  Star,
  AlertTriangle,
  Trophy,
  ShieldCheck,
  Loader2,
  MapPin,
  FileText,
  Layers,
  MessageSquare,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Phone,
} from "lucide-react";
import type { CompetitorItem } from "@/types";
import { generateSalesPitch } from "@/lib/sales-pitch";

interface ComparisonCardExportProps {
  target: CompetitorItem;
  leader: CompetitorItem;
  city?: string;
  category?: string;
  cityAvgRating?: number;
  cityAvgReviews?: number;
  salesPitch?: string;
}

export function ComparisonCardExport({
  target,
  leader,
  city = "sua região",
  category = "seu nicho",
  cityAvgRating = 4.7,
  cityAvgReviews = 180,
  salesPitch,
}: ComparisonCardExportProps) {
  const [activeTab, setActiveTab] = useState<"dual" | "single">("dual");

  // Refs dos dois cards 1080x1080
  const dualCardRef = useRef<HTMLDivElement>(null);
  const singleCardRef = useRef<HTMLDivElement>(null);

  // Estados locais para strings Base64 puras (data URI inline)
  const [targetBase64, setTargetBase64] = useState<string | null>(null);
  const [leaderBase64, setLeaderBase64] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  // Estados de cópia e download
  const [copyingDual, setCopyingDual] = useState(false);
  const [copyingSingle, setCopyingSingle] = useState(false);
  const [copiedUnifiedDual, setCopiedUnifiedDual] = useState(false);
  const [copiedUnifiedSingle, setCopiedUnifiedSingle] = useState(false);
  const [copiedTextDual, setCopiedTextDual] = useState(false);
  const [copiedTextSingle, setCopiedTextSingle] = useState(false);
  const [downloadingDual, setDownloadingDual] = useState(false);
  const [downloadingSingle, setDownloadingSingle] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const targetPhoto = target.photo_url || (target as unknown as { photoUrl?: string }).photoUrl;
  const leaderPhoto = leader.photo_url || (leader as unknown as { photoUrl?: string }).photoUrl;

  const deficit = Math.max(0, leader.user_ratings_total - target.user_ratings_total);
  const isTargetTheLeader = target.place_id === leader.place_id || deficit === 0;

  // Estimativa data-driven de contatos perdidos por mês
  const lostContactsPerMonth = useMemo(() => {
    if (isTargetTheLeader) return 0;
    const baseLost = Math.round(deficit * 0.25);
    const websitePenalty = target.has_website ? 0 : 35;
    const total = baseLost + websitePenalty;
    return Math.max(28, Math.min(total, 450));
  }, [deficit, isTargetTheLeader, target.has_website]);

  // Telefone formatado para link direto de WhatsApp
  const targetWaPhone = useMemo(() => {
    const raw = target.formatted_phone_number || target.phone || "";
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) return null;
    return cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
  }, [target.formatted_phone_number, target.phone]);

  // Pitch comercial de alta conversão
  const outreachPitch = useMemo(() => {
    if (salesPitch) return salesPitch;
    return generateSalesPitch({
      targetName: target.name,
      cityName: city,
      targetRating: target.rating,
      targetReviews: target.user_ratings_total,
      targetHasWebsite: target.has_website,
      leaderName: leader.name,
      leaderReviews: leader.user_ratings_total,
      deficit,
    });
  }, [salesPitch, target, leader, city, deficit]);

  useEffect(() => {
    let isMounted = true;
    setTargetBase64(null);
    setLeaderBase64(null);

    const fetchImageBase64 = async (photoUrl: string | null | undefined): Promise<string | null> => {
      if (!photoUrl) return null;
      if (photoUrl.startsWith("data:")) return photoUrl;

      try {
        const fullUrl = photoUrl.startsWith("//") ? `https:${photoUrl}` : photoUrl;
        const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(fullUrl)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.dataUri || null;
      } catch (err) {
        console.error("Erro ao converter foto para base64:", err);
        return null;
      }
    };

    const loadBoth = async () => {
      if (!targetPhoto && !leaderPhoto) return;
      setLoadingImages(true);
      const [tBase, lBase] = await Promise.all([
        fetchImageBase64(targetPhoto),
        fetchImageBase64(leaderPhoto),
      ]);
      if (isMounted) {
        setTargetBase64(tBase);
        setLeaderBase64(lBase);
        setLoadingImages(false);
      }
    };

    loadBoth();

    return () => {
      isMounted = false;
    };
  }, [targetPhoto, leaderPhoto, target.place_id, leader.place_id]);

  const isTargetLoading = Boolean(targetPhoto && !targetBase64);
  const isLeaderLoading = Boolean(leaderPhoto && !leaderBase64);
  const isImageLoading = loadingImages || isTargetLoading || isLeaderLoading;

  // Aguarda fontes e carregamento de todas as imagens antes de rasterizar o canvas
  const prepareCardForExport = async (cardElement: HTMLElement) => {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(cardElement.querySelectorAll("img"));
    if (images.length > 0) {
      await Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalWidth !== 0) {
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            const onFinish = () => {
              img.removeEventListener("load", onFinish);
              img.removeEventListener("error", onFinish);
              resolve();
            };
            img.addEventListener("load", onFinish);
            img.addEventListener("error", onFinish);
          });
        })
      );
    }

    // Intervalo de segurança para estabilização de renderização
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  const exportOptions = {
    pixelRatio: 2, // Resolução nítida para telas de alta densidade
    filter: (_node: HTMLElement) => true,
    backgroundColor: "#080b11",
  };

  // Copiar Imagem para o Clipboard (Ctrl+V no WhatsApp)
  const handleCopyUnified = async (cardElement: HTMLDivElement | null, isDual: boolean) => {
    if (!cardElement) return;
    if (isImageLoading) {
      setErrorMessage("Aguarde o carregamento das fotos para copiar.");
      return;
    }
    if (isDual) setCopyingDual(true);
    else setCopyingSingle(true);
    setErrorMessage(null);

    try {
      await prepareCardForExport(cardElement);

      const blob = await toBlob(cardElement, exportOptions);
      if (!blob) throw new Error("Falha ao gerar o blob da imagem.");

      if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);

        if (isDual) {
          setCopiedUnifiedDual(true);
          setTimeout(() => setCopiedUnifiedDual(false), 3000);
        } else {
          setCopiedUnifiedSingle(true);
          setTimeout(() => setCopiedUnifiedSingle(false), 3000);
        }

        setToastMessage(
          "Imagem do relatório copiada! No WhatsApp, cole com Ctrl+V. Use a mensagem rápida abaixo para iniciar a conversa:"
        );
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `auditoria-posicionamento-${target.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Erro ao copiar imagem:", err);
      setErrorMessage("Erro ao copiar imagem para o clipboard. Utilize o botão 'Baixar PNG'.");
    } finally {
      if (isDual) setCopyingDual(false);
      else setCopyingSingle(false);
    }
  };

  // Copiar Somente o Texto da Abordagem
  const handleCopyTextOnly = async (isDual = true) => {
    try {
      await navigator.clipboard.writeText(outreachPitch);
      if (isDual) {
        setCopiedTextDual(true);
        setTimeout(() => setCopiedTextDual(false), 3000);
      } else {
        setCopiedTextSingle(true);
        setTimeout(() => setCopiedTextSingle(false), 3000);
      }
      setToastMessage("Script de abordagem copiado com sucesso!");
    } catch (err) {
      console.error("Erro ao copiar texto:", err);
      setErrorMessage("Erro ao copiar texto da abordagem.");
    }
  };

  // Download do arquivo PNG em alta resolução
  const handleDownload = async (cardElement: HTMLDivElement | null, isDual: boolean) => {
    if (!cardElement) return;
    if (isImageLoading) {
      setErrorMessage("Aguarde o carregamento das fotos para baixar.");
      return;
    }
    if (isDual) setDownloadingDual(true);
    else setDownloadingSingle(true);
    setErrorMessage(null);

    try {
      await prepareCardForExport(cardElement);

      const dataUrl = await toPng(cardElement, exportOptions);

      const link = document.createElement("a");
      link.download = `auditoria-${isDual ? "comparativo-duplo" : "raio-x-individual"}-${target.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao baixar imagem:", err);
      setErrorMessage("Não foi possível gerar o download da imagem.");
    } finally {
      if (isDual) setDownloadingDual(false);
      else setDownloadingSingle(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* SELETOR DE ABAS ENTRE OS FORMATOS VISUAIS */}
      <div className="flex items-center justify-between w-full bg-[#0b0e17] p-1.5 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("dual")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
            activeTab === "dual"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Auditoria Comparativa (Lado a Lado)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
            activeTab === "single"
              ? "bg-purple-600 text-white shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Diagnóstico Individual (Snapshot)</span>
        </button>
      </div>

      {errorMessage && (
        <div className="w-full p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* MODAL / TOAST DE FEEDBACK COM SCRIPT E AÇÕES */}
      {toastMessage && (
        <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#121626] via-[#10192e] to-[#0c121e] border border-purple-500/40 text-white shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white">{toastMessage}</p>
                <p className="text-[11px] text-slate-300">
                  Dica: Cole o print do relatório no chat com{" "}
                  <kbd className="bg-purple-950 px-1.5 py-0.5 rounded text-purple-200 border border-purple-700/60 font-mono text-[10px]">
                    Ctrl+V
                  </kbd>{" "}
                  e envie a mensagem de curiosidade em seguida para engajar o responsável.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-xs"
              title="Fechar aviso"
            >
              ✕
            </button>
          </div>

          {/* Script de Abordagem Pronto para Cópia ou WhatsApp Direto */}
          <div className="bg-[#080b11] p-3 rounded-xl border border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="text-xs text-slate-300 font-mono line-clamp-2 max-w-xl">
              &quot;{outreachPitch.replace(/\n+/g, " ").slice(0, 160)}...&quot;
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => handleCopyTextOnly(activeTab === "dual")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedTextDual || copiedTextSingle
                    ? "Copiado!"
                    : "Copiar Texto"}
                </span>
              </button>

              {targetWaPhone && (
                <a
                  href={`https://wa.me/${targetWaPhone}?text=${encodeURIComponent(outreachPitch)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: CARD COMPARATIVO DUPLO 1080x1080 (AUDITORIA EXECUTIVA)             */}
      {/* ========================================================================= */}
      {activeTab === "dual" && (
        <div className="w-full flex flex-col items-center space-y-3">
          {/* BARRA DE BOTÕES DE EXPORTAÇÃO */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-[#101422] p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              <span>Auditoria Executiva 1080x1080</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* BOTÃO PRIMÁRIO: COPIAR IMAGEM */}
              <button
                type="button"
                onClick={() => handleCopyUnified(dualCardRef.current, true)}
                disabled={copyingDual || isImageLoading}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
                  copiedUnifiedDual
                    ? "bg-emerald-600 text-white"
                    : isImageLoading
                    ? "bg-purple-900/50 text-purple-300 cursor-not-allowed opacity-80"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-95 shadow-purple-600/30"
                }`}
                title="Copiar Imagem e preparar abordagem para colar no WhatsApp"
              >
                {copyingDual || isImageLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiedUnifiedDual ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-purple-200" />
                )}
                <span>
                  {copiedUnifiedDual
                    ? "Imagem Copiada!"
                    : isImageLoading
                    ? "Processando..."
                    : "Copiar Imagem (Ctrl+V)"}
                </span>
              </button>

              {/* BOTÃO SECUNDÁRIO: COPIAR SCRIPT */}
              <button
                type="button"
                onClick={() => handleCopyTextOnly(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                  copiedTextDual
                    ? "bg-emerald-800/80 text-white border-emerald-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="Copiar o script comercial curto de curiosidade"
              >
                {copiedTextDual ? (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedTextDual ? "Script Copiado!" : "Copiar Script"}</span>
              </button>

              {/* BOTÃO TERCIÁRIO: BAIXAR PNG */}
              <button
                type="button"
                onClick={() => handleDownload(dualCardRef.current, true)}
                disabled={downloadingDual || isImageLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                  isImageLoading
                    ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-80"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="Baixar arquivo PNG em alta resolução (1080x1080)"
              >
                {downloadingDual ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isImageLoading ? "Processando..." : "Baixar PNG"}</span>
              </button>
            </div>
          </div>

          {/* CONTAINER RESPONSIVO DE PREVIEW (SCALE 0.38) */}
          <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#06080e] p-2 flex justify-center shadow-2xl">
            <div
              style={{
                transform: "scale(0.38)",
                transformOrigin: "top center",
                width: "1080px",
                height: "1080px",
                marginBottom: "-660px",
              }}
              className="shrink-0"
            >
              {/* CANVAS REAL 1080x1080 - AUDITORIA DE PRESENÇA LOCAL & GOOGLE MAPS */}
              <div
                ref={dualCardRef}
                key={`export-card-${target.place_id}-${leader.place_id}`}
                style={{
                  width: "1080px",
                  height: "1080px",
                  backgroundColor: "#080b11",
                  backgroundImage:
                    "radial-gradient(circle at 50% 0%, #151d30 0%, #080b11 75%)",
                }}
                className="relative flex flex-col justify-between p-11 text-white select-none box-border border-2 border-slate-700/60 shadow-2xl overflow-hidden font-sans"
              >
                {/* Efeitos Sutis de Fundo Executivo */}
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* 1. TOP HEADER EXECUTIVO */}
                <div className="relative z-10 border-b border-slate-800 pb-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                        RELATÓRIO CONFIDENCIAL • INTELIGÊNCIA COMPETITIVA
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{category} • {city}</span>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <h1 className="text-3xl font-black text-white tracking-tight">
                        AUDITORIA DE PRESENÇA LOCAL &amp; GOOGLE MAPS
                      </h1>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">
                        Diagnóstico executivo de autoridade, visibilidade orgânica e conversão no Google Meu Negócio
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                        REF: {target.place_id ? target.place_id.slice(-6).toUpperCase() : "MAPS-BR"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. GRID COMPARATIVO LADO A LADO (ESQUERDA: PROSPECT vs DIREITA: LÍDER) */}
                <div className="relative z-10 grid grid-cols-2 gap-6 my-auto">
                  {/* COLUNA ESQUERDA: PROSPECT ({target.name}) */}
                  <div className="rounded-3xl bg-[#0f1422] border-2 border-slate-700/80 p-5 flex flex-col justify-between shadow-2xl relative">
                    <div>
                      {/* Badge de Status do Prospect */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          {isTargetTheLeader ? "LÍDER DA REGIÃO" : "OPORTUNIDADE DE CRESCIMENTO / DÉFICIT"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">Perfil Analisado</span>
                      </div>

                      {/* Foto Real de Fachada / Perfil */}
                      <div className="w-full h-36 rounded-2xl overflow-hidden mb-3 bg-slate-900 border border-slate-800 relative">
                        {isTargetLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                            <span className="text-[11px]">Carregando foto...</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={targetBase64 || "/placeholder-store.svg"}
                            alt={target.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1422] via-transparent to-transparent pointer-events-none" />
                      </div>

                      {/* Nome do Prospect */}
                      <div className="mb-4">
                        <h2 className="text-2xl font-black text-white leading-tight min-h-[58px] line-clamp-2">
                          {target.name}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {target.formatted_address || "Endereço verificado no Google Maps"}
                        </p>
                      </div>
                    </div>

                    {/* Métricas Chave do Prospect */}
                    <div className="space-y-2.5">
                      {/* Métrica 1: Avaliações no Google */}
                      <div className="bg-[#090d16] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Avaliações no Google
                          </div>
                          <div className="text-3xl font-black text-white mt-0.5">
                            {target.user_ratings_total}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            {isTargetTheLeader ? "Liderança" : `-${deficit} reviews`}
                          </span>
                        </div>
                      </div>

                      {/* Métrica 2: Nota Média */}
                      <div className="bg-[#090d16] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Nota Média
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-3xl font-black text-amber-400">
                              {target.rating ? target.rating.toFixed(1) : "0.0"}
                            </span>
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i <= Math.round(target.rating || 0)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-800"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-semibold text-slate-400">
                          Escala 0 a 5.0
                        </div>
                      </div>

                      {/* Métrica 3: Estimativa de Contatos Perdidos */}
                      <div className="bg-[#090d16] p-3.5 rounded-2xl border border-rose-500/30 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                            Estimativa de Contatos Perdidos
                          </div>
                          <div className="text-2xl font-black text-rose-400 mt-0.5">
                            {isTargetTheLeader ? "0 / mês" : `~${lostContactsPerMonth} contatos / mês`}
                          </div>
                        </div>
                        <div className="text-right max-w-[140px]">
                          <span className="text-[10px] font-bold text-rose-300/90 leading-tight block">
                            Optam por quem tem mais avaliações
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COLUNA DIREITA: BENCHMARK LÍDER ({leader.name}) */}
                  <div className="rounded-3xl bg-[#0e1724] border-2 border-emerald-500/50 p-5 flex flex-col justify-between shadow-2xl relative">
                    <div>
                      {/* Badge de Status do Líder */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider">
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                          LÍDER DA CATEGORIA
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">Benchmark #1</span>
                      </div>

                      {/* Foto Real de Fachada do Líder */}
                      <div className="w-full h-36 rounded-2xl overflow-hidden mb-3 bg-slate-900 border border-slate-800 relative">
                        {isLeaderLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                            <span className="text-[11px]">Carregando foto...</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={leaderBase64 || "/placeholder-store.svg"}
                            alt={leader.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1724] via-transparent to-transparent pointer-events-none" />
                      </div>

                      {/* Nome do Líder */}
                      <div className="mb-4">
                        <h2 className="text-2xl font-black text-white leading-tight min-h-[58px] line-clamp-2">
                          {leader.name}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {leader.formatted_address || "Endereço verificado no Google Maps"}
                        </p>
                      </div>
                    </div>

                    {/* Métricas Chave do Líder */}
                    <div className="space-y-2.5">
                      {/* Métrica 1: Avaliações no Google */}
                      <div className="bg-[#070e17] p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Avaliações no Google
                          </div>
                          <div className="text-3xl font-black text-emerald-400 mt-0.5">
                            {leader.user_ratings_total}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            Top #1 Categoria
                          </span>
                        </div>
                      </div>

                      {/* Métrica 2: Nota Média */}
                      <div className="bg-[#070e17] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Nota Média
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-3xl font-black text-emerald-400">
                              {leader.rating ? leader.rating.toFixed(1) : "0.0"}
                            </span>
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i <= Math.round(leader.rating || 0)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-800"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-semibold text-emerald-400">
                          Alta Reputação
                        </div>
                      </div>

                      {/* Métrica 3: Conversão Dominante */}
                      <div className="bg-[#070e17] p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                            Captação de Clientes
                          </div>
                          <div className="text-2xl font-black text-emerald-300 mt-0.5">
                            Conversão Máxima
                          </div>
                        </div>
                        <div className="text-right max-w-[140px]">
                          <span className="text-[10px] font-bold text-emerald-400/90 leading-tight block">
                            Concentra maior volume de cliques diretos
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. RODAPÉ EXECUTIVO COM NOTA DE AUDITORIA & CARIMBO ESSMENDES */}
                <div className="relative z-10 border-t border-slate-800 pt-5 flex items-center justify-between">
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>
                        Auditoria técnica de visibilidade local via Google Places API • Relatório executivo para tomada de decisão.
                      </span>
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-black text-white tracking-wide">
                      EssMendes Tecnologia
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: RAIO-X INDIVIDUAL 1080x1080 (SNAPSHOT DO PROSPECT)                 */}
      {/* ========================================================================= */}
      {activeTab === "single" && (
        <div className="w-full flex flex-col items-center space-y-3">
          {/* BARRA DE BOTÕES DE EXPORTAÇÃO */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-[#101422] p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Snapshot Individual 1080x1080</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyUnified(singleCardRef.current, false)}
                disabled={copyingSingle || isImageLoading}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md ${
                  copiedUnifiedSingle
                    ? "bg-emerald-600 text-white"
                    : isImageLoading
                    ? "bg-purple-900/50 text-purple-300 cursor-not-allowed opacity-80"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-95 shadow-purple-600/30"
                }`}
                title="Copiar Imagem e preparar abordagem para colar no WhatsApp"
              >
                {copyingSingle || isImageLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiedUnifiedSingle ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-purple-200" />
                )}
                <span>
                  {copiedUnifiedSingle
                    ? "Imagem Copiada!"
                    : isImageLoading
                    ? "Processando..."
                    : "Copiar Imagem (Ctrl+V)"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyTextOnly(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                  copiedTextSingle
                    ? "bg-emerald-800/80 text-white border-emerald-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="Copiar o script comercial curto de curiosidade"
              >
                {copiedTextSingle ? (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedTextSingle ? "Script Copiado!" : "Copiar Script"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownload(singleCardRef.current, false)}
                disabled={downloadingSingle || isImageLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                  isImageLoading
                    ? "bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed opacity-80"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="Baixar arquivo PNG em alta resolução (1080x1080)"
              >
                {downloadingSingle ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isImageLoading ? "Processando..." : "Baixar PNG"}</span>
              </button>
            </div>
          </div>

          {/* PREVIEW CONTAINER RESPONSIVO (SCALE 0.38) */}
          <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#06080e] p-2 flex justify-center shadow-2xl">
            <div
              style={{
                transform: "scale(0.38)",
                transformOrigin: "top center",
                width: "1080px",
                height: "1080px",
                marginBottom: "-660px",
              }}
              className="shrink-0"
            >
              {/* O NÓ REAL 1080x1080 - DIAGNÓSTICO INDIVIDUAL */}
              <div
                ref={singleCardRef}
                key={`export-card-single-${target.place_id}`}
                style={{
                  width: "1080px",
                  height: "1080px",
                  backgroundColor: "#080b11",
                  backgroundImage:
                    "radial-gradient(circle at 50% 10%, #171d33 0%, #080b11 75%)",
                }}
                className="relative flex flex-col justify-between p-11 text-white select-none box-border border-2 border-indigo-500/40 shadow-2xl overflow-hidden font-sans"
              >
                {/* CABEÇALHO COM A FOTO E ENDEREÇO DA EMPRESA */}
                <div className="relative z-10 border-b border-slate-800 pb-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                        AUDITORIA DE PRESENÇA LOCAL &amp; GOOGLE MAPS
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{city}</span>
                    </div>
                  </div>

                  {/* Banner / Foto de Fachada com Selo de Auditoria */}
                  <div className="relative w-full h-52 rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-xl">
                    {isTargetLoading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        <span className="text-xs font-semibold">Processando foto do Google...</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={targetBase64 || "/placeholder-store.svg"}
                        alt={target.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-4 right-4 bg-[#0e1422]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2 shadow-lg z-20">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black text-white">Google Maps Audit</span>
                    </div>
                  </div>

                  {/* Nome e Endereço */}
                  <div>
                    <h1 className="text-3xl font-black text-white leading-tight">
                      {target.name}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{target.formatted_address || "Endereço verificado no Google"}</span>
                    </p>
                  </div>
                </div>

                {/* DIAGNÓSTICO EM 3 CARDS EXECUTIVOS */}
                <div className="relative z-10 grid grid-cols-3 gap-6 my-auto">
                  {/* Card 1: Avaliações & Reputação */}
                  <div className="bg-[#0f1422] p-6 rounded-3xl border-2 border-slate-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Reputação no Google
                      </span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-amber-400">
                          {target.rating ? target.rating.toFixed(1) : "0.0"}
                        </span>
                        <span className="text-sm text-slate-400">/ 5.0</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                      <div>
                        Volume: <strong className="text-white">{target.user_ratings_total} reviews</strong>
                      </div>
                      <div
                        className={`font-bold ${
                          target.rating >= cityAvgRating ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {target.rating >= cityAvgRating
                          ? "✓ Acima da média local"
                          : "⚠️ Abaixo da média local"}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Gap vs Líder */}
                  <div className="bg-[#0f1422] p-6 rounded-3xl border-2 border-amber-600/40 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                        Déficit vs Líder
                      </span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-white">
                          {target.user_ratings_total}
                        </span>
                        <span className="text-sm text-slate-400">vs {leader.user_ratings_total}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                      <div>
                        Líder: <strong className="text-emerald-400">{leader.name}</strong>
                      </div>
                      <div className="font-bold text-amber-300">
                        {isTargetTheLeader
                          ? "🏆 Empresa #1 em volume"
                          : `📉 Déficit de -${deficit} avaliações`}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Impacto Comercial (Contatos Perdidos) */}
                  <div className="bg-[#0f1422] p-6 rounded-3xl border-2 border-rose-500/40 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-300">
                        Contatos Perdidos
                      </span>
                      <div className="text-3xl font-black text-rose-400 mt-2 leading-tight">
                        {isTargetTheLeader ? "0 / mês" : `~${lostContactsPerMonth}`}
                      </div>
                      <span className="text-xs text-rose-300/80">clientes / mês</span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
                      <span>Estimativa de clientes que optam por concorrentes com maior prova social.</span>
                    </div>
                  </div>
                </div>

                {/* RODAPÉ DO RAIO-X INDIVIDUAL */}
                <div className="relative z-10 border-t border-slate-800 pt-5 flex items-center justify-between">
                  <div className="text-xs text-slate-300 max-w-md">
                    Auditoria executiva confidencial gerada para apoio em expansão comercial e autoridade no Google.
                  </div>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-lg">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black text-white tracking-wide">
                      EssMendes Tecnologia
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
