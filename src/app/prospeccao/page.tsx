"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Kanban,
  BarChart3,
  Building2,
  Search,
  Plus,
  RefreshCw,
  Phone,
  MessageSquare,
  ExternalLink,
  Star,
  AlertTriangle,
  Globe,
  TrendingDown,
  Trophy,
  CheckCircle2,
  Clock,
  Trash2,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Filter,
  Sparkles,
  Loader2,
  Pencil,
  Eye,
} from "lucide-react";
import {
  getProspectsAction,
  updateProspectStatusAction,
  deleteProspectAction,
  updateProspectInstagramAction,
} from "@/services/prospects.actions";
import { InstagramIcon } from "@/components/ui/InstagramIcon";
import { sanitizeInstagramHandle } from "@/lib/instagram";
import {
  generateSalesPitch,
  getStagePitch,
  STAGE_TEMPLATE_CONFIGS,
} from "@/lib/sales-pitch";
import type { Prospect, ProspectStatus } from "@/types";

const STAGES: {
  id: ProspectStatus;
  title: string;
  templateLabel: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "NOVO",
    title: "1. Novos Leads",
    templateLabel: "Raio-X Diagnóstico",
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
    icon: Sparkles,
  },
  {
    id: "CONTATADO",
    title: "2. Contatados",
    templateLabel: "Apresentação da Plataforma",
    color: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
    icon: MessageSquare,
  },
  {
    id: "EM_NEGOCIACAO",
    title: "3. Em Negociação",
    templateLabel: "Proposta Comercial",
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
    icon: Clock,
  },
  {
    id: "FECHADO",
    title: "4. Fechados",
    templateLabel: "Boas-Vindas & Onboarding",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
    icon: CheckCircle2,
  },
];

export default function ProspeccaoPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [pitchCopiedId, setPitchCopiedId] = useState<string | null>(null);

  // Modal para pré-visualizar o script comercial ativo da etapa
  const [previewPitchLead, setPreviewPitchLead] = useState<Prospect | null>(null);
  const [copiedModalPitch, setCopiedModalPitch] = useState(false);

  // Modal para editar / salvar Instagram no CRM
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [instagramInput, setInstagramInput] = useState("");
  const [savingInstagram, setSavingInstagram] = useState(false);

  const openEditInstagram = (lead: Prospect) => {
    setEditingProspect(lead);
    setInstagramInput(lead.instagram || "");
  };

  const handleSaveInstagram = async () => {
    if (!editingProspect) return;
    setSavingInstagram(true);
    const cleanHandle = sanitizeInstagramHandle(instagramInput);

    // Atualização otimista
    setProspects((prev) =>
      prev.map((p) =>
        p.id === editingProspect.id ? { ...p, instagram: cleanHandle } : p
      )
    );

    try {
      await updateProspectInstagramAction(editingProspect.id, instagramInput);
    } catch (err) {
      console.error("Erro ao salvar instagram no lead:", err);
    } finally {
      setSavingInstagram(false);
      setEditingProspect(null);
    }
  };

  // Carrega leads reais do Supabase
  const loadProspects = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await getProspectsAction();
      if (res.success && res.data) {
        setProspects(res.data);
      }
    } catch (err) {
      console.error("[ProspeccaoPage] Erro ao carregar leads:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProspects();
  }, [loadProspects]);

  // Atualiza status do lead no Supabase e na UI
  const handleStatusChange = async (id: string, newStatus: ProspectStatus) => {
    // Atualização otimista
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );

    try {
      const res = await updateProspectStatusAction(id, newStatus);
      if (!res.success) {
        console.error("Falha ao sincronizar status:", res.error);
        loadProspects(true);
      }
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      loadProspects(true);
    }
  };

  // Exclusão de Lead
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deseja remover "${name}" do pipeline de prospecção?`)) {
      return;
    }

    setProspects((prev) => prev.filter((p) => p.id !== id));
    if (selectedProspect?.id === id) setSelectedProspect(null);

    try {
      await deleteProspectAction(id);
    } catch (err) {
      console.error("Erro ao deletar lead:", err);
      loadProspects(true);
    }
  };

  // Construtor ou resolvedor do pitch do lead dinâmico por etapa do funil
  const getLeadPitch = (lead: Prospect): string => {
    const deficit = lead.review_deficit ?? lead.review_gap_to_leader ?? 0;
    const reviews = lead.reviews_count ?? lead.total_reviews ?? 0;
    const leaderReviews = lead.leader_reviews_count ?? (deficit + reviews);

    return getStagePitch((lead.status as ProspectStatus) || "NOVO", {
      leadName: lead.name,
      cityName: lead.city,
      targetRating: lead.rating,
      targetReviews: reviews,
      targetHasWebsite: lead.has_website,
      leaderReviews,
      deficit,
      demoUrl: lead.demo_url,
      pitchGenerated: lead.pitch_generated,
    });
  };

  const handleCopyPitch = async (lead: Prospect) => {
    const pitch = getLeadPitch(lead);
    try {
      await navigator.clipboard.writeText(pitch);
      setPitchCopiedId(lead.id);
      setTimeout(() => setPitchCopiedId(null), 2500);
    } catch (err) {
      console.error("Erro ao copiar pitch:", err);
    }
  };

  // Filtros de busca
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const matchQuery =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCity =
        selectedCity === "all" ||
        (p.city && p.city.toLowerCase() === selectedCity.toLowerCase());

      return matchQuery && matchCity;
    });
  }, [prospects, searchQuery, selectedCity]);

  // Lista de cidades únicas para filtro
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    prospects.forEach((p) => {
      if (p.city && p.city.trim()) set.add(p.city.trim());
    });
    return Array.from(set);
  }, [prospects]);

  // Agrupa leads por coluna
  const leadsByStage = useMemo(() => {
    const grouped: Record<ProspectStatus, Prospect[]> = {
      NOVO: [],
      CONTATADO: [],
      EM_NEGOCIACAO: [],
      FECHADO: [],
    };

    filteredProspects.forEach((item) => {
      const stage = (item.status as ProspectStatus) || "NOVO";
      if (grouped[stage]) {
        grouped[stage].push(item);
      } else {
        grouped.NOVO.push(item);
      }
    });

    return grouped;
  }, [filteredProspects]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white pb-12">
      {/* HEADER PRINCIPAL */}
      <header className="sticky top-0 z-40 bg-[#14151f]/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white shadow-lg shadow-emerald-600/30">
              CRM
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Funil de Prospecção
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Supabase
                </span>
              </span>
              <p className="text-[11px] text-slate-400">
                Pipeline de Fechamento de Vendas &amp; Disparos WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/comparativo"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0b0c10] hover:bg-slate-800 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
              <span>Comparativo</span>
            </Link>

            <Link
              href="/prospeccao"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Funil Kanban</span>
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

      {/* ÁREA DE CONTROLES E FILTROS */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#14151f] p-4 rounded-2xl border border-slate-800 shadow-md">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, nicho ou cidade..."
              className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filtro por Cidade */}
          {uniqueCities.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-[#0b0c10] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Todas as Cidades ({uniqueCities.length})</option>
                {uniqueCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                loadProspects(false);
              }}
              disabled={refreshing || loading}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#0b0c10] hover:bg-slate-800 text-slate-300 border border-slate-700 transition flex items-center gap-1.5"
              title="Atualizar leads do Supabase"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing || loading ? "animate-spin text-emerald-400" : ""}`}
              />
              <span className="hidden sm:inline">Recarregar</span>
            </button>

            <Link
              href="/comparativo"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buscar Mais Leads</span>
            </Link>
          </div>
        </div>

        {/* MENSAGEM QUANDO VAZIO */}
        {!loading && prospects.length === 0 && (
          <div className="text-center py-20 bg-[#14151f] rounded-2xl border border-slate-800 p-8 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Kanban className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Nenhum lead no funil ainda</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Utilize o <strong>Comparativo de Mercado</strong> para buscar empresas pelo Google
              Places e adicioná-las diretamente a este funil com 1 clique.
            </p>
            <div className="pt-2">
              <Link
                href="/comparativo"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Iniciar Prospecção no Google</span>
              </Link>
            </div>
          </div>
        )}

        {/* KANBAN BOARD COM 4 COLUNAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-start">
          {STAGES.map((stage, stageIndex) => {
            const stageLeads = leadsByStage[stage.id];
            const StageIcon = stage.icon;

            return (
              <div
                key={stage.id}
                className="bg-[#14151f] rounded-2xl border border-slate-800 p-3.5 flex flex-col min-h-[500px] shadow-lg"
              >
                {/* CABEÇALHO DA COLUNA */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg ${stage.badgeBg} border ${stage.badgeBorder} flex items-center justify-center`}
                    >
                      <StageIcon className={`w-4 h-4 ${stage.color}`} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        {stage.title}
                      </h3>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {stage.templateLabel}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-black ${stage.badgeBg} ${stage.color} border ${stage.badgeBorder}`}
                  >
                    {stageLeads.length}
                  </span>
                </div>

                {/* LISTA DE CARDS NA COLUNA */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {stageLeads.map((lead) => {
                    const rawPhone = (lead.whatsapp_number || lead.phone || "").replace(
                      /\D/g,
                      ""
                    );
                    const waPhone =
                      rawPhone.length > 0
                        ? rawPhone.startsWith("55")
                          ? rawPhone
                          : `55${rawPhone}`
                        : "";
                    const deficit = lead.review_deficit ?? lead.review_gap_to_leader ?? 0;
                    const pitch = getLeadPitch(lead);
                    const isCopied = pitchCopiedId === lead.id;

                    return (
                      <div
                        key={lead.id}
                        className="bg-[#0b0c10] rounded-xl border border-slate-800 hover:border-purple-500/50 p-3.5 space-y-3 transition shadow-sm hover:shadow-md group"
                      >
                        {/* Topo do Card: Nome com Link para Google Maps & Categoria */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                lead.name + " " + (lead.formatted_address || lead.address || "")
                              )}&query_place_id=${lead.place_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-bold text-white leading-snug line-clamp-2 hover:text-purple-400 hover:underline inline-flex items-center gap-1 group/link"
                              title="Abrir no Google Maps"
                            >
                              <span>{lead.name}</span>
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition shrink-0 text-slate-400" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDelete(lead.id, lead.name)}
                              className="text-slate-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100 shrink-0"
                              title="Remover do Funil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                            {lead.category && (
                              <span className="truncate max-w-[120px]">{lead.category}</span>
                            )}
                            {lead.city && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="truncate max-w-[100px] text-slate-400">
                                  {lead.city}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Métricas: Reviews e Nota */}
                        <div className="flex items-center justify-between text-xs bg-[#14151f] p-2 rounded-lg border border-slate-800/80">
                          <div className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{lead.rating ? lead.rating.toFixed(1) : "0.0"}</span>
                          </div>

                          <span className="text-slate-300 font-medium">
                            {lead.reviews_count || lead.total_reviews} reviews
                          </span>
                        </div>

                        {/* Badges de Status (Déficit, Website & Instagram) */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Badge de Déficit */}
                          {deficit > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/60 border border-amber-700/50 text-amber-300">
                              <TrendingDown className="w-3 h-3 text-amber-400" />
                              -{deficit} vs líder
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/60 border border-emerald-700/50 text-emerald-300">
                              <Trophy className="w-3 h-3 text-emerald-400" />
                              Líder de Reviews
                            </span>
                          )}

                          {/* Badge de Website Clicável */}
                          {lead.has_website && lead.website ? (
                            <a
                              href={
                                lead.website.startsWith("http")
                                  ? lead.website
                                  : `https://${lead.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white transition"
                              title={`Abrir site: ${lead.website}`}
                            >
                              <Globe className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span>Site Oficial</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-950 border border-red-700 text-red-300">
                              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                              🚨 Sem Website
                            </span>
                          )}

                          {/* Badge de Instagram Clicável / Edição */}
                          {lead.instagram ? (
                            <div className="inline-flex items-center gap-1">
                              <a
                                href={`https://instagram.com/${lead.instagram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-950/70 border border-pink-700/60 text-pink-300 hover:bg-pink-900 transition"
                                title={`Abrir Instagram: @${lead.instagram}`}
                              >
                                <InstagramIcon className="w-3 h-3 text-pink-400 shrink-0" />
                                <span className="truncate max-w-[85px]">@{lead.instagram}</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                              </a>
                              <button
                                type="button"
                                onClick={() => openEditInstagram(lead)}
                                className="p-0.5 rounded text-slate-500 hover:text-slate-300 transition"
                                title="Editar Instagram"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditInstagram(lead)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#14151f] border border-slate-800 text-slate-400 hover:text-white hover:border-pink-500/40 transition"
                              title="Adicionar Instagram deste lead"
                            >
                              <InstagramIcon className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>+ Instagram</span>
                            </button>
                          )}
                        </div>

                        {/* BADGE DINÂMICO DE TEMPLATE ATIVO DA ETAPA */}
                        {(() => {
                          const stageMeta =
                            STAGE_TEMPLATE_CONFIGS[(lead.status as ProspectStatus) || stage.id] ||
                            STAGE_TEMPLATE_CONFIGS.NOVO;
                          return (
                            <div
                              className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border ${stageMeta.badgeBg} ${stageMeta.badgeBorder} transition`}
                              title={stageMeta.description}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${stageMeta.themeColor.replace(
                                    "text-",
                                    "bg-"
                                  )} animate-pulse shrink-0`}
                                />
                                <span className={`font-bold ${stageMeta.themeColor} truncate`}>
                                  {stageMeta.badgeLabel}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setCopiedModalPitch(false);
                                  setPreviewPitchLead(lead);
                                }}
                                className="text-slate-400 hover:text-white transition shrink-0 ml-1 p-0.5 rounded hover:bg-slate-800"
                                title="Visualizar texto completo da mensagem"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })()}

                        {/* BOTÃO DIRETO WA.ME COM O PITCH PRÉ-PREENCHIDO BASEADO NA ETAPA */}
                        <div className="pt-1 flex items-center gap-1.5">
                          {waPhone ? (
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                pitch
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95"
                              title={`Disparar WhatsApp (${
                                STAGE_TEMPLATE_CONFIGS[(lead.status as ProspectStatus) || stage.id]?.badgeLabel ||
                                "Disparo"
                              })`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>Disparar WhatsApp</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <div className="flex-1 text-center py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-500">
                              Sem telefone
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopyPitch(lead)}
                            className={`p-1.5 rounded-lg text-xs border transition ${
                              isCopied
                                ? "bg-emerald-600 border-emerald-500 text-white"
                                : "bg-[#14151f] border-slate-700 text-slate-300 hover:text-white"
                            }`}
                            title={`Copiar texto: ${
                              STAGE_TEMPLATE_CONFIGS[(lead.status as ProspectStatus) || stage.id]?.badgeLabel ||
                              "Pitch"
                            }`}
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* CONTROLES DE AVANÇO DE ETAPA NO KANBAN */}
                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
                          {stageIndex > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(lead.id, STAGES[stageIndex - 1].id)
                              }
                              className="text-slate-500 hover:text-slate-300 flex items-center gap-0.5 transition"
                              title={`Voltar para ${STAGES[stageIndex - 1].title}`}
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              <span>Voltar</span>
                            </button>
                          ) : (
                            <span />
                          )}

                          {stageIndex < STAGES.length - 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleStatusChange(lead.id, STAGES[stageIndex + 1].id)
                              }
                              className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5 transition ml-auto"
                              title={`Avançar para ${STAGES[stageIndex + 1].title}`}
                            >
                              <span>Avançar</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold ml-auto flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Fechado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <div className="border border-dashed border-slate-800/80 rounded-xl p-6 text-center text-xs text-slate-600">
                      Nenhum lead nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL PARA INSERÇÃO / EDIÇÃO RÁPIDA DE INSTAGRAM NO LEAD */}
      {editingProspect && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !savingInstagram && setEditingProspect(null)}
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
                  <h4 className="text-sm font-bold text-white">Instagram do Lead</h4>
                  <p className="text-xs text-slate-400 truncate max-w-[260px]">
                    {editingProspect.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={savingInstagram}
                onClick={() => setEditingProspect(null)}
                className="text-slate-400 hover:text-white text-base px-2 py-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
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
                    disabled={savingInstagram}
                    className="w-full bg-[#0b0c10] border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 disabled:opacity-50"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Salva no banco Supabase e atualiza o card instantaneamente.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={savingInstagram}
                  onClick={() => setEditingProspect(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingInstagram}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  {savingInstagram ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar no CRM</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DO SCRIPT DE VENDAS DA ETAPA */}
      {previewPitchLead && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPitchLead(null)}
        >
          <div
            className="bg-[#14151f] border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {previewPitchLead.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const stageMeta =
                        STAGE_TEMPLATE_CONFIGS[
                          (previewPitchLead.status as ProspectStatus) || "NOVO"
                        ] || STAGE_TEMPLATE_CONFIGS.NOVO;
                      return (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${stageMeta.badgeBg} ${stageMeta.badgeBorder} ${stageMeta.themeColor}`}
                        >
                          {stageMeta.badgeLabel}
                        </span>
                      );
                    })()}
                    {previewPitchLead.city && (
                      <span className="text-[11px] text-slate-400">
                        {previewPitchLead.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPitchLead(null)}
                className="text-slate-400 hover:text-white text-base px-2 py-1 rounded-lg hover:bg-slate-800 transition"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo da Mensagem */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Script Formatado para Envio
                </label>
                <span className="text-[10px] text-slate-500">
                  WhatsApp Direct
                </span>
              </div>
              <div className="bg-[#0b0c10] border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 whitespace-pre-line leading-relaxed max-h-[300px] overflow-y-auto font-sans selection:bg-emerald-600 selection:text-white">
                {getLeadPitch(previewPitchLead)}
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  const pitch = getLeadPitch(previewPitchLead);
                  await navigator.clipboard.writeText(pitch);
                  setCopiedModalPitch(true);
                  setTimeout(() => setCopiedModalPitch(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0b0c10] hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
              >
                {copiedModalPitch ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Mensagem</span>
                  </>
                )}
              </button>

              {(() => {
                const rawPhone = (
                  previewPitchLead.whatsapp_number ||
                  previewPitchLead.phone ||
                  ""
                ).replace(/\D/g, "");
                const waPhone =
                  rawPhone.length > 0
                    ? rawPhone.startsWith("55")
                      ? rawPhone
                      : `55${rawPhone}`
                    : "";
                const pitch = getLeadPitch(previewPitchLead);

                return waPhone ? (
                  <a
                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                      pitch
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Disparar WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-500">
                    Sem telefone cadastrado
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
