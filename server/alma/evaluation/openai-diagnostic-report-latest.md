# Diagnostico OpenAI do Motor Alma

Gerado em: 2026-06-29 18:32 America/Bahia

## Escopo

Este diagnostico investigou exclusivamente a configuracao OpenAI usada pelo Motor Alma. Nao foram alterados prompts, pesos de avaliacao, RAG, frontend, endpoint publico ou fluxo principal de geracao.

## Resumo Executivo

O erro observado em `npm.cmd run alma:quality` e realmente um erro de quota/billing retornado pela API da OpenAI.

Evidencias principais:

- A variavel `OPENAI_API_KEY` existe no `.env` real e e carregada pelo runtime Node.
- A chave carregada tem prefixo `sk-proj***`, indicando uma chave de projeto OpenAI.
- A chamada chega ate a API da OpenAI e retorna `HTTP 429` com motivo `insufficient_quota`.
- O erro ocorre na chamada de geracao de texto `client.responses.create(...)`, nao na avaliacao local.
- Nao ha fallback local ou modelo alternativo configurado para substituir a OpenAI.

Conclusao: a causa mais provavel nao e ausencia de chave nem nome incorreto de variavel. A causa e falta de quota/billing no projeto/organizacao associado a chave `OPENAI_API_KEY` carregada.

## Variaveis De Ambiente Verificadas

Arquivo `.env` real:

| Variavel | Status | Valor observado |
| --- | --- | --- |
| `OPENAI_API_KEY` | presente | `sk-proj***`, 164 caracteres |
| `OPENAI_MODEL` | presente | `gpt-4.1-mini` |
| `OPENAI_EMBEDDING_MODEL` | ausente | fallback interno: `text-embedding-3-small` |
| `OPENAI_ORG` | ausente | nao configurado |
| `OPENAI_ORGANIZATION` | ausente | nao configurado |
| `OPENAI_PROJECT` | ausente | nao configurado |

Runtime Node com `dotenv/config`:

| Campo | Resultado |
| --- | --- |
| `OPENAI_API_KEY` carregada | sim |
| Prefixo mascarado | `sk-proj***` |
| Tamanho | 164 caracteres |
| `OPENAI_MODEL` | `gpt-4.1-mini` |
| `OPENAI_EMBEDDING_MODEL` | nao definido |
| Organizacao/projeto explicito | nao definido |

## Arquivo Onde O Erro Ocorre

Arquivo responsavel pela geracao:

`server/motorAlma.js`

Pontos relevantes:

- Linhas 17-19: cria o cliente OpenAI com `apiKey: process.env.OPENAI_API_KEY`.
- Linhas 24-26: valida se `OPENAI_API_KEY` existe.
- Linha 79: define o modelo como `process.env.OPENAI_MODEL || "gpt-4.1-mini"`.
- Linhas 83-98: executa `client.responses.create(...)`.
- Linhas 107-115: registra o erro OpenAI com `httpStatus` e `reason`, sem registrar prompt completo.

Chamada responsavel:

```js
response = await client.responses.create({
  model,
  input: [
    { role: "system", content: PROMPT_ALMA_ESCRITA },
    { role: "user", content: promptFinal }
  ],
  temperature: 0.85,
  max_output_tokens: 700
});
```

## Modelo Utilizado

Modelo de geracao usado no ciclo de qualidade:

`gpt-4.1-mini`

Origem:

- `.env`: `OPENAI_MODEL=gpt-4.1-mini`
- fallback em `server/motorAlma.js`: `"gpt-4.1-mini"` caso `OPENAI_MODEL` nao exista.

## Fallbacks Existentes

Geracao de mensagens:

- Nao existe fallback local.
- Nao existe fallback para outro provedor.
- Nao existe fallback para outro modelo se a OpenAI retornar erro.
- Se a OpenAI falha, o erro sobe para o endpoint/script e a mensagem nao e inventada localmente.

Modelo:

- Existe apenas fallback de configuracao para o nome do modelo: se `OPENAI_MODEL` estiver ausente, usa `gpt-4.1-mini`.
- Esse fallback nao contorna quota/billing.

Embeddings/RAG:

- `server/alma/rag/embeddings.js` usa `OPENAI_API_KEY`.
- Modelo default de embeddings: `text-embedding-3-small`.
- O erro atual de `alma:quality` foi registrado como `openai.responses.error`, portanto vem da chamada de geracao textual em `server/motorAlma.js`, nao da chamada de embeddings.

## Organizacao/Projeto OpenAI

Nao ha configuracao explicita de organizacao ou projeto no codigo ou `.env`:

- `OPENAI_ORG`: ausente
- `OPENAI_ORGANIZATION`: ausente
- `OPENAI_PROJECT`: ausente

Como a chave carregada tem prefixo `sk-proj***`, o projeto OpenAI e determinado pela propria chave. O codigo nao seleciona outro projeto manualmente.

O repositorio nao permite confirmar, sozinho, se essa chave pertence ao projeto OpenAI desejado. Isso precisa ser validado no painel da OpenAI, conferindo:

- projeto associado a chave `sk-proj***`;
- billing ativo no projeto/organizacao;
- saldo ou limite disponivel;
- permissoes da chave para Responses API;
- se a chave local `.env` e a chave correta para o projeto que deve financiar o Motor Alma.

## Origem Exata Do Erro 429

Durante `npm.cmd run alma:quality`, todos os 10 pedidos falharam com:

- `httpStatus`: `429`
- `reason`: `insufficient_quota`
- evento registrado: `openai.responses.error`
- modelo: `gpt-4.1-mini`

Baselines afetados:

- `baseline-20260629-181534.json`: 10 erros, 0 testes pontuados.
- `baseline-20260629-181934.json`: 10 erros, 0 testes pontuados.

Esse padrao indica que:

- a chave foi lida;
- o SDK conseguiu fazer a requisicao;
- a API reconheceu o request e recusou por quota insuficiente;
- a falha acontece antes de qualquer resposta textual, por isso a avaliacao literaria nao pontua nada.

## Variaveis Necessarias

Obrigatorias para geracao:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

Opcionais/recomendadas para clareza operacional:

```env
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Atencao:

`OPENAI_PROJECT` ou `OPENAI_ORG` nao estao configuradas hoje. Se a estrategia da conta OpenAI exigir selecao explicita de organizacao/projeto, isso deve ser decidido antes de qualquer alteracao, porque hoje o projeto e inferido pela chave `sk-proj***`.

## O Que Corrigir Para `alma:quality` Voltar A Gerar Textos

1. Verificar no painel da OpenAI se a chave `sk-proj***` carregada no `.env` pertence ao projeto correto do Motor Alma.
2. Confirmar que esse projeto/organizacao tem billing ativo.
3. Confirmar que ha saldo, limite mensal ou credito disponivel.
4. Se a chave estiver apontando para projeto errado, substituir `OPENAI_API_KEY` no `.env` por uma chave do projeto correto.
5. Se a chave estiver correta, corrigir quota/billing/limites no painel da OpenAI.
6. Depois da correcao, rodar novamente:

```powershell
npm.cmd run alma:quality
npm.cmd run alma:compare
```

## Recomendacao

Nao calibrar pesos, criterios ou prompts enquanto o erro `429 insufficient_quota` persistir.

A proxima execucao valida deve ter pelo menos uma resposta gerada e, idealmente, `ERROR: 0`. Ate la, qualquer baseline mede indisponibilidade operacional, nao identidade literaria.
