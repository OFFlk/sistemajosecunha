# Handoff v4 — Módulo Histórico + Atas (registro final)

Substitui `handoff-historico-v3.md`. Atualizado em 07/10/2026. Módulo considerado concluído; este arquivo é só registro das alterações.

## Arquivos alterados nesta rodada

| Arquivo | O que mudou |
|---|---|
| `historico_auto.html` | Pesquisa por consulta direcionada; turmas lidas só do aluno selecionado; toast de carregamento fecha ao terminar; código morto removido |
| `historico-aluno.html` | Fallback de colunas alinhado ao schema padrão |
| `cadastro-atas.html` | Colunas padrão novas; hard refresh após salvar; aluno de turma multisseriada escolhe qualquer série real |
| `cadastro-turmas.html` | Série "Multisseriada"; acrescenta o ano ao índice de anos ao salvar |
| `gestao-atas.html` | Card "Índice de anos" com botão Reconstruir |
| `pesquisa-ata.html` | Leitura sob demanda; filtro de série em chips; limpar filtros; select de ano pelo índice |
| `firestore.rules` | Gestor pode atualizar só o campo `atasIndice` do doc da escola |

## Decisões e regras

- **Schema padrão** de matérias: `lp, edf, art, mat, his, geo, cie, er, ing`. `getDefaultConfig()` de `cadastro-atas` e `pesquisa-ata` usa esses valores (o de `cadastro-turmas` não é usado).
- **Séries** (lista fixa): Alfabetização, Eixo 1–3, 1ª–8ª série, 1º–9º ano, Multisseriada. Vive em `cadastro-turmas` (`serieOptions`), `pesquisa-ata` (`SERIES_FILTRO`) e `cadastro-atas` (`SERIES_REAIS`, sem Multisseriada). **Manter idênticas.**
- **Multisseriada:** é série da turma; os alunos dela recebem séries reais (qualquer uma da lista).
- **Histórico:** o que não bate com o padrão da página é ignorado.
- **Índice de anos:** `schools/{escola}.atasIndice.anos` (texto, mais recente primeiro). `cadastro-turmas` só acrescenta se o índice já existir; criar/refazer é em Gestão de Atas → Reconstruir. Sem índice, a pesquisa usa a lista fixa (ano seguinte até `ANO_MIN_ATAS = 2000`).
- **Pesquisa de atas:** nada é lido ao abrir (só o índice). Ano, turno e série viram consulta no Firestore (ano em texto e número); busca geral só refina e não pesquisa sozinha. Turmas já lidas ficam em memória da página e buscas iguais ou mais estreitas não leem de novo. Sem localStorage.
- **Pesquisa por aluno** (`pesquisa-ata`): início do nome (mín. 3 letras) + matrículas; a turma só é lida ao clicar em Abrir.
- `anoLetivo` pode estar gravado como texto ou número; a pesquisa trata os dois.

## Pendências opcionais

- Nomes corrigidos no IDaluno não aparecem na tabela de alunos da turma em `pesquisa-ata` (o catálogo `Identidade.lerTodos` não existe mais).
- Filtro de série não considera as séries dos alunos de turmas multisseriadas.
- Importação de planilha em `cadastro-atas` faz buscas automáticas por aluno (ponto mais caro do módulo).
