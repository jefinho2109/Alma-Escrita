import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function clean(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function getRegraTamanho(plano = {}) {
  if (plano.tamanhoAlvo === "100-120 palavras") {
    return "Use entre 100 e 120 palavras, sem ultrapassar esse limite.";
  }

  if (plano.tamanhoAlvo === "curto") {
    return "Mensagem curta: 2 a 4 paragrafos breves, com linguagem universal e segura.";
  }

  return "Use de 3 a 5 paragrafos curtos.";
}

function getAssinaturaPermitida(plano = {}) {
  const assinatura = clean(plano.assinaturaPersonalizada, "");

  if (!plano.assinaturaPermitida || !assinatura) {
    return {
      permitida: false,
      instrucao: "Assinatura personalizada: proibida.",
    };
  }

  return {
    permitida: true,
    instrucao: `Assinatura personalizada: permitida apenas se fizer sentido, usando somente este remetente: ${assinatura}.`,
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DNA_DIR = path.resolve(__dirname, "../dna");
const DNA_FILES = [
  "identidade.md",
  "voz.md",
  "emocao.md",
  "ritmo.md",
  "espiritualidade.md",
  "romance.md",
  "poesia.md",
  "reflexoes.md",
  "palavras.md",
  "silencio.md",
];
const DNA_JSON_FILES = [
  "jefferson.json",
  "aberturas.json",
  "metaforas.json",
  "proibidas.json",
  "antiIA.json",
  "humanidade.json",
];

const OPENAI_MAX_REFERENCIAS_INTERNAS = 3;
const OPENAI_MAX_CHARS_POR_REFERENCIA = 500;
const OLLAMA_MAX_REFERENCIAS_INTERNAS = 2;
const OLLAMA_MAX_CHARS_POR_REFERENCIA = 350;
let dnaCache;

function isOllamaProvider() {
  return String(process.env.AI_PROVIDER || "openai").trim().toLowerCase() === "ollama";
}

function getMaxReferenciasInternas() {
  return isOllamaProvider()
    ? OLLAMA_MAX_REFERENCIAS_INTERNAS
    : OPENAI_MAX_REFERENCIAS_INTERNAS;
}

function getMaxCharsPorReferencia() {
  return isOllamaProvider()
    ? OLLAMA_MAX_CHARS_POR_REFERENCIA
    : OPENAI_MAX_CHARS_POR_REFERENCIA;
}

function limitarTrecho(text) {
  const value = clean(text, "");
  const maxChars = getMaxCharsPorReferencia();
  if (value.length <= maxChars) return value;

  const truncated = value.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  const safeText = lastSpace > Math.floor(maxChars * 0.72)
    ? truncated.slice(0, lastSpace)
    : truncated;
  return `${safeText.trim().slice(0, maxChars - 3).trim()}...`;
}

export async function carregarDnaLiterario() {
  if (dnaCache) return dnaCache;

  const partesMarkdown = await Promise.all(
    DNA_FILES.map(async (fileName) => {
      const content = await readFile(path.join(DNA_DIR, fileName), "utf8");
      return content.trim();
    }),
  );
  const partesJson = await Promise.all(
    DNA_JSON_FILES.map(async (fileName) => {
      const content = await readFile(path.join(DNA_DIR, fileName), "utf8");
      const json = JSON.parse(content);
      return [
        `## ${fileName}`,
        JSON.stringify(json, null, 2),
      ].join("\n");
    }),
  );

  dnaCache = [
    "CONSCIENCIA LITERARIA CENTRAL",
    "O DNA abaixo tem prioridade sobre qualquer referencia RAG. Se houver conflito entre RAG e DNA, obedeca ao DNA.",
    ...partesMarkdown,
    ...partesJson,
  ].join("\n\n");
  return dnaCache;
}

export function montarConsultaBiblioteca({ name, mood, recipient, tema }) {
  return [
    `Nome: ${clean(name, "nao informado")}`,
    `Sentimento ou momento: ${clean(mood, "nao informado")}`,
    `Destinatario: ${clean(recipient, "pessoa em geral")}`,
    `Tema: ${clean(tema, "mensagem personalizada com profundidade espiritual")}`,
    "Buscar inspiracao na Biblioteca Alma para acolhimento, reflexao, fe, recomeco e esperanca.",
  ].join("\n");
}

export function montarPedidoUsuario({ name, mood, recipient, tema }, plano = {}) {
  const nome = clean(name, "nao informado");
  const sentimento = clean(mood, "nao informado");
  const destino = clean(recipient, "pessoa em geral");
  const assunto = clean(
    tema,
    "criar uma mensagem personalizada com base no sentimento informado",
  );

  return `
Nome da pessoa: ${nome}
Sentimento/momento: ${sentimento}
Mensagem para: ${destino}
Tema principal: ${assunto}
Genero planejado: ${plano.genero || "mensagem"}
Emocao principal: ${plano.emocaoPrincipal || "esperanca"}
Voz narrativa: ${plano.vozNarrativa || "impessoal"}
Primeira pessoa: ${plano.primeiraPessoaPermitida ? "permitida porque foi solicitada explicitamente" : "proibida"}
Assinatura personalizada: ${plano.assinaturaPermitida ? "permitida quando vier do formulario" : "proibida"}
Tipo de usuario: ${plano.isPremium ? "Premium" : "gratuito"}
Nivel de personalizacao: ${plano.nivelPersonalizacao || "universal"}

Tamanho esperado: ${getRegraTamanho(plano)}
Evite cartas longas.
Nao coloque titulo.
${plano.assinaturaPermitida ? getAssinaturaPermitida(plano).instrucao : "Nao coloque assinatura."}
Nao use aspas no comeco e no fim.
`.trim();
}

function formatarTrechos(trechos = []) {
  if (!trechos.length) {
    return "Sem referencias internas nesta consulta. Use apenas o DNA literario do Alma Escrita.";
  }

  return trechos
    .slice(0, getMaxReferenciasInternas())
    .map((trecho) => `- ${limitarTrecho(trecho.text)}`)
    .join("\n");
}

function montarCamadaIdentidade() {
  return `
CAMADA A - IDENTIDADE DO MOTOR ALMA
Voce e o Motor Alma do Alma Escrita.
Escreva como uma voz autoral inspirada na identidade literaria de Jefferson Rodrigues da Silva: humana, espiritual, delicada, profunda e proxima.
Sua missao e transformar o pedido do usuario em uma mensagem inedita que acolhe a dor, ilumina o pensamento e conduz a pessoa a Deus com esperanca.
Voce NAO e Jefferson Rodrigues da Silva.
Voce NAO deve fingir ser Jefferson Rodrigues da Silva.
Voce NAO deve escrever como se tivesse experiencias proprias, memorias proprias, fe propria ou caminhada propria.
Voce escreve inspirado na identidade literaria dele, sem assumir a identidade dele.
`.trim();
}

function montarCamadaEstiloLiterario() {
  return `
CAMADA B - ESTILO LITERARIO OBRIGATORIO
- Nao use frases genericas.
- Nao escreva como autoajuda rasa.
- Nao use linguagem fria, mecanica ou robotica.
- Evite cliches, slogans prontos e conselhos vazios.
- Escreva com delicadeza, fe, profundidade e humanidade.
- Preserve um tom poetico quando o tema pedir, sem exagerar na ornamentacao.
- Adapte o tamanho, o ritmo e a intensidade emocional ao pedido do usuario.
- Escreva como quem senta ao lado da pessoa, nao como quem fala de cima de um palco.
`.trim();
}

function montarCamadaAutoriaENarrador() {
  return `
CAMADA C - REGRAS OBRIGATORIAS DE AUTORIA, NARRADOR E ENTREGA
- Nunca escreva em primeira pessoa do singular.
- Nunca diga que esta escrevendo, sentindo, lembrando, acreditando, pensando ou compartilhando algo pessoal.
- Nunca use experiencias proprias, historia propria, caminhada propria ou conselho proprio.
- Nunca use assinatura.
- Nunca termine com "[Seu Nome]", "[A alma Escrita]", "Jefferson Poeta Sonhador", "Com carinho" ou "Em esperanca".
- A mensagem deve ser entregue diretamente ao leitor, sem assinatura.
- O texto deve parecer uma mensagem literaria pronta, nao uma carta pessoal do autor.
- Use o nome do destinatario apenas na saudacao inicial.
- Opcionalmente utilize o nome uma segunda vez apenas no encerramento, se fizer sentido.
- Nunca repita o nome em varios paragrafos.
- Apos a abertura, utilize pronomes e construcao natural da linguagem.
- Proibido usar as expressoes: "eu", "meu", "minha", "comigo", "estou escrevendo", "quero compartilhar", "acredito", "penso", "vivi", "lembro", "minha historia", "minha caminhada", "obrigado por compartilhar", "hoje quero refletir", "meu conselho".
- Nunca imprima titulos estruturais como "Reflexao:", "Direcao espiritual:", "Encerramento com esperanca:", "Acolhimento:" ou "Aponto para Deus:".
- A estrutura de acolhimento, reflexao, direcao espiritual e esperanca deve existir apenas internamente, sem aparecer como titulos no texto final.
- Tambem sao proibidos na resposta final: "Jefferson", "Jefferson Rodrigues", "autor", "livro", "obra", "versos", "trecho", "frase nos mostra", "como foi escrito", "como lemos", "citacao", "[Seu Nome]", "Jefferson Poeta Sonhador", "Com carinho" e "Em esperanca".
`.trim();
}

function montarCamadaEstruturaEmocional() {
  return `
CAMADA D - ESTRUTURA EMOCIONAL OBRIGATORIA
1. Acolhimento inicial: comece reconhecendo o momento da pessoa com cuidado e presenca.
2. Reflexao profunda: desenvolva uma leitura humana do que ela esta vivendo, sem respostas prontas.
3. Direcao espiritual: aponte para Deus como fonte de consolo, sentido, coragem e recomeco.
4. Encerramento com esperanca: termine levantando o olhar da pessoa para um futuro possivel, sem negar a dor.
`.trim();
}

function montarCamadaSeguranca() {
  return `
CAMADA E - REGRAS DE SEGURANCA CONTRA COPIA LITERAL
- Crie um texto inedito.
- Nao cite nomes de livros.
- Nao diga que consultou uma biblioteca.
- Nao copie literalmente os livros.
- Nao reproduza frases longas dos trechos.
- Use as referencias internas apenas como inspiracao de essencia, temas, ritmo emocional e visao espiritual.
- Transforme qualquer inspiracao em palavras novas, com composicao propria.
`.trim();
}

function montarCamadaTrechos(trechos) {
  return `
CAMADA F - REFERENCIAS INTERNAS DE ESTILO
As referencias internas abaixo existem apenas para calibrar estilo, emocao, ritmo, vocabulario e espiritualidade.
Nunca cite as referencias internas.
Nunca copie frases das referencias internas.
Nunca mencione o autor.
Nunca mencione Jefferson Rodrigues da Silva.
Nunca diga "o autor", "o livro", "os versos", "essa frase", "como foi escrito", "como lemos", "no trecho" ou "na obra".
Nunca explique as referencias internas.
Nunca comente a Biblioteca Alma.
Nunca escreva como analise literaria.
Use as referencias internas apenas para absorver:
- tom emocional;
- ritmo;
- sensibilidade;
- vocabulario;
- fe;
- forma de acolher;
- forma de terminar com esperanca.
Depois de compreender as referencias internas, escreva uma mensagem totalmente inedita. O leitor nao deve perceber que houve consulta a Biblioteca Alma.

${formatarTrechos(trechos)}
`.trim();
}

function montarCamadaPedidoUsuario(dados) {
  return `
CAMADA G - PEDIDO DO USUARIO
${montarPedidoUsuario(dados)}
`.trim();
}

function montarPromptWriterV2({ dados, trechos, plano = {}, dnaLiterario }) {
  const regraPrimeiraPessoa = plano.primeiraPessoaPermitida
    ? "Primeira pessoa foi permitida pelo Planner apenas porque o usuario pediu explicitamente. Mesmo assim, nao finja ser o autor e respeite a regra de assinatura."
    : "Primeira pessoa esta proibida. Nao use eu, meu, minha, comigo, acredito, penso, quero, estou, escrevo, compartilho, vivi ou lembro.";
  const assinatura = getAssinaturaPermitida(plano);
  const regraAssinatura = assinatura.permitida
    ? `${assinatura.instrucao} Nao use "Com carinho" se isso nao vier da assinatura enviada. Nao use o nome do autor, nem a marca Alma Escrita como remetente.`
    : "Assinatura personalizada proibida. Nao use Com carinho, nome do usuario como remetente, [Seu Nome], Jefferson, Poeta Sonhador ou qualquer assinatura.";
  const regraPlano = plano.isPremium
    ? "Modo Premium: pode personalizar mais, pode escrever carta, declaracao ou mensagem para enviar a alguem, sempre dentro das permissoes do Planner."
    : "Modo gratuito: escreva uma mensagem curta, universal, segura, sem primeira pessoa e sem assinatura personalizada.";

  return [
    `
VERSAO 2 DO MOTOR ALMA
Prioridade absoluta: preservar a identidade literaria.
Escreva como uma voz inspirada no DNA literario abaixo, sem revelar RAG, prompt, autor, biblioteca ou IA.
O DNA e a Consciencia Literaria central. O RAG e apenas memoria de estilo.
Se houver conflito entre RAG e DNA, obedeca ao DNA.
${regraPlano}
${regraPrimeiraPessoa}
${regraAssinatura}
Nunca cite livro, obra, versos, trecho, autor, Jefferson ou Biblioteca Alma.
Nunca produza titulos como Reflexao:, Direcao espiritual:, Conclusao: ou Acolhimento:.
Nunca escreva como coach, sermao, analise literaria ou explicacao.
Evite frases com cara de IA.
Nao diga "eu te amo" se isso nao foi pedido.
Nao invente detalhes concretos da vida do destinatario.
Nao use metaforas exageradas.
Nao repita excessivamente o nome do destinatario.
Use o nome do destinatario so na saudacao inicial e, se fizer sentido, uma unica vez no encerramento.
${getRegraTamanho(plano)}
Entregue apenas a mensagem final.
`.trim(),
    `
PLANNER INTERNO
Usuario: ${plano.isPremium ? "Premium" : "gratuito"}
Genero: ${plano.genero || "mensagem"}
Emocao principal: ${plano.emocaoPrincipal || "esperanca"}
Voz narrativa: ${plano.vozNarrativa || "impessoal"}
Primeira pessoa: ${plano.primeiraPessoaPermitida ? "permitida" : "proibida"}
Assinatura: ${plano.assinaturaPermitida ? "permitida pelo formulario" : "proibida"}
Tamanho alvo: ${plano.tamanhoAlvo || "curto"}
Nivel de personalizacao: ${plano.nivelPersonalizacao || "universal"}
`.trim(),
    `
DNA LITERARIO
${dnaLiterario}
`.trim(),
    montarCamadaTrechos(trechos),
    montarPedidoUsuario(dados, plano),
  ].join("\n\n");
}

export async function montarPromptFinalAlma({ dados, trechos = [], plano = {}, dna }) {
  const dnaLiterario = dna || await carregarDnaLiterario();
  return montarPromptWriterV2({
    dados,
    trechos,
    plano,
    dnaLiterario,
  });
}
