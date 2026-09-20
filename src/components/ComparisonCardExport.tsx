"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  Copy,
  Download,
  Check,
  Star,
  Globe,
  AlertTriangle,
  Zap,
  TrendingDown,
  Trophy,
  ShieldCheck,
  Building2,
  Sparkles,
  Loader2,
  MapPin,
  Flame,
  FileText,
  Layers,
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

  // Feedback unificado de cópia e mensagem
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
  const isTargetTheLeader = target.place_id === leader.place_id;

  // Pitch comercial persuasivo unificado para acompanhar o criativo
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
    pixelRatio: 2, // Sharp 1080x1080 resolution
    filter: (_node: HTMLElement) => true,
    backgroundColor: "#0b0c10",
  };

  // Ação Unificada: Copiar Imagem + Mensagem
  const handleCopyUnified = async (cardElement: HTMLDivElement | null, isDual: boolean) => {
    if (!cardElement) return;
    if (isImageLoading) {
      setErrorMessage("Aguarde o carregamento das fotos para copiar.");
      return;
    }
    if (isDual) setCopiedUnifiedDual(true);
    else setCopiedUnifiedSingle(true);
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
          "Imagem copiada! No WhatsApp, cole a imagem com Ctrl+V. O texto da proposta foi copiado para usar como legenda."
        );
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${isDual ? "comparativo-duplo" : "raio-x"}-${target.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Erro ao copiar imagem:", err);
      setErrorMessage("Erro ao copiar imagem. Utilize 'Baixar PNG'.");
    } finally {
      if (isDual) setCopiedUnifiedDual(false);
      else setCopiedUnifiedSingle(false);
    }
  };

  // Ação Secundária: Copiar Somente Texto da Legenda / Proposta
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
      setToastMessage("Texto da proposta copiado para a área de transferência!");
    } catch (err) {
      console.error("Erro ao copiar texto:", err);
      setErrorMessage("Erro ao copiar texto da proposta.");
    }
  };

  // Função genérica para download de PNG
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
      link.download = `${isDual ? "comparativo-duplo" : "raio-x-individual"}-${target.name
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
      {/* SELETOR DE ABAS ENTRE OS DOIS ASSETS VISUAIS */}
      <div className="flex items-center justify-between w-full bg-[#0b0c10] p-1.5 rounded-xl border border-slate-800">
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
          <span>Card Comparativo Duplo</span>
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
          <span>Raio-X Individual (Snapshot)</span>
        </button>
      </div>

      {errorMessage && (
        <div className="w-full p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* TOAST / MODAL TOOLTIP INFORMATIVO DE CÓPIA UNIFICADA */}
      {toastMessage && (
        <div className="w-full p-3.5 rounded-xl bg-gradient-to-r from-purple-950/90 via-[#151329] to-[#0f1422] border border-purple-500/50 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 shadow-inner mt-0.5 sm:mt-0">
              <Sparkles className="w-4 h-4 text-purple-300" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{toastMessage}</span>
              </p>
              <p className="text-[11px] text-slate-300">
                Cole a imagem direto no chat com{" "}
                <kbd className="bg-purple-900/80 px-1.5 py-0.5 rounded text-purple-200 border border-purple-600/60 font-mono text-[10px]">
                  Ctrl+V
                </kbd>{" "}
                e use a proposta como legenda ou mensagem direta.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleCopyTextOnly(activeTab === "dual")}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>
                {copiedTextDual || copiedTextSingle
                  ? "Texto Copiado!"
                  : "Copiar Somente Texto"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-xs"
              title="Fechar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: CARD COMPARATIVO DUPLO (1080x1080)                                */}
      {/* ========================================================================= */}
      {activeTab === "dual" && (
        <div className="w-full flex flex-col items-center space-y-3">
          {/* BARRA DE BOTÕES DO CARD DUPLO */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-[#14151f] p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Asset A: 1080x1080 Dual</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* BOTÃO PRIMÁRIO: COPIAR IMAGEM + MENSAGEM */}
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
                title="Copiar Imagem e preparar proposta para colar no WhatsApp"
              >
                {copyingDual || isImageLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiedUnifiedDual ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                )}
                <span>
                  {copiedUnifiedDual
                    ? "Imagem Copiada!"
                    : isImageLoading
                    ? "Carregando Fotos..."
                    : "Copiar Imagem + Mensagem"}
                </span>
              </button>

              {/* BOTÃO SECUNDÁRIO: COPIAR SOMENTE TEXTO */}
              <button
                type="button"
                onClick={() => handleCopyTextOnly(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                  copiedTextDual
                    ? "bg-emerald-800/80 text-white border-emerald-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="Copiar apenas o texto do script comercial para a legenda"
              >
                {copiedTextDual ? (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedTextDual ? "Texto Copiado!" : "Copiar Somente Texto"}</span>
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

          {/* PREVIEW CONTAINER RESPONSIVO (SCALE 0.38) */}
          <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#07080b] p-2 flex justify-center shadow-2xl">
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
              {/* O NÓ REAL 1080x1080 - CARD DUPLO */}
              <div
                ref={dualCardRef}
                key={`export-card-${target.place_id}-${leader.place_id}`}
                style={{
                  width: "1080px",
                  height: "1080px",
                  backgroundColor: "#0b0c10",
                  backgroundImage:
                    "radial-gradient(circle at 50% 0%, #1c1836 0%, #0b0c10 75%)",
                }}
                className="relative flex flex-col justify-between p-12 text-white select-none box-border border-4 border-purple-500/30 shadow-2xl"
              >
                {/* Luzes de Fundo */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* CABEÇALHO */}
                <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/40">
                      <Flame className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-purple-400 bg-purple-950/80 border border-purple-800/80 px-3 py-1 rounded-full">
                          GESTOR LOCAL • AUDITORIA GOOGLE MAPS
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          {category}
                        </span>
                      </div>
                      <h1 className="text-3xl font-black text-white mt-1">
                        Disputa de Mercado &amp; Visibilidade Local
                      </h1>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400">Região</span>
                    <p className="text-xl font-bold text-white uppercase tracking-wider">
                      {city}
                    </p>
                  </div>
                </div>

                {/* LADO A LADO: PROSPECT VS BENCHMARK LÍDER */}
                <div className="relative z-10 grid grid-cols-11 gap-6 my-auto items-stretch">
                  {/* COLUNA ESQUERDA: PROSPECT (EMPRESA ALVO) */}
                  <div className="col-span-5 rounded-3xl bg-[#14151f] border-2 border-red-500/40 p-6 flex flex-col justify-between shadow-2xl">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          EMPRESA ALVO (PROSPECT)
                        </span>
                        <span className="text-xs text-slate-500 font-mono">Status Atual</span>
                      </div>

                      {/* Foto Real / Fachada do Prospect */}
                      <div
                        key={`container-target-${target.place_id || target.name}-${targetPhoto}`}
                        className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-slate-900 border border-slate-800 relative"
                      >
                        {isTargetLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                            <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
                            <span className="text-xs">Processando foto...</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`target-${target.place_id || target.name}-${targetPhoto}`}
                            src={targetBase64 || "/placeholder-store.svg"}
                            alt={target.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#14151f] via-transparent to-transparent pointer-events-none" />
                      </div>

                      {/* Nome da Empresa Alvo */}
                      <h2 className="text-2xl font-black text-white leading-tight min-h-[56px] line-clamp-2">
                        {target.name}
                      </h2>
                    </div>

                    {/* Métricas do Prospect */}
                    <div className="space-y-3 my-4">
                      {/* Rating e Reviews */}
                      <div className="bg-[#0b0c10] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-amber-400">
                            {target.rating ? target.rating.toFixed(1) : "0.0"}
                          </span>
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i <= Math.round(target.rating || 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-700"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-300">
                          {target.user_ratings_total} avaliações
                        </span>
                      </div>

                      {/* Status Website */}
                      <div
                        className={`p-3.5 rounded-2xl border ${
                          target.has_website
                            ? "bg-slate-900 border-slate-700 text-slate-300"
                            : "bg-red-950/70 border-red-600 text-red-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {target.has_website ? (
                            <Globe className="w-5 h-5 text-indigo-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                          )}
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider">
                              Website
                            </div>
                            <div className="text-sm font-bold">
                              {target.has_website
                                ? "Website Ativo"
                                : "🚨 Sem Website / Perda de Clientes"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Déficit vs Líder */}
                      <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-600/50 flex items-center gap-2.5">
                        <TrendingDown className="w-5 h-5 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                            Déficit Competitivo
                          </div>
                          <div className="text-sm font-bold text-amber-200">
                            {isTargetTheLeader
                              ? "🏆 Atualmente liderando a região"
                              : `📉 Déficit de -${deficit} avaliações`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MEIO: VS */}
                  <div className="col-span-1 flex flex-col items-center justify-center my-auto">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center font-black text-xl text-white shadow-xl shadow-purple-600/50 border border-purple-400/40">
                      VS
                    </div>
                  </div>

                  {/* COLUNA DIREITA: BENCHMARK LÍDER */}
                  <div className="col-span-5 rounded-3xl bg-[#14151f] border-2 border-emerald-500/50 p-6 flex flex-col justify-between shadow-2xl">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                          BENCHMARK LÍDER (#1)
                        </span>
                        <span className="text-xs text-emerald-400 font-bold">Liderança</span>
                      </div>

                      {/* Foto Real / Fachada do Líder */}
                      <div
                        key={`container-leader-${leader.place_id || leader.name}-${leaderPhoto}`}
                        className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-slate-900 border border-slate-800 relative"
                      >
                        {isLeaderLoading ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                            <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
                            <span className="text-xs">Processando foto...</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={`leader-${leader.place_id || leader.name}-${leaderPhoto}`}
                            src={leaderBase64 || "/placeholder-store.svg"}
                            alt={leader.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#14151f] via-transparent to-transparent pointer-events-none" />
                      </div>

                      {/* Nome do Líder */}
                      <h2 className="text-2xl font-black text-white leading-tight min-h-[56px] line-clamp-2">
                        {leader.name}
                      </h2>
                    </div>

                    {/* Métricas do Líder */}
                    <div className="space-y-3 my-4">
                      {/* Rating e Reviews */}
                      <div className="bg-[#0b0c10] p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-emerald-400">
                            {leader.rating ? leader.rating.toFixed(1) : "0.0"}
                          </span>
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i <= Math.round(leader.rating || 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-700"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm font-black text-emerald-400">
                          {leader.user_ratings_total} avaliações
                        </span>
                      </div>

                      {/* Website Ativo */}
                      <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 flex items-center gap-2.5">
                        <Globe className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                            Presença Digital
                          </div>
                          <div className="text-sm font-bold text-white">
                            🌐 Website Ativo &amp; Otimizado
                          </div>
                        </div>
                      </div>

                      {/* Agendamento Imediato */}
                      <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-500 text-indigo-200 flex items-center gap-2.5">
                        <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
                        <div>
                          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                            Conversão Direta
                          </div>
                          <div className="text-sm font-bold text-white">
                            ⚡ Agendamento Imediato Ativo
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RODAPÉ DO CARD DUPLO COM AVISO DE PERDA E CARIMBO ESSMENDES */}
                <div className="relative z-10 border-t border-slate-800 pt-6 flex items-center justify-between">
                  <div className="max-w-xl">
                    <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      Estimativa de Perda: Até 70% dos clientes que buscam no Google Maps
                      fecham com quem possui mais avaliações e agendamento direto.
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-950 border border-purple-700/60">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black text-white tracking-wide">
                        EssMendes Tecnologia
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: RAIO-X INDIVIDUAL DO PROSPECT (1080x1080)                          */}
      {/* ========================================================================= */}
      {activeTab === "single" && (
        <div className="w-full flex flex-col items-center space-y-3">
          {/* BARRA DE BOTÕES DO RAIO-X INDIVIDUAL */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full bg-[#14151f] p-3 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-400" />
              <span>Asset B: 1080x1080 Raio-X Individual</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* BOTÃO PRIMÁRIO: COPIAR IMAGEM + MENSAGEM */}
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
                title="Copiar Imagem e preparar proposta para colar no WhatsApp"
              >
                {copyingSingle || isImageLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : copiedUnifiedSingle ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                )}
                <span>
                  {copiedUnifiedSingle
                    ? "Imagem Copiada!"
                    : isImageLoading
                    ? "Carregando Fotos..."
                    : "Copiar Imagem + Mensagem"}
                </span>
              </button>

              {/* BOTÃO SECUNDÁRIO: COPIAR SOMENTE TEXTO */}
              <button
                type="button"
                onClick={() => handleCopyTextOnly(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                  copiedTextSingle
                    ? "bg-emerald-800/80 text-white border-emerald-500"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                }`}
                title="Copiar apenas o texto do script comercial para a legenda"
              >
                {copiedTextSingle ? (
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{copiedTextSingle ? "Texto Copiado!" : "Copiar Somente Texto"}</span>
              </button>

              {/* BOTÃO TERCIÁRIO: BAIXAR PNG */}
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
          <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#07080b] p-2 flex justify-center shadow-2xl">
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
              {/* O NÓ REAL 1080x1080 - RAIO-X INDIVIDUAL */}
              <div
                ref={singleCardRef}
                key={`export-card-${target.place_id}-${leader.place_id}`}
                style={{
                  width: "1080px",
                  height: "1080px",
                  backgroundColor: "#0b0c10",
                  backgroundImage:
                    "radial-gradient(circle at 50% 10%, #201a45 0%, #0b0c10 75%)",
                }}
                className="relative flex flex-col justify-between p-12 text-white select-none box-border border-4 border-indigo-500/30 shadow-2xl"
              >
                {/* CABEÇALHO COM A FOTO E ENDEREÇO DA EMPRESA */}
                <div className="relative z-10 border-b border-slate-800 pb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-widest">
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                      AUDITORIA DIGITAL INDIVIDUAL
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                      <span>{city}</span>
                    </div>
                  </div>

                  {/* Banner / Foto de Fachada com Badge do Google Maps */}
                  <div
                    key={`container-single-target-${target.place_id || target.name}-${targetPhoto}`}
                    className="relative w-full h-56 rounded-3xl overflow-hidden bg-slate-900 border-2 border-slate-700 shadow-xl"
                  >
                    {isTargetLoading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        <span className="text-xs font-semibold">Processando foto do Google...</span>
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`single-target-${target.place_id || target.name}-${targetPhoto}`}
                        src={targetBase64 || "/placeholder-store.svg"}
                        alt={target.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] via-transparent to-transparent pointer-events-none" />

                    {/* Selo do Google Maps no Topo da Imagem */}
                    <div className="absolute top-4 right-4 bg-[#14151f]/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2 shadow-lg z-20">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
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
                      <span>{target.formatted_address || "Endereço registrado na região"}</span>
                    </p>
                  </div>
                </div>

                {/* DIAGNÓSTICO RÁPIDO EM 3 CARDS DE ALTO IMPACTO */}
                <div className="relative z-10 grid grid-cols-3 gap-6 my-auto">
                  {/* Card 1: Nota vs Média da Cidade */}
                  <div className="bg-[#14151f] p-6 rounded-3xl border-2 border-slate-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Reputação vs Cidade
                      </span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-amber-400">
                          {target.rating ? target.rating.toFixed(1) : "0.0"}
                        </span>
                        <span className="text-sm text-slate-400">/ 5.0</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                      <div>
                        Média da Cidade: <strong className="text-white">{cityAvgRating} ★</strong>
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

                  {/* Card 2: Review Gap (Déficit vs Líder) */}
                  <div className="bg-[#14151f] p-6 rounded-3xl border-2 border-amber-600/40 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                        Volume &amp; Gap de Reviews
                      </span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-black text-white">
                          {target.user_ratings_total}
                        </span>
                        <span className="text-sm text-slate-400">avaliações</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 space-y-1">
                      <div>
                        Líder Local:{" "}
                        <strong className="text-emerald-400">
                          {leader.user_ratings_total} reviews
                        </strong>
                      </div>
                      <div className="font-bold text-amber-300">
                        {isTargetTheLeader
                          ? "🏆 Empresa #1 em volume"
                          : `📉 Déficit de -${deficit} avaliações`}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Missing Website Alert */}
                  <div
                    className={`p-6 rounded-3xl border-2 shadow-xl flex flex-col justify-between ${
                      target.has_website
                        ? "bg-[#14151f] border-slate-800"
                        : "bg-red-950/60 border-red-600"
                    }`}
                  >
                    <div>
                      <span
                        className={`text-[11px] font-black uppercase tracking-wider ${
                          target.has_website ? "text-slate-400" : "text-red-400"
                        }`}
                      >
                        {target.has_website ? "Canal Digital" : "Alerta Crítico"}
                      </span>
                      <div className="text-xl font-black text-white mt-2 leading-tight">
                        {target.has_website
                          ? "Website Ativo"
                          : "🚨 Sem Website Cadastrado"}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
                      {target.has_website ? (
                        <span>Canal de agendamento registrado no Google Meu Negócio.</span>
                      ) : (
                        <span className="text-red-200 font-bold">
                          Perda imediata de leads para quem tem link de reserva e WhatsApp.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* RODAPÉ DO RAIO-X */}
                <div className="relative z-10 border-t border-slate-800 pt-6 flex items-center justify-between">
                  <div className="text-xs text-slate-400 max-w-md">
                    Relatório confidencial de inteligência competitiva gerado para suporte em
                    expansão de vendas e posicionamento local.
                  </div>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-purple-950/90 border border-purple-700/60 shadow-lg">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
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
