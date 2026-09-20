import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  MapPin,
  Building,
  PhoneCall,
  ExternalLink,
  BarChart3,
  Kanban,
  Star,
  CheckCircle2,
  Clock,
  MessageSquare,
  AlertTriangle,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Search,
} from "lucide-react";
import { generateSalesPitch } from "@/lib/sales-pitch";
import type { Prospect, ProspectStatus } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootDashboardPage() {
  let prospects: Prospect[] = [];
  let isSupabaseConnected = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      prospects = data as Prospect[];
      isSupabaseConnected = true;
    }
  } catch (err) {
    console.error("[RootDashboard] Erro ao carregar prospects:", err);
  }

  const isGooglePlacesActive = Boolean(
    process.env.GOOGLE_PLACES_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  );

  // Métricas do SaaS
  const totalLeads = prospects.length;
  const contatados = prospects.filter((p) => p.status === "CONTATADO").length;
  const emNegociacao = prospects.filter((p) => p.status === "EM_NEGOCIACAO").length;
  const fechados = prospects.filter((p) => p.status === "FECHADO").length;
  const taxaConversao =
    totalLeads > 0 ? ((fechados / totalLeads) * 100).toFixed(1) : "0.0";

  // Últimos 5 leads ingeridos do Google Maps
  const latestProspects = prospects.slice(0, 5);

  const getStatusBadge = (status: ProspectStatus) => {
    switch (status) {
      case "NOVO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3 h-3" />
            Novo Lead
          </span>
        );
      case "CONTATADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <MessageSquare className="w-3 h-3" />
            Contatado
          </span>
        );
      case "EM_NEGOCIACAO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            Em Negociação
          </span>
        );
      case "FECHADO":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Fechado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white pb-16">
      {/* 1. HEADER PRINCIPAL COM STATUS INDICATORS */}
      <header className="sticky top-0 z-40 bg-[#14151f]/90 backdrop-blur-md border-b border-[#1f2430] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          {/* Brand & Indicadores de Status */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-purple-600/30">
              GL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-white tracking-tight">
                  Gestor Local
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Dashboard Principal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Inteligência de Mercado, Auditoria de Busca &amp; CRM Local
              </p>
            </div>
          </div>

          {/* Indicadores de Conexão Live */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b0c10] border border-[#1f2430] text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConnected
                    ? "bg-emerald-400 animate-ping"
                    : "bg-red-400"
                }`}
              />
              <span className="text-slate-300 font-medium">
                {isSupabaseConnected ? "Supabase Conectado" : "Supabase Offline"}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0b0c10] border border-[#1f2430] text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isGooglePlacesActive
                    ? "bg-emerald-400 animate-ping"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-slate-300 font-medium">
                {isGooglePlacesActive
                  ? "Google Places API Ativa"
                  : "Google Places Inativa"}
              </span>
            </div>

            {/* Links Rápidos */}
            <Link
              href="/comparativo"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Comparativo</span>
            </Link>

            <Link
              href="/prospeccao"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#14151f] hover:bg-slate-800 text-slate-300 border border-[#1f2430] transition flex items-center gap-1.5"
            >
              <Kanban className="w-3.5 h-3.5 text-emerald-400" />
              <span>Funil CRM</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL DO DASHBOARD */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 py-8 space-y-8">
        {/* 2. TOP METRIC CARDS (CONSULTADOS DIRETAMENTE DO SUPABASE) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total de Leads */}
          <div className="bg-[#14151f] p-5 rounded-2xl border border-[#1f2430] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total de Leads
              </span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-white">{totalLeads}</p>
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-purple-400" />
                Empresas extraídas do Google Maps
              </span>
            </div>
          </div>

          {/* Card 2: Leads Contatados */}
          <div className="bg-[#14151f] p-5 rounded-2xl border border-[#1f2430] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Leads Contatados
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <PhoneCall className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-white">{contatados}</p>
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <MessageSquare className="w-3 h-3 text-blue-400" />
                Abordagens realizadas no WhatsApp
              </span>
            </div>
          </div>

          {/* Card 3: Em Negociação */}
          <div className="bg-[#14151f] p-5 rounded-2xl border border-[#1f2430] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Em Negociação
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-white">{emNegociacao}</p>
              <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-amber-400" />
                Propostas e diagnósticos em análise
              </span>
            </div>
          </div>

          {/* Card 4: Fechados / Taxa de Conversão */}
          <div className="bg-[#14151f] p-5 rounded-2xl border border-[#1f2430] shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Taxa de Conversão
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Trophy className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-black text-emerald-400">
                {fechados} <span className="text-sm text-slate-400 font-bold">({taxaConversao}%)</span>
              </p>
              <span className="text-xs text-emerald-400/80 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" />
                Negócios fechados com sucesso
              </span>
            </div>
          </div>
        </section>

        {/* 3. QUICK ACTION BANNERS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Banner 1: Benchmark de Concorrentes */}
          <div className="bg-gradient-to-br from-[#14151f] via-[#14151f] to-purple-950/30 p-6 rounded-3xl border border-[#1f2430] shadow-xl flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">
                Nova Busca de Concorrentes (Benchmark)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                Consulte qualquer nicho e cidade em tempo real pelo Google Places. Identifique os
                líderes de mercado, meça o déficit de avaliações dos concorrentes e gere cards 1080x1080
                para WhatsApp.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/comparativo"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition active:scale-95"
              >
                <span>Iniciar Benchmark no Google</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Banner 2: Funil de Prospecção */}
          <div className="bg-gradient-to-br from-[#14151f] via-[#14151f] to-emerald-950/30 p-6 rounded-3xl border border-[#1f2430] shadow-xl flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                <Kanban className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">
                Abrir Funil de Prospecção (Kanban CRM)
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
                Gerencie seus leads capturados em 4 etapas estruturadas: Novos Leads, Contatados, Em
                Negociação e Fechados. Dispare mensagens persuasivas no WhatsApp em 1 clique.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/prospeccao"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <span>Acessar Pipeline Kanban</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 4. TABELA DE ATIVIDADE RECENTE / ÚLTIMOS LEADS INGERIDOS */}
        <section className="bg-[#14151f] rounded-3xl border border-[#1f2430] shadow-xl overflow-hidden space-y-4">
          <div className="p-5 border-b border-[#1f2430] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-400" />
                Últimos Leads Ingeridos do Google Maps
              </h3>
              <p className="text-xs text-slate-400">
                Empresas recentemente adicionadas ao funil para auditoria e fechamento
              </p>
            </div>

            <Link
              href="/prospeccao"
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
            >
              <span>Ver todos os {totalLeads} leads no CRM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {latestProspects.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0b0c10] text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-[#1f2430]">
                  <tr>
                    <th className="p-4">Empresa</th>
                    <th className="p-4">Cidade</th>
                    <th className="p-4">Nota / Avaliações</th>
                    <th className="p-4">Déficit vs Líder</th>
                    <th className="p-4">Status no Funil</th>
                    <th className="p-4 text-right">Ação WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2430]">
                  {latestProspects.map((lead) => {
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

                    const deficit =
                      lead.review_deficit ?? lead.review_gap_to_leader ?? 0;
                    const reviews = lead.reviews_count ?? lead.total_reviews ?? 0;
                    const leaderReviews = lead.leader_reviews_count ?? (deficit + reviews);

                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      lead.name + " " + (lead.formatted_address || lead.address || "")
                    )}&query_place_id=${lead.place_id}`;

                    const coldPitch = generateSalesPitch({
                      targetName: lead.name,
                      cityName: lead.city,
                      targetRating: lead.rating,
                      targetReviews: reviews,
                      targetHasWebsite: lead.has_website,
                      leaderReviews,
                      deficit,
                    });

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-[#1f2430]/40 transition-colors"
                      >
                        {/* Nome com link para Maps & Nicho */}
                        <td className="p-4">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-white text-sm line-clamp-1 hover:text-purple-400 hover:underline inline-flex items-center gap-1 group/link"
                            title="Abrir no Google Maps"
                          >
                            <span>{lead.name}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition shrink-0 text-slate-400" />
                          </a>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {lead.category || "Comércio / Serviços"}
                          </span>
                        </td>

                        {/* Cidade */}
                        <td className="p-4">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {lead.city || "Região não informada"}
                          </span>
                        </td>

                        {/* Nota & Reviews */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400 flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              {lead.rating ? lead.rating.toFixed(1) : "0.0"}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-300">
                              {reviews} reviews
                            </span>
                          </div>
                        </td>

                        {/* Déficit vs Líder */}
                        <td className="p-4">
                          {deficit > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-950/60 border border-amber-700/50 text-amber-300">
                              <TrendingUp className="w-3 h-3 text-amber-400 rotate-180" />
                              -{deficit} reviews vs líder
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/60 border border-emerald-700/50 text-emerald-300">
                              <Trophy className="w-3 h-3 text-emerald-400" />
                              Líder Local
                            </span>
                          )}
                        </td>

                        {/* Status Tag */}
                        <td className="p-4">
                          {getStatusBadge(lead.status as ProspectStatus)}
                        </td>

                        {/* Atalho WhatsApp */}
                        <td className="p-4 text-right">
                          {waPhone ? (
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                                coldPitch
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95"
                              title="Abrir WhatsApp Web com abordagem pronta"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">
                              Sem telefone
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 p-6 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#1f2430] flex items-center justify-center text-slate-500">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">
                Nenhum lead cadastrado no banco de dados
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Realize sua primeira pesquisa pelo Comparativo de Mercado para abastecer o pipeline.
              </p>
              <div className="pt-2">
                <Link
                  href="/comparativo"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Realizar Primeira Busca</span>
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
