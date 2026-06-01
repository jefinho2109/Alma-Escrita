import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const importsDir = path.join(rootDir, "book-imports");
const outputFile = path.join(rootDir, "src", "data", "authorVoiceKnowledge.ts");
const targetSeedCount = 240;

const sourceSpecs = [
  {
    book: "A Força do Hoje",
    type: "pdf",
    names: ["a_forca_do_hoje (1).pdf"],
  },
  {
    book: "Desafiando o Impossível",
    type: "pdf",
    names: [
      "Desafiando o Impossível A Arte de Viver com Coragem (pdf.io).pdf",
      "Desafiando o Impossível A Arte de Viver com Coragem.pdf",
    ],
  },
  {
    book: "Eu Não Sou Quem Você Pensa",
    type: "pdf",
    names: ["Eu Nao Sou Quem Você Pensa com capa.pdf"],
  },
  {
    book: "Poemas revisado",
    type: "docx",
    names: ["Poemas revisado.docx", "Poemas  revisado.docx"],
  },
];

const genericBlocklist = [
  "acredite em você",
  "nunca desista",
  "você consegue",
  "você é especial",
  "tudo vai dar certo",
  "basta querer",
  "siga em frente",
  "seja forte",
];

const themeDetectors = [
  { theme: "perda", words: ["perda", "perdi", "luto", "partida", "morte", "adeus", "despedida"] },
  { theme: "recomeço", words: ["recomeço", "recomeçar", "novo", "levantar", "amanhã", "renascer"] },
  { theme: "silêncio", words: ["silêncio", "calado", "calada", "quieto", "quieta", "calar"] },
  { theme: "abandono", words: ["abandono", "abandonado", "sozinho", "sozinha", "ausência", "rejeição"] },
  { theme: "identidade", words: ["identidade", "verdade", "máscara", "sou", "parecer", "enxergar"] },
  { theme: "propósito", words: ["propósito", "sentido", "caminho", "missão", "história", "sonho"] },
  { theme: "gratidão", words: ["gratidão", "agradeço", "agradecer", "obrigado", "obrigada", "grato"] },
  { theme: "esperança", words: ["esperança", "esperar", "amanhecer", "luz", "milagre", "promessa"] },
  { theme: "coragem", words: ["coragem", "medo", "enfrentar", "luta", "impossível", "ousar"] },
  { theme: "resiliência", words: ["resiliência", "resistir", "cicatriz", "ferida", "queda", "levantar"] },
  { theme: "fé", words: ["fé", "deus", "oração", "orar", "senhor", "bênção", "paciência"] },
  { theme: "transformação", words: ["transformação", "mudar", "mudança", "cura", "processo", "crescer"] },
  { theme: "amor", words: ["amor", "amar", "coração", "paixão", "carinho", "afeto"] },
  { theme: "saudade", words: ["saudade", "lembrança", "distância", "falta", "longe", "ausente"] },
  { theme: "mãe", words: ["mãe", "mamae", "mamãe", "colo", "materno"] },
  { theme: "pai", words: ["pai", "paterno", "proteção"] },
  { theme: "família", words: ["família", "casa", "filho", "filha", "irmão", "irmã"] },
  { theme: "amizade", words: ["amigo", "amiga", "amizade", "companheiro", "companheira"] },
  { theme: "FFP", words: ["fé", "força", "paciência", "ffp"] },
];

const emotionDetectors = [
  { emotion: "dor", words: ["dor", "ferida", "machuca", "choro", "lágrima"] },
  { emotion: "fé", words: ["fé", "deus", "oração", "milagre", "benção", "bênção"] },
  { emotion: "cansaço", words: ["cansaço", "cansado", "cansada", "peso", "exausto"] },
  { emotion: "saudade", words: ["saudade", "falta", "distância", "lembrança"] },
  { emotion: "amor", words: ["amor", "coração", "amar", "paixão"] },
  { emotion: "esperança", words: ["esperança", "luz", "amanhecer", "recomeço"] },
  { emotion: "coragem", words: ["coragem", "luta", "força", "enfrentar"] },
  { emotion: "gratidão", words: ["gratidão", "agradeço", "obrigado", "obrigada"] },
  { emotion: "solidão", words: ["sozinho", "sozinha", "abandono", "silêncio"] },
  { emotion: "perdão", words: ["perdão", "perdoar", "desculpa", "mágoa"] },
];

const recipientDetectors = [
  { recipient: "mãe", words: ["mãe", "mamãe", "colo", "materno"] },
  { recipient: "pai", words: ["pai", "paterno"] },
  { recipient: "esposa", words: ["esposa", "mulher", "casamento"] },
  { recipient: "marido", words: ["marido", "esposo", "casamento"] },
  { recipient: "namorado", words: ["namorado"] },
  { recipient: "namorada", words: ["namorada"] },
  { recipient: "amigo", words: ["amigo", "amiga", "amizade"] },
  { recipient: "família", words: ["família", "casa", "filho", "filha", "irmão", "irmã"] },
  { recipient: "amor", words: ["amor", "coração", "paixão"] },
];

const stopwords = new Set(
  [
    "ainda", "algo", "aquela", "aquele", "aqui", "assim", "cada", "como",
    "com", "das", "depois", "desde", "dessa", "desse", "deus", "dias",
    "disse", "dizer", "dois", "ela", "elas", "ele", "eles", "essa", "esse",
    "esta", "este", "está", "estão", "eu", "fazer", "foi", "for", "isso",
    "mais", "mas", "meu", "minha", "muito", "não", "nós", "para", "pela",
    "pelo", "pode", "porque", "por", "quando", "que", "quem", "ser", "seu",
    "sua", "também", "tem", "tudo", "uma", "você", "vocês",
  ],
);

const themeReflections = {
  perda: [
    "A perda deixa a alma tentando conversar com uma ausência que ainda tem nome.",
    "Há despedidas que não terminam; elas apenas aprendem a morar em silêncio.",
    "A dor da perda pede cuidado, não pressa, porque até o luto precisa respirar.",
  ],
  recomeço: [
    "Recomeçar é voltar para a própria história sem fingir que a queda não existiu.",
    "O recomeço verdadeiro nasce quando a pessoa para de negociar com a própria dor.",
    "Nem todo novo começo faz barulho; alguns chegam como uma decisão tomada por dentro.",
  ],
  silêncio: [
    "O silêncio nem sempre é vazio; às vezes é a alma tentando não se partir em voz alta.",
    "Tem silêncio que protege o coração até ele conseguir dizer a verdade inteira.",
    "Quem aprendeu a escutar o próprio silêncio descobre feridas que pediam nome.",
  ],
  abandono: [
    "O abandono ensina uma solidão dura, mas também revela onde a pessoa precisa se escolher.",
    "Ser deixado para trás machuca, mas não define o valor de quem ficou.",
    "Há ausências que rasgam, e há verdades que costuram a alma de volta.",
  ],
  identidade: [
    "Identidade é quando a pessoa já não precisa diminuir a própria verdade para caber em ninguém.",
    "Existe uma liberdade silenciosa em deixar de viver representando força.",
    "A alma se reconhece quando para de pedir licença para ser inteira.",
  ],
  propósito: [
    "Propósito não é palco; é permanecer fiel ao que Deus acendeu por dentro.",
    "O caminho ganha sentido quando a dor deixa de mandar e passa a ensinar.",
    "Há histórias que só encontram direção depois que a alma aceita atravessar o processo.",
  ],
  gratidão: [
    "Gratidão é a memória da alma reconhecendo cuidado até nos dias difíceis.",
    "Agradecer não nega a luta; apenas impede que a luta apague todos os milagres.",
    "Quem aprende a agradecer enxerga presença onde antes só via falta.",
  ],
  esperança: [
    "Esperança é uma luz pequena que insiste em não pedir permissão ao escuro.",
    "Há dias em que esperar é o ato mais corajoso que alguém consegue oferecer à própria alma.",
    "A esperança não grita; ela permanece acesa quando quase tudo pede desistência.",
  ],
  coragem: [
    "Coragem é levantar com medo e ainda assim não entregar a vida ao impossível.",
    "O impossível perde autoridade quando a alma decide caminhar com fé e paciência.",
    "Ser corajoso não é não tremer; é não permitir que o medo escreva o final.",
  ],
  resiliência: [
    "Resiliência é transformar cicatriz em linguagem sem romantizar a ferida.",
    "Quem resiste com alma não endurece por inteiro; aprende a florescer com marcas.",
    "A queda não precisa virar identidade quando ainda existe verdade para reerguer.",
  ],
  fé: [
    "Fé é continuar conversando com Deus quando a resposta ainda não aprendeu a chegar.",
    "A oração sustenta lugares da alma que ninguém vê quando a pessoa sorri.",
    "Fé, força e paciência formam uma estrada onde a pressa não governa o coração.",
  ],
  transformação: [
    "Transformação começa quando a pessoa aceita perder a versão que sobrevivia sem viver.",
    "Mudar dói porque a alma precisa desaprender antigas prisões para respirar diferente.",
    "Toda cura verdadeira mexe primeiro no lugar que a pessoa mais tentava esconder.",
  ],
  amor: [
    "Amor é presença que não precisa fazer barulho para se tornar abrigo.",
    "O amor verdadeiro não apaga a dor, mas oferece um lugar onde a alma pode descansar.",
    "Amar é escrever cuidado nos detalhes que quase ninguém percebe.",
  ],
  saudade: [
    "Saudade é quando o coração continua chamando por uma presença que o tempo não devolveu.",
    "A distância ensina que algumas pessoas ficam mesmo quando não podem estar.",
    "Tem lembrança que volta em silêncio e senta dentro da alma como oração.",
  ],
  família: [
    "Família é o lugar onde a alma deveria encontrar abrigo antes de precisar explicar a dor.",
    "Casa não é só parede; é quem reconhece nosso cansaço antes da nossa fala.",
    "Os vínculos mais profundos pedem cuidado, presença e verdade.",
  ],
  amizade: [
    "Amizade verdadeira é presença que não exige espetáculo para provar cuidado.",
    "Um amigo pode ser a resposta de Deus em forma de escuta.",
    "Há amizades que seguram a alma quando as palavras já não conseguem ficar de pé.",
  ],
};

const impactTemplates = [
  "FFP não é pressa; é fé respirando, força caminhando e paciência sustentando.",
  "Nem toda queda encerra uma história; algumas apenas revelam onde Deus vai reconstruir.",
  "O silêncio também ora quando a alma já não encontra voz.",
  "A cicatriz não é o fim da beleza; é a prova de que a vida continuou.",
  "Quem volta para si deixa de implorar morada em corações fechados.",
  "A esperança pequena ainda é luz quando o escuro tenta parecer maior.",
  "O amor que cuida não precisa gritar para ser inteiro.",
  "Recomeçar é assinar a própria vida depois de uma página rasgada.",
  "A saudade é presença sem corpo, mas com memória dentro da alma.",
  "Coragem é caminhar com medo sem entregar o volante ao medo.",
];

const narrativePatterns = [
  "dor nomeada -> confissão íntima -> virada de fé -> frase final marcante",
  "imagem simples do cotidiano -> verdade emocional -> escolha de recomeço -> fechamento poético",
  "silêncio interior -> pergunta da alma -> FFP como método -> esperança madura",
  "ferida reconhecida -> identidade resgatada -> cuidado prático -> impacto final",
  "ausência percebida -> memória afetiva -> aceitação delicada -> oração em forma de frase",
];

const voiceRules = [
  "usar primeira pessoa com naturalidade, como carta ou confissão",
  "preferir imagens de alma, silêncio, queda, oração, hoje, caminho e cicatriz",
  "trocar motivação genérica por verdade emocional específica",
  "fechar com uma frase curta de impacto, sem slogan",
  "aplicar FFP quando houver luta, espera, fé ou recomeço",
  "não explicar o texto; entregar a mensagem como reflexão pronta",
];

function looseKey(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function xmlDecode(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function extractTextFromXml(xml) {
  return normalizeText(
    xml
      .replace(/<w:tab\/>/g, " ")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .split("\n")
      .map((line) => xmlDecode(line).trim())
      .filter(Boolean)
      .join("\n"),
  );
}

function readZipEntries(buffer) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66_000); i--) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("DOCX inválido: diretório ZIP não encontrado.");

  const entries = [];
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);

  for (let i = 0; i < totalEntries; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("DOCX inválido: cabeçalho ZIP central corrompido.");
    }

    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    entries.push({ name, method, compressedSize, localHeaderOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function extractZipEntry(buffer, entry) {
  const localOffset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error(`DOCX inválido: cabeçalho local não encontrado em ${entry.name}.`);
  }

  const fileNameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return compressed;
  if (entry.method === 8) return zlib.inflateRawSync(compressed);
  throw new Error(`Método ZIP não suportado em ${entry.name}: ${entry.method}`);
}

async function extractDocxText(filePath) {
  const buffer = await fs.readFile(filePath);
  const entries = readZipEntries(buffer);
  const wanted = entries.filter((entry) =>
    /^word\/(document|footnotes|endnotes|header\d+|footer\d+)\.xml$/i.test(entry.name),
  );
  if (wanted.length === 0) throw new Error("Nenhum XML de texto foi encontrado no DOCX.");

  return normalizeText(
    wanted
      .map((entry) => extractTextFromXml(extractZipEntry(buffer, entry).toString("utf8")))
      .filter(Boolean)
      .join("\n\n"),
  );
}

function pythonCandidates() {
  const candidates = [
    process.env.AUTHORVOICE_PYTHON,
    process.env.PYTHON,
  ];
  if (process.env.USERPROFILE) {
    candidates.push(
      path.join(
        process.env.USERPROFILE,
        ".cache",
        "codex-runtimes",
        "codex-primary-runtime",
        "dependencies",
        "python",
        "python.exe",
      ),
    );
  }
  candidates.push("python", "py");
  return candidates.filter(Boolean);
}

function extractPdfTextWithPython(filePath) {
  const code = `
import sys
from pypdf import PdfReader
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
reader = PdfReader(sys.argv[1])
parts = []
for page in reader.pages:
    try:
        text = page.extract_text() or ""
    except Exception:
        text = ""
    text = text.strip()
    if text:
        parts.append(text)
sys.stdout.write("\\n\\n".join(parts))
`;

  const errors = [];
  for (const candidate of pythonCandidates()) {
    const result = spawnSync(candidate, ["-c", code, filePath], {
      encoding: "utf8",
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      maxBuffer: 80 * 1024 * 1024,
      windowsHide: true,
    });
    if (result.status === 0 && result.stdout.trim()) return normalizeText(result.stdout);
    errors.push(`${candidate}: ${result.stderr || result.error?.message || `exit ${result.status}`}`);
  }
  throw new Error(`Não foi possível extrair PDF com pypdf.\n${errors.join("\n")}`);
}

async function findSourceFile(spec) {
  const files = await fs.readdir(importsDir);
  const byLooseName = new Map(files.map((file) => [looseKey(file), file]));
  for (const name of spec.names) {
    const found = byLooseName.get(looseKey(name));
    if (found) return path.join(importsDir, found);
  }
  throw new Error(`Arquivo não encontrado em book-imports: ${spec.names.join(" | ")}`);
}

async function extractSource(spec) {
  const filePath = await findSourceFile(spec);
  const text =
    spec.type === "docx"
      ? await extractDocxText(filePath)
      : extractPdfTextWithPython(filePath);

  return {
    ...spec,
    sourceFile: path.basename(filePath),
    text,
    charCount: text.length,
  };
}

function splitIntoChunks(text) {
  const paragraphs = normalizeText(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 35)
    .filter((line) => !/^\d+$/.test(line))
    .filter((line) => !/^p[áa]gina\s+\d+/i.test(line));

  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n${paragraph}` : paragraph;
    if (next.length > 900 && current.length > 260) {
      chunks.push(current);
      current = paragraph;
      continue;
    }
    current = next;
  }
  if (current.length > 0) chunks.push(current);
  return chunks.filter((chunk) => chunk.length >= 160);
}

function wordsOf(text) {
  return (text.toLowerCase().match(/[\p{L}]{4,}/gu) || [])
    .map((word) => word.normalize("NFC"))
    .filter((word) => !stopwords.has(word));
}

function detectByDictionary(text, detectors, key, fallback) {
  const lower = text.toLowerCase();
  const scored = detectors
    .map((detector) => ({
      value: detector[key],
      score: detector.words.reduce(
        (total, word) => total + (lower.includes(word.toLowerCase()) ? 1 : 0),
        0,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.value.localeCompare(b.value));
  const values = [...new Set(scored.map((item) => item.value))];
  return values.length > 0 ? values.slice(0, 5) : fallback;
}

function extractVocabulary(text, fallbackThemes = []) {
  const counts = new Map();
  for (const word of wordsOf(text)) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  const words = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word)
    .filter((word) => !genericBlocklist.some((phrase) => phrase.includes(word)))
    .slice(0, 8);

  return [...new Set([...words, ...fallbackThemes])].slice(0, 8);
}

function archetypesFor(themes, recipients = []) {
  const archetypes = new Set();
  for (const theme of themes) {
    if (theme === "perda") archetypes.add("a pessoa que tenta continuar carregando uma ausência");
    if (theme === "recomeço") archetypes.add("quem caiu, respirou fundo e decidiu não morar na queda");
    if (theme === "silêncio") archetypes.add("a alma que fala pouco porque sente demais");
    if (theme === "abandono") archetypes.add("quem foi deixado, mas começa a voltar para si");
    if (theme === "identidade") archetypes.add("a pessoa que cansou de parecer forte para ser aceita");
    if (theme === "propósito") archetypes.add("quem procura sentido sem negar o peso do caminho");
    if (theme === "gratidão") archetypes.add("o coração que reconhece cuidado no detalhe");
    if (theme === "esperança") archetypes.add("quem guarda uma luz pequena em dia difícil");
    if (theme === "coragem") archetypes.add("quem enfrenta o impossível sem perder a ternura");
    if (theme === "resiliência") archetypes.add("a pessoa que transforma cicatriz em direção");
    if (theme === "fé") archetypes.add("quem ora mesmo quando a resposta demora");
    if (theme === "transformação") archetypes.add("quem aceita mudar sem trair a própria alma");
    if (theme === "amor") archetypes.add("quem ama como quem oferece abrigo");
    if (theme === "saudade") archetypes.add("quem conversa com a lembrança para não perder a presença");
  }
  for (const recipient of recipients) {
    if (recipient === "mãe") archetypes.add("a mãe como colo, oração e memória de cuidado");
    if (recipient === "pai") archetypes.add("o pai como presença, falta ou proteção que molda a alma");
    if (recipient === "família") archetypes.add("a família como casa emocional que precisa de verdade");
    if (recipient === "amigo") archetypes.add("o amigo como presença que escuta sem julgar");
  }
  return [...archetypes].slice(0, 3);
}

function reflectionFor(themes, index) {
  const theme = themes[0] || "fé";
  const options = themeReflections[theme] || themeReflections.fé;
  return options[index % options.length];
}

function toneFor(book, themes, emotions) {
  if (themes.includes("fé") || themes.includes("FFP")) return "espiritual, íntimo, esperançoso e prático";
  if (themes.includes("silêncio") || themes.includes("identidade")) return "confessional, profundo, humano e restaurador";
  if (themes.includes("coragem") || themes.includes("resiliência")) return "forte, sensível, resiliente e sem triunfalismo";
  if (themes.includes("amor") || themes.includes("saudade")) return "afetivo, poético, saudoso e delicado";
  if (book === "Poemas revisado") return "poético, breve, imagético e emocional";
  if (emotions.includes("dor")) return "dolorido, acolhedor, maduro e verdadeiro";
  return "autoral, emocional, íntimo e reflexivo";
}

function narrativeFor(themes, index) {
  if (themes.includes("fé") || themes.includes("FFP")) return narrativePatterns[2];
  if (themes.includes("saudade") || themes.includes("perda")) return narrativePatterns[4];
  if (themes.includes("identidade") || themes.includes("abandono")) return narrativePatterns[3];
  return narrativePatterns[index % narrativePatterns.length];
}

function impactFor(themes, index) {
  const theme = themes[0] || "";
  const byTheme = {
    fé: "Fé não acelera o relógio; ela sustenta a alma enquanto Deus trabalha.",
    FFP: "Fé, força e paciência: três passos para não entregar a alma ao cansaço.",
    silêncio: "O silêncio também ora quando a alma já não encontra voz.",
    recomeço: "Recomeçar é assinar a própria vida depois de uma página rasgada.",
    coragem: "Coragem é caminhar com medo sem entregar o volante ao medo.",
    perda: "A saudade é presença sem corpo, mas com memória dentro da alma.",
    saudade: "A saudade é presença sem corpo, mas com memória dentro da alma.",
    identidade: "Quem volta para si deixa de implorar morada em corações fechados.",
    resiliência: "A cicatriz não é o fim da beleza; é a prova de que a vida continuou.",
    amor: "O amor que cuida não precisa gritar para ser inteiro.",
  };
  return byTheme[theme] || impactTemplates[index % impactTemplates.length];
}

function sourceFingerprint(text) {
  const vocabulary = extractVocabulary(text);
  const hash = crypto.createHash("sha1").update(normalizeText(text), "utf8").digest("hex").slice(0, 10);
  return `${hash}:${vocabulary.slice(0, 4).join("-")}`;
}

function makeSeed({ id, kind, source, chunk = "", themes, emotions, recipients = [], index }) {
  const selectedThemes =
    themes || detectByDictionary(chunk, themeDetectors, "theme", ["fé", "recomeço"]);
  const selectedEmotions =
    emotions || detectByDictionary(chunk, emotionDetectors, "emotion", ["esperança"]);
  const selectedRecipients =
    recipients.length > 0
      ? recipients
      : detectByDictionary(chunk, recipientDetectors, "recipient", []);

  return {
    id,
    kind,
    sourceBook: source.book,
    sourceFile: source.sourceFile,
    themes: selectedThemes.slice(0, 5),
    emotions: selectedEmotions.slice(0, 4),
    recipients: selectedRecipients.slice(0, 4),
    archetypes: archetypesFor(selectedThemes, selectedRecipients),
    reflection: reflectionFor(selectedThemes, index),
    impact: impactFor(selectedThemes, index),
    vocabulary: extractVocabulary(chunk, selectedThemes),
    tone: toneFor(source.book, selectedThemes, selectedEmotions),
    narrativePattern: narrativeFor(selectedThemes, index),
    styleRules: voiceRules.slice(index % 3, (index % 3) + 3),
    sourceFingerprint: sourceFingerprint(`${source.book}:${chunk}:${selectedThemes.join(",")}`),
  };
}

function roundRobinBySource(sources) {
  const chunksByBook = sources.map((source) => ({
    source,
    chunks: splitIntoChunks(source.text)
      .map((chunk) => ({
        chunk,
        score:
          detectByDictionary(chunk, themeDetectors, "theme", []).length * 6 +
          detectByDictionary(chunk, emotionDetectors, "emotion", []).length * 4 +
          extractVocabulary(chunk).length,
      }))
      .sort((a, b) => b.score - a.score),
  }));

  const selected = [];
  let cursor = 0;
  while (selected.length < 150) {
    const group = chunksByBook[cursor % chunksByBook.length];
    const item = group.chunks[Math.floor(cursor / chunksByBook.length) % group.chunks.length];
    selected.push({ source: group.source, chunk: item.chunk });
    cursor++;
  }
  return selected;
}

function buildSeeds(sources) {
  const seeds = [];
  let index = 0;

  for (const item of roundRobinBySource(sources)) {
    seeds.push(
      makeSeed({
        id: `avs-text-${String(index + 1).padStart(3, "0")}`,
        kind: "textual-signal",
        source: item.source,
        chunk: item.chunk,
        index,
      }),
    );
    index++;
  }

  const requiredThemes = [
    "perda", "recomeço", "silêncio", "abandono", "identidade", "propósito",
    "gratidão", "esperança", "coragem", "resiliência", "fé", "transformação",
  ];
  for (const theme of requiredThemes) {
    for (let i = 0; i < 3; i++) {
      const source = sources[(index + i) % sources.length];
      seeds.push(
        makeSeed({
          id: `avs-theme-${theme}-${i + 1}`,
          kind: "theme",
          source,
          chunk: `${theme} ${source.text.slice(0, 800)}`,
          themes: [theme],
          emotions: detectByDictionary(`${theme} ${source.text}`, emotionDetectors, "emotion", ["esperança"]),
          index,
        }),
      );
      index++;
    }
  }

  const recipients = ["mãe", "pai", "esposa", "marido", "namorado", "namorada", "amigo", "família"];
  for (const recipient of recipients) {
    for (let i = 0; i < 3; i++) {
      const source = sources[(index + i) % sources.length];
      const theme = recipient === "amigo" ? "amizade" : recipient === "família" ? "família" : "amor";
      seeds.push(
        makeSeed({
          id: `avs-recipient-${recipient}-${i + 1}`,
          kind: "recipient",
          source,
          chunk: `${recipient} ${theme} cuidado presença alma`,
          themes: [theme, recipient],
          emotions: recipient === "mãe" || recipient === "família" ? ["gratidão", "amor"] : ["amor", "saudade"],
          recipients: [recipient],
          index,
        }),
      );
      index++;
    }
  }

  for (let i = 0; i < 12; i++) {
    const source = sources[i % sources.length];
    seeds.push(
      makeSeed({
        id: `avs-ffp-${String(i + 1).padStart(2, "0")}`,
        kind: "ffp",
        source,
        chunk: "fé força paciência espera luta oração coragem hoje Deus impossível",
        themes: ["FFP", "fé", i % 2 === 0 ? "coragem" : "resiliência"],
        emotions: ["fé", "coragem", "esperança"],
        index,
      }),
    );
    index++;
  }

  for (let i = 0; i < 18; i++) {
    const source = sources[i % sources.length];
    const theme = ["silêncio", "identidade", "recomeço", "fé", "saudade", "transformação"][i % 6];
    seeds.push(
      makeSeed({
        id: `avs-voice-${String(i + 1).padStart(2, "0")}`,
        kind: "voice-pattern",
        source,
        chunk: `${theme} alma silêncio hoje verdade oração caminho cicatriz`,
        themes: [theme],
        emotions: detectByDictionary(theme, emotionDetectors, "emotion", ["dor", "esperança"]),
        index,
      }),
    );
    index++;
  }

  return seeds.slice(0, targetSeedCount);
}

function tsString(value) {
  return JSON.stringify(value, null, 2);
}

function renderTypeScript(seeds, sources) {
  const stats = {
    generatedAt: new Date().toISOString(),
    totalSeeds: seeds.length,
    sourceFiles: sources.map((source) => ({
      book: source.book,
      file: source.sourceFile,
      charactersRead: source.charCount,
    })),
    note: "Base autoral gerada automaticamente a partir de sinais temáticos dos livros. Não armazena capítulos ou trechos longos literais.",
  };

  return `// Auto-generated by scripts/buildAuthorVoiceBase.mjs. Do not edit by hand.

export type AuthorVoiceKind =
  | "textual-signal"
  | "theme"
  | "recipient"
  | "ffp"
  | "voice-pattern";

export interface AuthorVoiceSeed {
  id: string;
  kind: AuthorVoiceKind;
  sourceBook: string;
  sourceFile: string;
  themes: string[];
  emotions: string[];
  recipients: string[];
  archetypes: string[];
  reflection: string;
  impact: string;
  vocabulary: string[];
  tone: string;
  narrativePattern: string;
  styleRules: string[];
  sourceFingerprint: string;
}

export interface AuthorVoiceQuery {
  intention?: string;
  tone?: string;
  recipient?: string;
  limit?: number;
}

export const AUTHOR_VOICE_STATS = ${tsString(stats)} as const;

export const GENERIC_PHRASE_BLOCKLIST = ${tsString(genericBlocklist)} as const;

export const AUTHOR_VOICE_SEEDS: AuthorVoiceSeed[] = ${tsString(seeds)};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase();
}

const toneThemeMap: Record<string, string[]> = {
  romantica: ["amor", "saudade"],
  emocionante: ["identidade", "silêncio", "amor"],
  fe: ["fé", "FFP", "esperança"],
  gratidao: ["gratidão", "família", "amor"],
  perdao: ["recomeço", "transformação", "abandono"],
  saudade: ["saudade", "perda", "silêncio"],
  motivacional: ["coragem", "resiliência", "propósito", "FFP"],
  reflexao: ["identidade", "silêncio", "transformação"],
};

function scoreSeed(seed: AuthorVoiceSeed, query: Required<AuthorVoiceQuery>): number {
  const haystack = normalize([
    query.intention,
    query.tone,
    query.recipient,
    ...seed.themes,
    ...seed.emotions,
    ...seed.recipients,
    ...seed.vocabulary,
  ].join(" "));
  const wantedToneThemes = toneThemeMap[normalize(query.tone)] || [];

  let score = 0;
  for (const theme of seed.themes) {
    if (normalize(query.intention).includes(normalize(theme))) score += 8;
    if (wantedToneThemes.map(normalize).includes(normalize(theme))) score += 6;
    if (haystack.includes(normalize(theme))) score += 1;
  }
  for (const emotion of seed.emotions) {
    if (normalize(query.intention).includes(normalize(emotion))) score += 5;
  }
  if (seed.recipients.some((item) => normalize(item) === normalize(query.recipient))) score += 10;
  if (seed.kind === "ffp" && /fe|motivacional|reflexao/.test(normalize(query.tone))) score += 5;
  if (seed.kind === "recipient" && seed.recipients.length > 0) score += 2;
  return score;
}

export function findAuthorVoiceSeeds(query: AuthorVoiceQuery): AuthorVoiceSeed[] {
  const safeQuery: Required<AuthorVoiceQuery> = {
    intention: query.intention || "",
    tone: query.tone || "",
    recipient: query.recipient || "",
    limit: query.limit || 9,
  };

  return AUTHOR_VOICE_SEEDS
    .map((seed, index) => ({ seed, index, score: scoreSeed(seed, safeQuery) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, safeQuery.limit)
    .map((item) => item.seed);
}

export function buildAuthorVoiceContext(seeds: AuthorVoiceSeed[]): string {
  return seeds
    .map((seed, index) => [
      \`\${index + 1}. Fonte autoral: \${seed.sourceBook}\`,
      \`Tipo de sinal: \${seed.kind}\`,
      \`Temas: \${seed.themes.join(", ")}\`,
      \`Emoções: \${seed.emotions.join(", ")}\`,
      \`Arquétipos: \${seed.archetypes.join(" | ")}\`,
      \`Reflexão autoral reescrita: \${seed.reflection}\`,
      \`Frase de impacto original: \${seed.impact}\`,
      \`Vocabulário recorrente: \${seed.vocabulary.join(", ")}\`,
      \`Tom: \${seed.tone}\`,
      \`Estrutura narrativa: \${seed.narrativePattern}\`,
      \`Regras de voz: \${seed.styleRules.join("; ")}\`,
    ].join("\\n"))
    .join("\\n\\n");
}
`;
}

function createExampleMessage(label, seeds) {
  const seed = seeds[0];
  const second = seeds[1] || seed;
  const reflection = seed.reflection
    .replace(/[.!?]+$/g, "")
    .replace(/^./, (char) => char.toLowerCase());
  const impact = second.impact.replace(/[.!?]+$/g, "");

  const examples = {
    mãe: `Mãe, tem cuidado que a gente só entende quando a alma cansa e procura um colo que não exige explicação. Eu queria transformar minha gratidão em presença, porque ${reflection}. Se algum dia minhas palavras parecerem pequenas, que pelo menos carreguem verdade: ${impact}.`,
    pai: `Pai, nem toda presença precisa saber falar bonito; às vezes ela marca a vida no silêncio, no esforço e no jeito de permanecer. Eu escrevo com respeito pelo que foi difícil dizer e pelo que ainda merece ser curado. ${impact}.`,
    esposa: `Minha esposa, eu não quero te entregar uma frase pronta, quero te entregar um pedaço honesto do que mora em mim. Amar você também é aprender a cuidar do que o tempo tenta tornar comum, porque ${reflection}. O amor que permanece vira abrigo sem precisar fazer barulho.`,
    amigo: `Amigo, tem gente que chega como resposta em dias que a alma nem sabia mais pedir ajuda. Eu reconheço a sua presença sem enfeite, com gratidão e verdade, porque ${reflection}. Que você nunca duvide do bem que sua existência já fez no meu caminho.`,
    família: `Família, casa de verdade não é onde ninguém se fere, é onde a verdade ainda encontra caminho para voltar. Eu escrevo porque vínculo também precisa de cuidado, perdão e presença. ${impact}.`,
    amor: `Meu amor, eu queria te falar sem pressa, como quem abre uma janela dentro do peito. O que sinto por você não cabe em frase fácil, porque ${reflection}. Que o nosso amor continue sendo presença, cuidado e escolha nos dias bonitos e nos dias difíceis.`,
    recomeço: `Recomeçar não é fingir que a queda não existiu; é decidir que ela não terá a última palavra. Eu volto para o hoje com Fé, Força e Paciência, porque a alma também aprende a caminhar depois de se quebrar. ${impact}.`,
    fé: `Fé, para mim, é continuar conversando com Deus quando a resposta ainda está sendo formada no invisível. Eu sigo com Força para atravessar o dia e Paciência para não confundir demora com abandono. ${impact}.`,
    silêncio: `Silêncio, às vezes, não é frieza; é um quarto da alma onde a dor senta para tentar entender o próprio nome. Eu respeito esse lugar sem pressa, porque ${reflection}. O que é profundo não precisa gritar para permanecer.`,
  };

  return examples[label] || `${label}, ${reflection}. ${impact}.`;
}

async function main() {
  const sources = [];
  for (const spec of sourceSpecs) {
    const source = await extractSource(spec);
    sources.push(source);
    console.log(`${source.book}: ${source.charCount} caracteres extraídos de ${source.sourceFile}`);
  }

  const seeds = buildSeeds(sources);
  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, renderTypeScript(seeds, sources), "utf8");
  console.log(`\nBase autoral gerada: ${outputFile}`);
  console.log(`Entradas criadas: ${seeds.length}`);

  if (process.argv.includes("--examples")) {
    const examples = ["mãe", "pai", "esposa", "amigo", "família", "amor", "recomeço", "fé", "silêncio"];
    console.log("\nExemplos locais de voz autoral:\n");
    for (const label of examples) {
      const related = seeds
        .filter((seed) =>
          seed.recipients.includes(label) ||
          seed.themes.includes(label) ||
          (label === "amor" && seed.themes.includes("amor")) ||
          (label === "fé" && seed.themes.includes("fé")),
        )
        .slice(0, 4);
      console.log(`- ${label}: ${createExampleMessage(label, related.length ? related : seeds)}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
