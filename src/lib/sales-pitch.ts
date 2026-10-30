import type { ProspectStatus } from "@/types";

/**
 * Gerador de Scripts Comerciais de Alta Conversão - EssMendes Tecnologia
 * Especializado em abordagem conversacional curta e funil multietapas via WhatsApp
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
    badgeLabel: "Abordagem Curta & Curiosidade",
    shortLabel: "Abordagem Curta",
    description: "Abertura conversacional para despertar curiosidade e pedir permissão de envio do comparativo",
    themeColor: "text-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeBorder: "border-purple-500/30",
  },
  CONTATADO: {
    status: "CONTATADO",
    badgeLabel: "Raio-X + Demonstração Interativa",
    shortLabel: "Raio-X & Demo",
    description: "Envio do comparativo com link prático da demonstração com agendamento e vitrine",
    themeColor: "text-blue-400",
    badgeBg: "bg-blue-500/10",
    badgeBorder: "border-blue-500/30",
  },
  EM_NEGOCIACAO: {
    status: "EM_NEGOCIACAO",
    badgeLabel: "Condição Comercial & Implantação",
    shortLabel: "Condição Comercial",
    description: "Follow-up da demo com oferta de implantação rápida na semana e proposta em 5 min",
    themeColor: "text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
  },
  FECHADO: {
    status: "FECHADO",
    badgeLabel: "Boas-Vindas & Onboarding",
    shortLabel: "Boas-Vindas & Setup",
    description: "Boas-vindas ao cliente, coleta de materiais (logo/fotos) e início imediato do setup",
    themeColor: "text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
  },
};

/**
 * ETAPA 1 (NOVO): Abordagem Curta & Curiosidade
 * Abertura conversacional para WhatsApp com alto índice de resposta.
 */
export function generateSalesPitch({
  targetName,
  cityName,
  leaderName,
  deficit = 0,
}: GenerateSalesPitchParams): string {
  const city = cityName?.trim() || "sua região";
  const safeDeficit = Math.max(0, deficit ?? 0);
  const isLeader = safeDeficit === 0 && !leaderName;
  const safeLeaderName = leaderName?.trim() || "o concorrente líder da região";

  if (isLeader) {
    return [
      `Olá! É o responsável pela ${targetName}?`,
      `Estava analisando as buscas no Google aqui na região de ${city} e notei um detalhe importante sobre o volume de clientes que concorrentes da região estão disputando diretamente com vocês.`,
      `Gerei um comparativo rápido de posicionamento de vocês. Posso te enviar por aqui?`,
    ].join("\n\n");
  }

  return [
    `Olá! É o responsável pela ${targetName}?`,
    `Estava analisando as buscas no Google aqui na região de ${city} e notei um detalhe importante sobre o volume de clientes que o ${safeLeaderName} está captando na sua frente.`,
    `Gerei um comparativo rápido de posicionamento de vocês. Posso te enviar por aqui?`,
  ].join("\n\n");
}

/**
 * ETAPA 2 (CONTATADO): Envio do Raio-X + Demonstração Interativa
 */
export function generateDemoShowcasePitch(leadName: string, demoUrl?: string | null): string {
  const url = demoUrl?.trim() || "https://essmendes.com.br/demo";

  return [
    `Segue o comparativo que mencionei!`,
    `Para virar esse jogo e colocar a ${leadName} na frente, preparamos uma demonstração prática de como sua empresa pode ter agendamento online, vitrine e captação automática de avaliações 5 estrelas:`,
    `👉 ${url}`,
    `Consegue abrir em 1 minuto para ver como fica com a marca de vocês?`,
  ].join("\n\n");
}

/**
 * ETAPA 3 (EM_NEGOCIACAO): Condição Comercial & Implantação
 */
export function generateCommercialProposalPitch(_leadName?: string): string {
  return [
    `Tudo bem? Conseguiram dar uma olhada na demonstração?`,
    `Consigo liberar a implantação completa da vitrine + sistema de avaliações ainda esta semana com uma condição especial para a região.`,
    `Podemos alinhar 5 minutinhos hoje ou prefere que te envie a proposta em PDF?`,
  ].join("\n\n");
}

/**
 * ETAPA 4 (FECHADO): Boas-Vindas & Onboarding com Solicitação de Materiais
 */
export function generateOnboardingPitch(leadName: string): string {
  return [
    `Parabéns e seja muito bem-vinda à EssMendes Tecnologia, equipe da ${leadName}! 🚀`,
    `Para iniciarmos a configuração e o setup da vitrine e agendamento hoje mesmo, me envie por aqui:`,
    `📸 Logotipo da empresa\n📸 5 a 10 fotos dos serviços e ambiente\n📝 Lista dos principais serviços/valores\n⏰ Horários e WhatsApp oficial de atendimento`,
    `Já estamos iniciando os trabalhos por aqui. Vamos com tudo! 💪`,
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
      // Se já houver um pitch salvo no banco que não seja o antigo template longo obsoleto
      if (
        params.pitchGenerated &&
        params.pitchGenerated.trim().length > 10 &&
        !params.pitchGenerated.includes("Fizemos um levantamento da visibilidade") &&
        !params.pitchGenerated.includes("Raio-X Comparativo acima") &&
        !params.pitchGenerated.includes("Nós estruturamos toda a presença comercial") &&
        !params.pitchGenerated.includes("Faz sentido modernizarmos")
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
