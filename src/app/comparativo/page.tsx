"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Trophy,
  AlertTriangle,
  Star,
  Globe,
  Phone,
  Copy,
  Check,
  Send,
  ArrowUpDown,
  ExternalLink,
  MessageSquare,
  Flame,
  Kanban,
  Building2,
  Users,
  BarChart3,
  Loader2,
  CheckSquare,
  Square,
  Radio,
  Target,
  Pencil,
} from "lucide-react";
import { ComparisonCardExport } from "@/components/ComparisonCardExport";
import { saveProspectsAction } from "@/services/prospects.actions";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { sanitizeInstagramHandle } from "@/lib/instagram";
import { generateSalesPitch } from "@/lib/sales-pitch";
import type { CompetitorItem, BenchmarkMetrics } from "@/types";

type SortField = "reviews" | "rating" | "website";
type SortDirection = "asc" | "desc";

export default function ComparativoPage() {
  const [nicho, setNicho] = useState("Dentistas");
  const [cidade, setCidade] = useState("São Paulo - SP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [competitors, setCompetitors] = useState<CompetitorItem[]>([]);
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);

  // Seleção explícita de Empresa A (Prospect) e Empresa B (Benchmark Líder)
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [benchmarkId, setBenchmarkId] = useState<string | null>(null);

  // Seleção múltipla para envio em massa ao Funil
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>("reviews");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [pitchCopied, setPitchCopied] = useState(false);
  const [savingToCrm, setSavingToCrm] = useState(false);
  const [crmSuccessMessage, setCrmSuccessMessage] = useState<string | null>(null);

  // Modal para edição/inserção de Instagram de um concorrente
  const [editingInstagram, setEditingInstagram] = useState<{
    placeId: string;
    name: string;
    handle: string;
  } | null>(null);
  const [instagramInput, setInstagramInput] = useState("");

  const openEditInstagram = (placeId: string, name: string, currentHandle?: string | null) => {
    setEditingInstagram({ placeId, name, handle: currentHandle || "" });
    setInstagramInput(currentHandle || "");
  };

  const handleSaveInstagram = () => {
    if (!editingInstagram) return;
    const clean = sanitizeInstagramHandle(instagramInput);
    setCompetitors((prev) =>
      prev.map((c) =>
        c.place_id === editingInstagram.placeId ? { ...c, instagram: clean } : c
      )
    );
    setEditingInstagram(null);
  };

  // Executa busca inicial ou ao submeter formulário
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nicho.trim() || !cidade.trim()) return;

    setLoading(true);
    setError(null);
    setCrmSuccessMessage(null);

    try {
      const res = await fetch("/api/places/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nicho.trim(), city: cidade.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao consultar concorrentes no Google Places.");
      }

      const items: CompetitorItem[] = data.competitors || [];
      setCompetitors(items);
      setMetrics(data.metrics || null);

      if (items.length > 0) {
        // Encontra o concorrente com maior número de reviews para ser o Benchmark por padrão
        const highestReviewsItem = [...items].sort(
          (a, b) => b.user_ratings_total - a.user_ratings_total
        )[0];

        // Define a primeira linha como Prospect (ou a segunda se a primeira for o próprio líder)
        const defaultProspect =
          items[0].place_id === highestReviewsItem.place_id && items.length > 1
            ? items[1]
            : items[0];

        setBenchmarkId(highestReviewsItem.place_id);
        setProspectId(defaultProspect.place_id);
        setSelectedIds(new Set());
      } else {
        setBenchmarkId(null);
        setProspectId(null);
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error("[ComparativoPage] Erro:", err);
      setError(err instanceof Error ? err.message : "Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Ordenação interativa da tabela
  const sortedCompetitors = useMemo(() => {
    const list = [...competitors];
    list.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

      if (sortField === "reviews") {
        valA = a.user_ratings_total;
        valB = b.user_ratings_total;
      } else if (sortField === "rating") {
        valA = a.rating;
        valB = b.rating;
      } else if (sortField === "website") {
        valA = a.has_website ? 1 : 0;
        valB = b.has_website ? 1 : 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [competitors, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Seleção de Leads para Envio em Massa
  const toggleSelectAll = () => {
    if (selectedIds.size === competitors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(competitors.map((c) => c.place_id)));
    }
  };

  const toggleSelectRow = (placeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  // Objetos selecionados: Prospect (Empresa A) e Benchmark (Empresa B)
  const prospectBusiness = useMemo(() => {
    return competitors.find((c) => c.place_id === prospectId) || competitors[0] || null;
  }, [competitors, prospectId]);

  const benchmarkBusiness = useMemo(() => {
    return (
      competitors.find((c) => c.place_id === benchmarkId) ||
      metrics?.marketLeader ||
      competitors[0] ||
      null
    );
  }, [competitors, benchmarkId, metrics]);

  // Gerador dinâmico de pitch comercial persuasivo comparando Empresa A e Empresa B (EssMendes Tecnologia)
  const dynamicSalesPitch = useMemo(() => {
    if (!prospectBusiness || !benchmarkBusiness) return "";

    const isSame = prospectBusiness.place_id === benchmarkBusiness.place_id;
    const deficit = isSame
      ? 0
      : Math.max(
          0,
          benchmarkBusiness.user_ratings_total - prospectBusiness.user_ratings_total
        );

    return generateSalesPitch({
      targetName: prospectBusiness.name,
      cityName: cidade,
      targetRating: prospectBusiness.rating,
      targetReviews: prospectBusiness.user_ratings_total,
      targetHasWebsite: prospectBusiness.has_website,
      leaderName: benchmarkBusiness.name,
      leaderReviews: benchmarkBusiness.user_ratings_total,
      deficit,
    });
  }, [prospectBusiness, benchmarkBusiness, cidade]);

  const handleCopyPitch = async () => {
    if (!dynamicSalesPitch) return;
    try {
      await navigator.clipboard.writeText(dynamicSalesPitch);
      setPitchCopied(true);
      setTimeout(() => setPitchCopied(false), 2500);
    } catch (err) {
      console.error("Erro ao copiar pitch:", err);
    }
  };

  // Bulk CRM Action: Enviar Selecionados para o Funil de Prospecção
  const handleSendToCrm = async () => {
    if (selectedIds.size === 0) return;
    setSavingToCrm(true);
    setCrmSuccessMessage(null);

    try {
      const selectedLeads = competitors
        .filter((c) => selectedIds.has(c.place_id))
        .map((comp) => {
          const isLeader =
            !benchmarkBusiness ||
            comp.user_ratings_total >= benchmarkBusiness.user_ratings_total;
          const leadDeficit = isLeader
            ? 0
            : Math.max(
                0,
                benchmarkBusiness.user_ratings_total - comp.user_ratings_total
              );
          const leaderReviews =
            benchmarkBusiness?.user_ratings_total || comp.user_ratings_total;

          const leadPitch = generateSalesPitch({
            targetName: comp.name,
            cityName: cidade,
            targetRating: comp.rating,
            targetReviews: comp.user_ratings_total,
            targetHasWebsite: comp.has_website,
            leaderName: benchmarkBusiness?.name,
            leaderReviews,
            deficit: leadDeficit,
          });

          return {
            place_id: comp.place_id,
            name: comp.name,
            category: nicho,
            city: cidade,
            formatted_address: comp.formatted_address,
            phone: comp.formatted_phone_number || comp.phone || undefined,
            website: comp.website,
            has_website: comp.has_website,
            rating: comp.rating,
            total_reviews: comp.user_ratings_total,
            reviews_count: comp.user_ratings_total,
            review_deficit: leadDeficit,
            leader_reviews_count: leaderReviews,
            pitch_generated: leadPitch,
            instagram: comp.instagram || null,
          };
        });

      const res = await saveProspectsAction(selectedLeads);

      if (!res.success) {
        throw new Error(res.error || "Falha ao salvar prospects no Supabase.");
      }

      setCrmSuccessMessage(
        `🎉 ${res.count || selectedLeads.length} leads enviados com sucesso para o Funil de Prospecção!`
      );
      setSelectedIds(new Set());
    } catch (err) {
      console.error("[handleSendToCrm] Erro:", err);
      alert(err instanceof Error ? err.message : "Erro ao enviar leads para o funil.");
    } finally {
      setSavingToCrm(false);
    }
  };

  const rawTargetDigits = (
    prospectBusiness?.formatted_phone_number ||
    prospectBusiness?.phone ||
    ""
  ).replace(/\D/g, "");

  const targetWaPhone =
    rawTargetDigits.length > 0
      ? rawTargetDigits.startsWith("55")
        ? rawTargetDigits
        : `55${rawTargetDigits}`
      : "";

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white pb-24">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO DO SAAS */}
      <header className="sticky top-0 z-40 bg-[#14151f]/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-black text-white shadow-lg shadow-purple-600/30">
              GL
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Gestor Local
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  SaaS Pro
                </span>
              </span>
              <p className="text-[11px] text-slate-400">Inteligência de Mercado &amp; Prospecção Local</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/comparativo"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white flex items-center gap-1.5 shadow-sm"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Comparativo</span>
            </Link>

            <Link
              href="/prospeccao"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0b0c10] hover:bg-slate-800 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
            >
              <Kanban className="w-3.5 h-3.5 text-emerald-400" />
              <span>Funil de Prospecção</span>
            </Link>

            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0b0c10] hover:bg-slate-800 text-slate-400 border border-slate-800 transition hidden sm:flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6">
        {/* FORMULÁRIO DE BUSCA NO GOOGLE PLACES */}
        <section className="bg-[#14151f] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nicho / Categoria
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nicho}
                  onChange={(e) => setNicho(e.target.value)}
                  placeholder="Ex: Dentistas, Oficinas, Barbearias..."
                  required
                  className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Cidade / Região
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Ex: São Paulo - SP, Moema, Campinas..."
                  required
                  className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Buscando...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Analisar</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {crmSuccessMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{crmSuccessMessage}</span>
              </div>
              <Link
                href="/prospeccao"
                className="font-bold underline hover:text-white transition text-xs"
              >
                Acessar Funil Kanban →
              </Link>
            </div>
          )}
        </section>

        {/* TOP METRICS BANNER (DARK THEME) */}
        {metrics && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#14151f] p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Analisado
                </p>
                <p className="text-2xl font-black text-white">{metrics.totalCompetitors}</p>
                <span className="text-[10px] text-slate-500">Top concorrentes no Google</span>
              </div>
            </div>

            <div className="bg-[#14151f] p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Star className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Nota Média
                </p>
                <p className="text-2xl font-black text-white">{metrics.avgRating} ★</p>
                <span className="text-[10px] text-slate-500">Média geral da região</span>
              </div>
            </div>

            <div className="bg-[#14151f] p-4 rounded-2xl border border-slate-800 shadow-md flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Média de Reviews
                </p>
                <p className="text-2xl font-black text-white">{metrics.avgReviews}</p>
                <span className="text-[10px] text-slate-500">Avaliações por empresa</span>
              </div>
            </div>

            <div className="bg-[#14151f] p-4 rounded-2xl border border-red-500/30 shadow-md flex items-center gap-3.5 bg-gradient-to-br from-[#14151f] to-red-950/20">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                  Empresas Sem Site
                </p>
                <p className="text-2xl font-black text-red-300">
                  {metrics.withoutWebsiteCount}
                </p>
                <span className="text-[10px] text-red-400/80">Oportunidades imediatas de venda</span>
              </div>
            </div>
          </section>
        )}

        {/* CONTROLES ATIVOS DE SELEÇÃO DUAL A & B */}
        {competitors.length > 0 && prospectBusiness && benchmarkBusiness && (
          <section className="bg-[#14151f] p-4 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
              <div className="text-xs">
                <span className="text-slate-400">Empresa A (Prospect): </span>
                <strong className="text-purple-300 font-black">{prospectBusiness.name}</strong>
                <span className="text-slate-500 ml-1">
                  ({prospectBusiness.user_ratings_total} reviews • {prospectBusiness.rating}★)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <div className="text-xs">
                <span className="text-slate-400">Empresa B (Benchmark Líder): </span>
                <strong className="text-emerald-300 font-black">{benchmarkBusiness.name}</strong>
                <span className="text-slate-500 ml-1">
                  ({benchmarkBusiness.user_ratings_total} reviews • {benchmarkBusiness.rating}★)
                </span>
              </div>
            </div>
          </section>
        )}

        {/* LAYOUT EM 2 COLUNAS: TABELA DE CONCORRENTES & PAINEL DIREITO */}
        {competitors.length > 0 && prospectBusiness && benchmarkBusiness ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA: TABELA DE CONCORRENTES */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#14151f] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                      Concorrentes no Google Maps ({competitors.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Use os seletores para definir Empresa A (Prospect) e Empresa B (Benchmark)
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    Clique nas colunas para ordenar
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#0b0c10] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-8 text-center">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="text-slate-400 hover:text-white"
                            title="Selecionar Todos para o Funil"
                          >
                            {selectedIds.size === competitors.length ? (
                              <CheckSquare className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="p-3">Empresa</th>
                        <th
                          onClick={() => handleSort("reviews")}
                          className="p-3 cursor-pointer hover:text-white transition select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>Reviews</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("rating")}
                          className="p-3 cursor-pointer hover:text-white transition select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>Nota</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort("website")}
                          className="p-3 cursor-pointer hover:text-white transition select-none"
                        >
                          <div className="flex items-center gap-1">
                            <span>Website</span>
                            <ArrowUpDown className="w-3 h-3 text-slate-500" />
                          </div>
                        </th>
                        <th className="p-3">Instagram</th>
                        <th className="p-3 text-center">Definir A / B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sortedCompetitors.map((item, idx) => {
                        const isProspect = item.place_id === prospectBusiness.place_id;
                        const isBenchmark = item.place_id === benchmarkBusiness.place_id;
                        const isSelected = selectedIds.has(item.place_id);

                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          item.name + " " + (item.formatted_address || "")
                        )}&query_place_id=${item.place_id}`;

                        return (
                          <tr
                            key={item.place_id}
                            className={`transition-colors ${
                              isProspect && isBenchmark
                                ? "bg-indigo-950/40 border-l-4 border-l-indigo-500"
                                : isProspect
                                ? "bg-purple-950/40 border-l-4 border-l-purple-500"
                                : isBenchmark
                                ? "bg-emerald-950/30 border-l-4 border-l-emerald-500"
                                : "hover:bg-slate-800/40"
                            }`}
                          >
                            {/* Checkbox de seleção para o Funil */}
                            <td
                              className="p-3 text-center cursor-pointer"
                              onClick={(e) => toggleSelectRow(item.place_id, e)}
                            >
                              <button type="button" className="text-slate-400 hover:text-white">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-purple-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600" />
                                )}
                              </button>
                            </td>

                            {/* Nome & Endereço com Link direto para Google Maps */}
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isBenchmark && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                    B: BENCHMARK
                                  </span>
                                )}
                                {isProspect && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                    A: PROSPECT
                                  </span>
                                )}
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`font-bold truncate max-w-[180px] hover:underline inline-flex items-center gap-1 group/link ${
                                    isProspect
                                      ? "text-purple-300"
                                      : isBenchmark
                                      ? "text-emerald-300"
                                      : "text-white"
                                  }`}
                                  title="Abrir no Google Maps"
                                >
                                  <span className="truncate">{item.name}</span>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition shrink-0 text-slate-400" />
                                </a>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate max-w-[220px] mt-0.5">
                                {item.formatted_address || "Endereço não informado"}
                              </p>
                            </td>

                            {/* Reviews */}
                            <td className="p-3 font-semibold text-slate-200">
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                                <span>{item.user_ratings_total}</span>
                              </div>
                            </td>

                            {/* Nota */}
                            <td className="p-3">
                              <div className="flex items-center gap-1 font-bold text-amber-400">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                <span>{item.rating ? item.rating.toFixed(1) : "0.0"}</span>
                              </div>
                            </td>

                            {/* Website Clicável */}
                            <td className="p-3">
                              {item.has_website && item.website ? (
                                <a
                                  href={
                                    item.website.startsWith("http")
                                      ? item.website
                                      : `https://${item.website}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-950/80 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition"
                                  title={`Abrir website: ${item.website}`}
                                >
                                  <Globe className="w-3 h-3 shrink-0 text-emerald-400" />
                                  <span className="truncate max-w-[75px]">Site Oficial</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-950/80 border border-red-700 text-red-300">
                                  <AlertTriangle className="w-3 h-3 shrink-0 text-red-400" />
                                  Sem Site
                                </span>
                              )}
                            </td>

                            {/* Coluna Instagram */}
                            <td className="p-3">
                              {item.instagram ? (
                                <div className="flex items-center gap-1">
                                  <a
                                    href={`https://instagram.com/${item.instagram}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-pink-950/80 border border-pink-700/60 text-pink-300 hover:bg-pink-900 transition"
                                    title={`Abrir perfil: @${item.instagram}`}
                                  >
                                    <InstagramIcon className="w-3 h-3 text-pink-400 shrink-0" />
                                    <span className="truncate max-w-[75px]">@{item.instagram}</span>
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditInstagram(item.place_id, item.name, item.instagram);
                                    }}
                                    className="p-1 rounded text-slate-500 hover:text-slate-300 transition"
                                    title="Editar Instagram"
                                  >
                                    <Pencil className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditInstagram(item.place_id, item.name, "");
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#0b0c10] border border-slate-800 text-slate-400 hover:text-white hover:border-pink-500/40 transition"
                                  title="Adicionar Instagram"
                                >
                                  <InstagramIcon className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span>+ Instagram</span>
                                </button>
                              )}
                            </td>

                            {/* BOTOES RADIO PARA DEFINIR EMPRESA A OU B */}
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5 bg-[#0b0c10] p-1 rounded-lg border border-slate-800">
                                {/* Botão Definir A */}
                                <button
                                  type="button"
                                  onClick={() => setProspectId(item.place_id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-black transition ${
                                    isProspect
                                      ? "bg-purple-600 text-white shadow-sm"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                  title="Definir como Empresa A (Prospect)"
                                >
                                  A (Alvo)
                                </button>

                                {/* Botão Definir B */}
                                <button
                                  type="button"
                                  onClick={() => setBenchmarkId(item.place_id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-black transition ${
                                    isBenchmark
                                      ? "bg-emerald-600 text-white shadow-sm"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                  title="Definir como Empresa B (Benchmark Líder)"
                                >
                                  B (Líder)
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: PAINEL DE PITCH DE VENDAS & COMPARISONCARDEXPORT */}
            <div className="lg:col-span-5 space-y-4">
              {/* CAIXA DE SCRIPT COMERCIAL PERSUASIVO */}
              <div className="bg-[#14151f] p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Script Comercial Personalizado
                    </h3>
                  </div>

                  <button
                    onClick={handleCopyPitch}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                      pitchCopied
                        ? "bg-emerald-600 text-white"
                        : "bg-purple-600 hover:bg-purple-500 text-white"
                    }`}
                  >
                    {pitchCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Pitch Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Pitch</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={dynamicSalesPitch}
                    rows={12}
                    className="w-full bg-[#0b0c10] border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed resize-none focus:outline-none"
                  />
                </div>

                {targetWaPhone && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      {prospectBusiness.formatted_phone_number || prospectBusiness.phone}
                    </span>

                    <a
                      href={`https://wa.me/${targetWaPhone}?text=${encodeURIComponent(
                        dynamicSalesPitch
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Abrir no WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* EMBEDDED COMPARISONCARDEXPORT (DUAL & SINGLE VISUAL ASSETS) */}
              <div className="bg-[#14151f] p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Gerador de Imagens 1080x1080
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Ctrl+V no WhatsApp Web</span>
                </div>

                <ComparisonCardExport
                  key={`export-card-${prospectBusiness.place_id}-${benchmarkBusiness.place_id}`}
                  target={prospectBusiness}
                  leader={benchmarkBusiness}
                  city={cidade}
                  category={nicho}
                  cityAvgRating={metrics?.avgRating}
                  cityAvgReviews={metrics?.avgReviews}
                  salesPitch={dynamicSalesPitch}
                />
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="text-center py-16 bg-[#14151f] rounded-2xl border border-slate-800/80 p-8 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Nenhum benchmark realizado ainda</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Digite o nicho e a cidade desejada acima e clique em &quot;Analisar&quot; para puxar
                dados reais e detalhados do Google Places.
              </p>
            </div>
          )
        )}
      </main>

      {/* BARRA FIXA STICKY PARA ENVIO SELECIONADOS AO FUNIL DE PROSPECÇÃO */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-[#14151f]/95 backdrop-blur-md border-t border-purple-500/40 p-4 shadow-2xl animate-in slide-in-from-bottom">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500 flex items-center justify-center text-purple-300 font-black text-sm">
                {selectedIds.size}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {selectedIds.size} {selectedIds.size === 1 ? "Lead Selecionado" : "Leads Selecionados"}
                </h4>
                <p className="text-xs text-slate-400">
                  Pronto para inclusão imediata no pipeline de vendas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Limpar Seleção
              </button>

              <button
                type="button"
                disabled={savingToCrm}
                onClick={handleSendToCrm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/40 transition active:scale-95 disabled:opacity-50"
              >
                {savingToCrm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cadastrando no Supabase...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Selecionados para o Funil de Prospecção</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA INSERÇÃO / EDIÇÃO RÁPIDA DE INSTAGRAM */}
      {editingInstagram && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEditingInstagram(null)}
        >
          <div
            className="bg-[#14151f] border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                  <InstagramIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Instagram do Estabelecimento</h4>
                  <p className="text-xs text-slate-400 truncate max-w-[260px]">
                    {editingInstagram.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingInstagram(null)}
                className="text-slate-400 hover:text-white text-base px-2 py-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveInstagram();
              }}
              className="space-y-4 pt-1"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Perfil ou Link do Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                    @
                  </span>
                  <input
                    type="text"
                    value={instagramInput}
                    onChange={(e) => setInstagramInput(e.target.value)}
                    placeholder="ex: clinica_sorriso ou instagram.com/clinica_sorriso"
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Você pode colar o @usuário ou o link direto do perfil.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingInstagram(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-600/30 transition active:scale-95"
                >
                  Salvar Instagram
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
