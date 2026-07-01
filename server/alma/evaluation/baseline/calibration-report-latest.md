# Relatorio de Calibracao do Motor Alma

Gerado em: 2026-06-29 18:19:34 America/Bahia

## Baseline Anterior

- Arquivo: `baseline-20260629-181534.json`
- Data/hora: `2026-06-29T21:15:34.000Z`
- Versao do Motor Alma: `0.1.0`
- Modelo OpenAI: `gpt-4.1-mini`
- Testes executados: 10
- Testes pontuados: 0
- Identidade Literaria media: 0/100
- PASS: 0
- REVIEW: 0
- ERROR: 10
- Duracao total: 180247 ms

## Baseline Atual

- Arquivo: `baseline-20260629-181934.json`
- Data/hora: `2026-06-29T21:19:34.222Z`
- Versao do Motor Alma: `0.1.0`
- Modelo OpenAI: `gpt-4.1-mini`
- Testes executados: 10
- Testes pontuados: 0
- Identidade Literaria media: 0/100
- PASS: 0
- REVIEW: 0
- ERROR: 10
- Duracao total: 180437 ms

## Diferencas Principais

| Metrica | Anterior | Atual | Diferenca | Status |
| --- | ---: | ---: | ---: | --- |
| Identidade final | 0 | 0 | 0 | permaneceu estavel |
| Acolhimento | 0 | 0 | 0 | permaneceu estavel |
| Profundidade | 0 | 0 | 0 | permaneceu estavel |
| Espiritualidade | 0 | 0 | 0 | permaneceu estavel |
| Esperanca | 0 | 0 | 0 | permaneceu estavel |
| Poeticidade | 0 | 0 | 0 | permaneceu estavel |
| Originalidade | 0 | 0 | 0 | permaneceu estavel |
| Naturalidade | 0 | 0 | 0 | permaneceu estavel |
| Duracao total | 180247 ms | 180437 ms | +190 ms | permaneceu estavel |

## Criterios Que Melhoraram

Nenhum criterio melhorou neste ciclo. A nota permaneceu em 0 porque todos os testes falharam antes da geracao de mensagem.

## Criterios Que Pioraram

Nenhum criterio piorou neste ciclo. A nota permaneceu em 0 porque todos os testes falharam antes da geracao de mensagem.

## Testes Instaveis

Todos os testes ficaram operacionalmente indisponiveis nos dois ciclos por `insufficient_quota` da OpenAI:

- `tristeza`
- `aniversario`
- `recomeco`
- `perda-de-fe`
- `bom-dia`
- `status`
- `romantica`
- `saudade`
- `gratidao`
- `ansiedade`

O comportamento foi consistente entre os dois baselines: 10 erros no baseline anterior e 10 erros no baseline atual. Isso confirma estabilidade do mecanismo de registro de falha, mas nao confirma estabilidade literaria do Motor Alma.

## Riscos De Calibrar Agora

- Nenhuma resposta foi gerada, entao nao ha evidencia literaria real para ajustar pesos.
- A media 0/100 representa falha operacional por quota, nao baixa qualidade textual.
- Ajustar pesos, prompts ou heuristicas agora poderia otimizar o sistema para um cenario de erro, nao para mensagens reais.
- Como `scoredTests` ficou em 0 nos dois ciclos, qualquer conclusao sobre identidade literaria seria estatisticamente invalida.
- A causa dominante e externa ao algoritmo de avaliacao: OpenAI retornou `429 insufficient_quota`.

## Recomendacao

Ainda nao e seguro ajustar pesos, prompts ou criterios de identidade literaria.

Recomendacao: corrigir a quota/billing da OpenAI, rodar pelo menos 3 ciclos completos de `npm.cmd run alma:quality` com geracoes bem-sucedidas e so entao comparar as medias. A calibracao deve comecar apenas quando houver respostas pontuadas em todos ou quase todos os 10 testes.

## Proximos Passos Sugeridos

1. Resolver `insufficient_quota` na conta/projeto OpenAI.
2. Rodar `npm.cmd run alma:quality` ate gerar um baseline com `ERROR: 0`.
3. Rodar mais dois ciclos para observar variacao natural entre respostas.
4. Usar `npm.cmd run alma:compare` para comparar baselines bem-sucedidos.
5. Ajustar pesos apenas se houver padrao recorrente de queda por criterio.
