// Testes unitários para o gerador de pitches e scripts de vendas WhatsApp
import {
  generateSalesPitch,
  generateDemoShowcasePitch,
  generateCommercialProposalPitch,
  generateOnboardingPitch,
  getStagePitch,
  STAGE_TEMPLATE_CONFIGS,
} from "../src/lib/sales-pitch.ts";

console.log("====================================================");
console.log("🧪 TESTES UNITÁRIOS DE PITCH SCRIPTS (WHATSAPP)");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, name, details = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${name} ${details ? "(" + details + ")" : ""}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name} ${details ? "- " + details : ""}`);
    failed++;
  }
}

// 1. Template NOVO (Abordagem Curta & Curiosidade)
const pitchNovo = generateSalesPitch({
  targetName: "Clínica Bem Estar",
  cityName: "São Paulo",
  leaderName: "Hospital da Plástica",
  deficit: 250,
});

assert(
  pitchNovo.includes("Olá! É o responsável pela Clínica Bem Estar?"),
  "NOVO: Saudação direta e pergunta ao responsável",
  pitchNovo.slice(0, 50)
);

assert(
  pitchNovo.includes("região de São Paulo e notei um detalhe importante"),
  "NOVO: Contexto da região de São Paulo"
);

assert(
  pitchNovo.includes("Hospital da Plástica está captando na sua frente"),
  "NOVO: Menção ao concorrente líder captando clientes"
);

assert(
  pitchNovo.includes("Posso te enviar por aqui?"),
  "NOVO: Pergunta de permissão para envio do comparativo"
);

// 2. Template CONTATADO (Envio do Raio-X + Demonstração Interativa)
const pitchContatado = generateDemoShowcasePitch(
  "Clínica Bem Estar",
  "https://essmendes.com.br/demo/clinica"
);

assert(
  pitchContatado.includes("Segue o comparativo que mencionei!"),
  "CONTATADO: Envio do comparativo prometido"
);

assert(
  pitchContatado.includes("👉 https://essmendes.com.br/demo/clinica"),
  "CONTATADO: Link da demonstração interativa"
);

assert(
  pitchContatado.includes("Consegue abrir em 1 minuto para ver como fica com a marca de vocês?"),
  "CONTATADO: Chamada para ação de 1 minuto"
);

// 3. Template EM NEGOCIAÇÃO (Condição Comercial & Implantação)
const pitchNegociacao = generateCommercialProposalPitch("Clínica Bem Estar");

assert(
  pitchNegociacao.includes("Tudo bem? Conseguiram dar uma olhada na demonstração?"),
  "EM_NEGOCIACAO: Pergunta sobre a demonstração"
);

assert(
  pitchNegociacao.includes("Consigo liberar a implantação completa da vitrine + sistema de avaliações ainda esta semana"),
  "EM_NEGOCIACAO: Implantação nesta semana com condição especial"
);

assert(
  pitchNegociacao.includes("Podemos alinhar 5 minutinhos hoje ou prefere que te envie a proposta em PDF?"),
  "EM_NEGOCIACAO: Call to action de 5 min ou proposta em PDF"
);

// 4. Resolver getStagePitch
const resolvedNovo = getStagePitch("NOVO", {
  leadName: "Auto Peças Silva",
  cityName: "Campinas",
  leaderName: "Top Peças",
  deficit: 120,
});
assert(
  resolvedNovo.includes("Auto Peças Silva") && resolvedNovo.includes("Top Peças"),
  "getStagePitch(NOVO): Gera template novo de curiosidade"
);

const resolvedContatado = getStagePitch("CONTATADO", {
  leadName: "Auto Peças Silva",
  demoUrl: "https://essmendes.com.br/demo/silva",
});
assert(
  resolvedContatado.includes("👉 https://essmendes.com.br/demo/silva"),
  "getStagePitch(CONTATADO): Gera demo showcase"
);

const resolvedNegociacao = getStagePitch("EM_NEGOCIACAO", {
  leadName: "Auto Peças Silva",
});
assert(
  resolvedNegociacao.includes("Podemos alinhar 5 minutinhos hoje"),
  "getStagePitch(EM_NEGOCIACAO): Gera condição comercial"
);

// 5. Metadados do STAGE_TEMPLATE_CONFIGS
assert(STAGE_TEMPLATE_CONFIGS.NOVO.shortLabel === "Abordagem Curta", "Meta NOVO correto");
assert(STAGE_TEMPLATE_CONFIGS.CONTATADO.shortLabel === "Raio-X & Demo", "Meta CONTATADO correto");
assert(STAGE_TEMPLATE_CONFIGS.EM_NEGOCIACAO.shortLabel === "Condição Comercial", "Meta EM_NEGOCIACAO correto");

console.log("\n====================================================");
console.log(`📊 RESULTADO DOS TESTES DE PITCH: ${passed} PASSOU | ${failed} FALHOU`);
console.log("====================================================");
