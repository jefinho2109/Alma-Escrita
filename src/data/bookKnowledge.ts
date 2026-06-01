import type { Category, Mood } from "@/data/messages";

export interface BookSeed {
  id: string;
  book: "A Força do Hoje" | "Desafiando o Impossível" | "Eu Não Sou Quem Você Pensa";
  categories: Category[];
  moods: Mood[];
  themes: string[];
  essence: string;
  tone: string;
}

export const BOOK_SEEDS: BookSeed[] = [
  {
    id: "afh-fe-hoje-1",
    book: "A Força do Hoje",
    categories: ["Fé", "Motivação"],
    moods: ["Ansioso", "Sem força"],
    themes: ["fé", "hoje", "Deus", "coragem"],
    essence:
      "Viver o hoje com Deus, sem carregar todo o peso do amanhã antes da hora.",
    tone: "encorajador, espiritual, direto ao coração",
  },
  {
    id: "afh-paciencia-1",
    book: "A Força do Hoje",
    categories: ["Fé", "Recomeço"],
    moods: ["Ansioso", "Grato"],
    themes: ["paciência", "tempo", "oração", "esperança"],
    essence:
      "A paciência não é ficar parado; é continuar fazendo a parte possível enquanto Deus trabalha no invisível.",
    tone: "sereno, confiante, devocional",
  },
  {
    id: "afh-gratidao-1",
    book: "A Força do Hoje",
    categories: ["Gratidão", "Bom dia", "Boa Tarde", "Boa noite"],
    moods: ["Grato", "Feliz"],
    themes: ["gratidão", "vida", "pequenos milagres", "presença"],
    essence:
      "A vida ganha força quando a alma aprende a reconhecer os pequenos milagres do dia.",
    tone: "leve, luminoso, acolhedor",
  },
  {
    id: "afh-forca-1",
    book: "A Força do Hoje",
    categories: ["Motivação", "Superação"],
    moods: ["Sem força", "Triste"],
    themes: ["força", "dor", "esperança", "resistência"],
    essence:
      "Mesmo cansada, a pessoa ainda pode dar um pequeno passo; às vezes, esse passo é a vitória do dia.",
    tone: "forte, próximo, restaurador",
  },
  {
    id: "di-coragem-1",
    book: "Desafiando o Impossível",
    categories: ["Motivação", "Superação"],
    moods: ["Sem força", "Ansioso"],
    themes: ["coragem", "impossível", "luta", "resiliência"],
    essence:
      "O impossível perde tamanho quando a coragem decide se levantar antes do medo mandar.",
    tone: "intenso, guerreiro, inspirador",
  },
  {
    id: "di-ffp-1",
    book: "Desafiando o Impossível",
    categories: ["Fé", "Superação"],
    moods: ["Sem força", "Grato"],
    themes: ["FFP", "fé", "força", "paciência"],
    essence:
      "Fé, força e paciência sustentam quem aprendeu a lutar sem perder a alma no caminho.",
    tone: "marcante, autoral, espiritual",
  },
  {
    id: "di-jornada-1",
    book: "Desafiando o Impossível",
    categories: ["Superação", "Recomeço", "Reflexão"],
    moods: ["Triste", "Sem força"],
    themes: ["jornada", "queda", "aprendizado", "vitória"],
    essence:
      "As quedas não encerram a história; muitas vezes, elas ensinam a caminhar com mais propósito.",
    tone: "maduro, resiliente, esperançoso",
  },
  {
    id: "di-sonhos-1",
    book: "Desafiando o Impossível",
    categories: ["Motivação", "Gratidão"],
    moods: ["Feliz", "Grato"],
    themes: ["sonhos", "vida", "luta", "propósito"],
    essence:
      "Lutar pelos sonhos é honrar a vida que ainda pulsa, mesmo depois de dias difíceis.",
    tone: "vivo, otimista, firme",
  },
  {
    id: "ensqvp-silencio-1",
    book: "Eu Não Sou Quem Você Pensa",
    categories: ["Tristeza", "Superação", "Saudade"],
    moods: ["Triste", "Sem força"],
    themes: ["silêncio", "dor escondida", "verdade", "acolhimento"],
    essence:
      "Nem todo sorriso revela paz; algumas pessoas só aprenderam a esconder a dor para continuar de pé.",
    tone: "profundo, íntimo, sensível",
  },
  {
    id: "ensqvp-verdade-1",
    book: "Eu Não Sou Quem Você Pensa",
    categories: ["Recomeço", "Superação", "Reflexão"],
    moods: ["Triste", "Ansioso"],
    themes: ["verdade", "identidade", "cura", "recomeço"],
    essence:
      "A cura começa quando a pessoa deixa de viver para parecer forte e passa a se permitir ser verdadeira.",
    tone: "confessional, humano, libertador",
  },
  {
    id: "ensqvp-forca-1",
    book: "Eu Não Sou Quem Você Pensa",
    categories: ["Superação", "Motivação"],
    moods: ["Sem força", "Triste"],
    themes: ["força", "máscara", "cansaço", "reconstrução"],
    essence:
      "Ser forte não é aguentar tudo calado; é ter coragem de admitir que também precisa de cuidado.",
    tone: "acolhedor, verdadeiro, emocional",
  },
  {
    id: "ensqvp-amor-proprio-1",
    book: "Eu Não Sou Quem Você Pensa",
    categories: ["Amor", "Recomeço", "Mãe", "Família"],
    moods: ["Triste", "Grato"],
    themes: ["amor próprio", "verdade", "alma", "reencontro"],
    essence:
      "O reencontro mais importante é aquele em que a pessoa volta para si sem vergonha das próprias cicatrizes.",
    tone: "poético, íntimo, restaurador",
  },
];

export function findBookSeeds(category: Category | null, mood: Mood | null, limit = 4): BookSeed[] {
  const scored = BOOK_SEEDS.map((seed) => {
    let score = 0;
    if (category && seed.categories.includes(category)) score += 3;
    if (mood && seed.moods.includes(mood)) score += 3;
    if (mood === "Ansioso" && seed.themes.includes("paciência")) score += 1;
    if (mood === "Sem força" && seed.themes.includes("força")) score += 1;
    if (mood === "Triste" && seed.themes.includes("acolhimento")) score += 1;
    return { seed, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.seed);
}
