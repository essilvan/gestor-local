import type { ProspectStatus } from "@/types";

/**
 * Gerador de Scripts Comerciais de Alta Conversão - EssMendes Tecnologia
 * Especializado em abordagem fria e funil de vendas multietapas via WhatsApp
 */

export interface GenerateSalesPitchParams {
  targetName: string;
  cityName?: string | null;
  targetRating?: number | null;
  targetReviews?: number | null;
  targetHasWebsite?: boolean | null;
  leaderName?: string | null;
  leaderReviews?: number | null;
  deficit?: number | null;
}

export interface StagePitchParams {
  leadName: string;
  cityName?: string | null;
  targetRating?: number | null;
  targetReviews?: number | null;
  targetHasWebsite?: boolean | null;
  leaderName?: string | null;
  leaderReviews?: number | null;
  deficit?: number | null;
  demoUrl?: string | null;
  pitchGenerated?: string | null;
}

export interface StageTemplateMeta {
  status: ProspectStatus;
  badgeLabel: string;
  shortLabel: string;
  description: string;
  themeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export const STAGE_TEMPLATE_CONFIGS: Record<ProspectStatus, StageTemplateMeta> = {
  NOVO: {
    status: "NOVO",
    badgeLabel: "Envio: Raio-X Diagnóstico",
    shortLabel: "Raio-X Diagnóstico",
    description: "Abordagem fria comparativa contra o líder da região e déficit de avaliações",
    themeColor: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
  },
  CONTATADO: {
    status: "CONTATADO",
    badgeLabel: "Envio: Apresentação da Plataforma",
    shortLabel: "Apresentação da Plataforma",
    description: "Follow-up com link da demo e apresentação dos 5 módulos do portal do cliente",
    themeColor: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
  },
  EM_NEGOCIACAO: {
    status: "EM_NEGOCIACAO",
    badgeLabel: "Envio: Proposta Comercial",
    shortLabel: "Proposta Comercial",
    description: "Apresentação direta de preços (Setup + Mensalidade / Semestral) e fechamento Pix/Cartão",
    themeColor: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
  },
  FECHADO: {
    status: "FECHADO",
    badgeLabel: "Envio: Boas-Vindas & Onboarding",
    shortLabel: "Boas-Vindas & Onboarding",
    description: "Boas-vindas ao cliente, coleta de materiais (logo/fotos) e início do setup",
    themeColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
  },
};

/**
 * ETAPA 1 (NOVO): Pitch de Diagnóstico Comparativo com Raio-X e Déficit
 */
export function generateSalesPitch({
  targetName,
  cityName,
  targetRating = 0,
  targetReviews = 0,
  targetHasWebsite = false,
  leaderName,
  leaderReviews = 0,
  deficit = 0,
}: GenerateSalesPitchParams): string {
  const city = cityName?.trim() || "sua região";
  const safeDeficit = Math.max(0, deficit ?? 0);
  const isLeader = safeDeficit === 0;
  const safeLeaderName = leaderName?.trim() || "Líder Regional";

  const servicesList = [
    "🔹 Gestão e Otimização do Google Meu Negócio (subir no Maps e acelerar avaliações 5★)",
    "🔹 Site Profissional com SEO Local e WhatsApp Direto",
    "🔹 Agendamento Online e Vitrine de Serviços (com galeria de Antes e Depois)",
  ].join("\n");

  const finalCta =
    "Faz sentido modernizarmos a estrutura de vocês para fechar esses clientes que hoje vão para a concorrência? Se sim, posso enviar os valores e prazos por aqui!";

  if (isLeader) {
    return [
      `Olá, equipe da ${targetName}! Tudo bem? Aqui é da EssMendes Tecnologia.`,
      `Fizemos um levantamento da visibilidade de empresas em ${city} no Google Maps e geramos o Raio-X Comparativo acima 👆 destacando a liderança de vocês na região.`,
      `Vocês hoje concentram a liderança com ${targetReviews} avaliações, mas concorrentes locais estão acelerando para disputar essa posição enquanto sua estrutura ainda pode converter muito mais com agendamento ativo.`,
      `Nós estruturamos toda a presença comercial para vocês blindarem a liderança da região:\n${servicesList}`,
      finalCta,
    ].join("\n\n");
  }

  return [
    `Olá, equipe da ${targetName}! Tudo bem? Aqui é da EssMendes Tecnologia.`,
    `Fizemos um levantamento da visibilidade de empresas em ${city} no Google Maps e geramos o Raio-X Comparativo acima 👆 colocando o perfil de vocês lado a lado com o líder regional (${safeLeaderName}).`,
    `O líder hoje concentra os contatos com ${leaderReviews} avaliações, enquanto vocês estão com uma diferença de ${safeDeficit} avaliações e sem presença digital com conversão ativa.`,
    `Nós estruturamos toda a presença comercial para vocês liderarem a região:\n${servicesList}`,
    finalCta,
  ].join("\n\n");
}

/**
 * ETAPA 2 (CONTATADO): Apresentação da Plataforma & Showcase dos Módulos do Portal
 */
export function generateDemoShowcasePitch(leadName: string, demoUrl?: string | null): string {
  const url = demoUrl?.trim() || "https://essmendes.com.br/demo";

  return [
    `Olá, equipe da ${leadName}! Tudo bem? Aqui é da EssMendes Tecnologia.`,
    `Para vocês verem na prática como fica a presença digital moderna que mostramos no diagnóstico, estruturamos uma demonstração da plataforma:`,
    `🔗 Acesso Demo: ${url}`,
    `Dentro do painel administrativo da empresa, vocês têm controle total de:\n` +
      `🔹 Agendamentos Online (clientes marcam horários direto pelo site)\n` +
      `🔹 Catálogo de Serviços & Vitrine de Produtos\n` +
      `🔹 Galeria de Antes & Depois (prova visual de qualidade)\n` +
      `🔹 Gestor de Avaliações Google (para alavancar nota 5 estrelas)\n` +
      `🔹 Posts & Otimização SEO (para manter a liderança no Maps)`,
    `Conseguem abrir a demonstração por aí? Posso te passar os valores de implantação?`,
  ].join("\n\n");
}

/**
 * ETAPA 3 (EM_NEGOCIACAO): Proposta Comercial Direta com Modelos de Preço & Pix/Cartão
 */
export function generateCommercialProposalPitch(leadName: string): string {
  return [
    `Olá, equipe da ${leadName}! Tudo bem? Aqui é da EssMendes Tecnologia.`,
    `Conforme conversamos, estruturei a nossa proposta comercial para colocarmos o projeto da ${leadName} no ar e acelerar suas vendas no Google:`,
    `🚀 OPÇÃO 1: Setup Profissional + Gestão Mensal\n` +
      `• Setup Completo do Site/Vitrine + Otimização Google Meu Negócio: R$ 297 (taxa única de implantação)\n` +
      `• Gestão Mensal, SEO Local e Hospedagem Pro: R$ 97/mês (a partir do 2º mês)`,
    `⭐ OPÇÃO 2: Plano Semestral Econômico (Recomendado)\n` +
      `• Setup Profissional 100% GRÁTIS (Economia imediata de R$ 200)\n` +
      `• 6 Meses de Gestão e Plataforma Ativa: R$ 497 à vista ou parcelado no Cartão`,
    `💳 Condições de Pagamento:\n` +
      `Pagamento facilitado via Pix com ativação imediata ou Cartão de Crédito.`,
    `Qual dessas opções fica mais confortável para iniciarmos a configuração da ${leadName} esta semana?`,
  ].join("\n\n");
}

/**
 * ETAPA 4 (FECHADO): Boas-Vindas & Onboarding com Solicitação de Materiais
 */
export function generateOnboardingPitch(leadName: string): string {
  return [
    `🎉 Parabéns e seja muito bem-vinda à EssMendes Tecnologia, equipe da ${leadName}!`,
    `Estamos muito felizes em iniciar a estruturação da presença digital e aceleração do perfil de vocês no Google! 🚀`,
    `Para iniciarmos a configuração e o setup da plataforma hoje mesmo, precisamos de alguns materiais básicos:\n` +
      `📸 Logotipo da empresa (em alta resolução ou arquivo PNG)\n` +
      `📸 5 a 10 fotos dos principais serviços, ambiente e equipe\n` +
      `📝 Lista dos principais serviços/produtos com valores médios\n` +
      `⏰ Horários de atendimento e WhatsApp oficial da empresa`,
    `Podem ir me enviando por aqui mesmo! Já estamos iniciando o mapeamento técnico da conta de vocês. Vamos com tudo! 💪`,
  ].join("\n\n");
}

/**
 * Resolvedor Central de Pitch Dinâmico por Etapa do Funil Kanban
 */
export function getStagePitch(
  status: ProspectStatus = "NOVO",
  params: StagePitchParams
): string {
  switch (status) {
    case "CONTATADO":
      return generateDemoShowcasePitch(params.leadName, params.demoUrl);

    case "EM_NEGOCIACAO":
      return generateCommercialProposalPitch(params.leadName);

    case "FECHADO":
      return generateOnboardingPitch(params.leadName);

    case "NOVO":
    default:
      if (
        params.pitchGenerated &&
        params.pitchGenerated.trim().length > 10 &&
        params.pitchGenerated.includes("Segue o comparativo visual em anexo")
      ) {
        return params.pitchGenerated;
      }

      return generateSalesPitch({
        targetName: params.leadName,
        cityName: params.cityName,
        targetRating: params.targetRating,
        targetReviews: params.targetReviews,
        targetHasWebsite: params.targetHasWebsite,
        leaderName: params.leaderName,
        leaderReviews: params.leaderReviews,
        deficit: params.deficit,
      });
  }
}

