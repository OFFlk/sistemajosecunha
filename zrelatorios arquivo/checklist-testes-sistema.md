# Pendências — redesenho de identidade + módulo de Atas (v19)

> Continuação de `checklist-testes-sistema-v18.md`. Esta rodada foi em cima de
> `gestao-atas.html` (import em lote) e `idaluno.html` (verificação/fusão de
> identidade) — telas diferentes das que o v18 mexeu (`cadastro-atas.html`,
> `cadastro-turmas.html`, `pesquisa-ata.html`), então os dois handoffs cobrem
> partes complementares do sistema. Este documento junta os dois.

---

## 1. `gestao-atas.html` — o que foi feito nesta rodada

### 1.1 Pendência #5 do v18 — agrupamento automático — RESOLVIDA E TESTADA
Era o bug antigo (registrado desde a v17): aluno que aparece em atas de anos
letivos diferentes dentro do MESMO xlsx recebia um `alunoId` novo por
ocorrência, porque a decisão automática só considerava candidato vindo do
catálogo já salvo (`origem==='catalogo'`), nunca candidato da própria
planilha (`origem==='lote'`).

**Fix implementado**: união automática por **union-find escopado à análise**,
com nós-âncora virtuais por `alunoId` de catálogo. Candidato de QUALQUER
origem (catálogo ou lote) que bata acima do corte de auto-confiança agora
gera uma união; a resolução só acontece depois que TODAS as abas selecionadas
já passaram pelo loop (um grupo pode atravessar abas diferentes). Três casos:
- **0 âncoras** (grupo 100% novo, aparece só dentro do próprio lote): cria
  **1 só** `alunoId` novo pro grupo inteiro, não um por ocorrência. A
  ocorrência mais próxima do ano-ativo decide `ultimoAnoRegistro`
  (recalculado à parte depois que as matrículas já estão salvas — não
  depende de qual ocorrência foi usada aqui).
- **1 âncora** (grupo bate com exatamente 1 ID já existente no catálogo):
  todo o grupo vincula a esse ID, com uma única chamada a
  `vincularAtasExplicito` (não uma por ocorrência).
- **2+ âncoras** (grupo bate com IDs de catálogo DIFERENTES ao mesmo tempo):
  vira pendência manual com um `<select>` (não checkbox) — decisão de qual
  ID (se algum) é humana, porque pode ser sinal de duplicata pré-existente
  no catálogo, não um problema deste import.

**Testado com xlsx real de 136 turmas** (~1 min de análise, sem uso excessivo
de CPU/RAM; confirmação levou ~1min30s). Feedback do teste gerou os fixes das
seções 1.2 a 1.5 abaixo.

### 1.2 Similaridade de nome — algoritmo reescrito
**Causa raiz encontrada no teste real**: `similaridade()` rodava Jaro-Winkler
na STRING INTEIRA do nome. Sobrenome comum e longo ("DOS SANTOS", "OLIVEIRA
SILVA") dominava a comparação de caracteres mesmo com primeiro/segundo nome
completamente diferentes — dava 85-90% pra pessoas claramente diferentes só
por parentesco/sobrenome de família, e ao mesmo tempo descontava demais só
por causa de um "DA"/"DE" faltando (erro de digitação óbvio).

**Fix**: agora compara **palavra por palavra na mesma posição** (ignorando
`de/da/do/das/dos` antes de comparar — motivo comum de erro de digitação sem
mudar quem é a pessoa) e combina por **média geométrica** (não média simples)
— uma palavra muito diferente derruba o placar geral mesmo que o sobrenome
bata perfeito. Quando o número de palavras não bate entre os dois nomes
(nome do meio composto adicionado/removido), cai pro Jaro-Winkler na string
inteira como antes (mais tolerante a esse caso específico).

Resultados nos exemplos reais reportados no teste:

| Par | Antes | Agora |
|---|---|---|
| JAIRO BORGES DOS SANTOS × CARLOS RIBEIRO DOS SANTOS (pessoas diferentes) | 86,2% | 71,9% |
| MARIA LUCIA ALVES DOS SANTOS × MARIA RAIMUNDA ALVES DOS SANTOS (diferentes) | 89,6% | 86,0% |
| GILDENE OLIVEIRA DA SILVA × GILDENE OLIVEIRA SILVA (mesma pessoa) | 95,3% | 100% |
| ANDSON DA SILVA ALVES × ADSON SILVA ALVES (mesma pessoa) | 85,5% | 98,3% |

Mesmo fix **portado pra `idaluno.html`** (usava a mesma função, com o mesmo
problema — ver seção 2).

### 1.3 Corte de similaridade subido: 85% → 88%
Mesmo com o fix do algoritmo, o par MARIA LUCIA/MARIA RAIMUNDA (pessoas
diferentes) ainda ficava acima de 85% (86%) — corte subido pra reduzir esse
tipo de falso-positivo. `SIMILARIDADE_AUTO` (94%, decide vínculo automático
sem perguntar) não mudou.

### 1.4 Cabeçalho da tabela de notas — sinônimo "SITUAÇÃO"
**Causa raiz**: a detecção da linha de cabeçalho exigia literalmente a
palavra "RESULTADO"; uma aba de teste usava "SITUAÇÃO" (sinônimo real usado
por algumas escolas/anos) e a aba inteira era bloqueada com "cabeçalho não
encontrado" — mensagem que dava a entender que era o cabeçalho DOCUMENTAL
(dados da escola/ata) que faltava, quando na verdade era só um indicador da
tabela.

**Fix**: "SITUAÇÃO" agora é aceito como sinônimo de "RESULTADO" tanto na
detecção da linha de cabeçalho quanto no mapeamento de colunas. A mensagem de
bloqueio (pro caso de outro sinônimo ainda desconhecido aparecer) agora deixa
explícito que é o cabeçalho da TABELA DE NOTAS, não o documental, e diz o que
está sendo procurado (Nº, Nome, Resultado/Situação).

### 1.5 Pendências de identidade sem indicação de turma
Faltava dizer qual aba/turma cada lado de uma pendência pertencia — o sistema
falava só o ano, dificultando achar a turma certa pra conferir manualmente.
**Fix**: pendências agora mostram a aba do aluno sendo analisado e, quando o
candidato vem de outra ocorrência do lote, a aba dele também.

### 1.6 Divergência de trajetória duplicada
Um aluno auto-resolvido (união automática, sem pendência) podia mesmo assim
aparecer na lista de divergências da turma com um aviso de trajetória —
sobra de um candidato descartado que não foi o que decidiu o vínculo de
verdade. **Fix**: alunos auto-resolvidos não geram mais essa divergência
solta.

### 1.7 Qual grafia vence num grupo 100% novo com nomes diferentes
Descoberta no teste: quando o mesmo aluno aparece 2+ vezes no MESMO import
com grafias diferentes (erro de digitação humano, ex.: "ANDSON DA SILVA
ALVES" numa aba e "ADSON SILVA ALVES" noutra) e NENHUMA das duas já existe no
catálogo, o grupo vira 1 ID novo só (fix da seção 1.1) — mas qual das duas
grafias fica registrada?

**Fix parcial**: a grafia usada agora é a mais completa entre todas as
ocorrências do grupo (mesmo critério de `_melhorNome` do
`identidade-aluno.js`: prefere a mais longa, com bônus por acento) — não mais
a grafia arbitrária de "quem virou raiz" da união. **Isso é só um palpite
razoável, não uma decisão confiável em todo caso** (nome maior nem sempre é o
certo) — ver correção manual na seção 2.

---

## 2. `idaluno.html` — o que foi feito nesta rodada

### 2.1 Fix de similaridade portado (mesmo da seção 1.2)
Mesma reescrita (comparação por token + média geométrica). Corte padrão do
slider "Similaridade mínima" subido de 85% para 88% (usuário ainda pode
ajustar na hora pela UI).

### 2.2 Funcionalidade nova: renomear aluno sem fundir
**Motivo**: o palpite de "nome mais longo" (seção 1.7) não é garantido —
quando sai errado, não existia NENHUMA forma de corrigir pela interface (só
duas IDs duplicadas podiam ter o nome escolhido, via fusão — um único ID com
nome errado não tinha jeito de corrigir sem editar o Firestore direto).

**Decisão de onde a correção manual deveria morar**: `idaluno.html`, não
`gestao-atas.html` — por ser a página que já concentra "gestão de identidade"
(verificação e fusão), em vez de espalhar essa responsabilidade também pela
tela de import.

**Implementado**: botão **"✏️ Renomear este aluno"**, ao lado do botão
"🔎 Este aluno tem duplicata" existente. Pede o novo nome, confirma, e salva
via `salvarAtas()` (função que já existia em `identidade-aluno.js`, recalcula
`nomeBusca` sozinha — nenhuma mudança necessária nesse arquivo). Só funciona
pro lado Atas (avisa e recusa se o aluno só existir no Ano-Ativo). Não altera
o nome já gravado nas matrículas antigas — só o cadastro/identidade.

### 2.3 Referências ao arquivo antigo `cadastro-turma.html` corrigidas
Achado ao investigar a pendência #1 do v18 (checar se outros arquivos ainda
linkam pro arquivo antigo aposentado): `idaluno.html` tinha **duas menções em
texto** (não links de fato, mas texto lido pelo usuário e um comentário de
código) ao nome antigo `cadastro-turma.html` — desatualizadas desde a divisão
em `cadastro-turmas.html`/`cadastro-atas.html`:
- Parágrafo de instrução na UI (linha ~240): corrigido pra
  `cadastro-atas.html`.
- Comentário de código perto de "IDs automáticos" (linha ~460): corrigido
  pra `cadastro-atas.html` (`garantirIdsESistemaParaTurma()`) + menção a
  `gestao-atas.html` pro caminho de criação em lote.

`gestao-atas.html` foi conferido e **não tem nenhuma referência** ao nome
antigo.

---

## 3. Pendências em aberto (atualizado)

Em ordem de "provavelmente mais perto de ser retomado":

1. **Confirmar que nenhum outro arquivo linka pro `cadastro-turma.html`
   antigo** antes de apagá-lo do servidor. Status agora: `pesquisa-ata.html`
   (corrigido no v18), `historico-aluno.html` (aposentada, não precisa
   checar), `gestao-atas.html` (checado nesta rodada — limpo) e
   `idaluno.html` (só tinha texto/comentário desatualizado, corrigido nesta
   rodada — nunca foi link de fato). Ainda faltam checar outros arquivos do
   sistema fora do módulo Atas, se existirem.
2. **Re-testar no navegador os fixes desta rodada em `gestao-atas.html`**
   (similaridade, corte 88%, sinônimo "SITUAÇÃO", indicação de turma nas
   pendências, dedupe de divergência) — só foi validado por sintaxe e por
   scripts isolados reproduzindo os exemplos reportados, não rodado de novo
   no navegador com um xlsx real ainda.
3. **Re-testar `idaluno.html`** — botão de renomear e fix de similaridade
   ainda não testados no navegador nesta rodada.
4. **Nome não 100% confiável em grupos 100% novos** (seção 1.7) — o palpite
   de "nome mais longo" resolve o caso comum, mas não é garantido; a válvula
   de escape é o botão de renomear (seção 2.2), que exige uma checagem manual
   após imports grandes se houver desconfiança de erro de grafia.
5. **Exclusão de matrícula em `gestao-atas.html`** — não testada ainda
   (usuário testou tudo do import grande "menos exclusão").
6. **Leituras do Firestore no import grande (~4,1 mil)**: investigado nesta
   rodada, não é bug — é o custo esperado da busca de candidatos por prefixo
   (até 2 queries por aluno, até 25 docs cada, cacheadas só por prefixo exato
   dentro da mesma análise). Proporcional ao catálogo/quantidade de alunos
   importados, não uma re-leitura de verificação. **Decisão do usuário: não
   otimizar por agora.**

### Pendências herdadas do v18 (ainda não tocadas nesta rodada)
7. **Listener de scans duplicado com `?edit=`** em `cadastro-atas.html` —
   usuário pediu pra deixar quieto até terminar de testar o resto.
8. **Schema fixo em `pesquisa-ata.html`** não bate com o schema salvo em
   cada turma — só anotado, sem ação.
9. **Redesenho do fluxo "Inserir notas"** em `pesquisa-ata.html` — decisão do
   usuário: deixar por último, depois de fechar cadastro e pesquisa.

---

## 4. Arquivos entregues nesta rodada
- `gestao-atas.html` — agrupamento automático de identidade (unificação de
  lote+catálogo via union-find), similaridade reescrita, corte 88%, sinônimo
  de cabeçalho "SITUAÇÃO", indicação de turma nas pendências, dedupe de
  divergência.
- `idaluno.html` — similaridade reescrita (mesmo fix), corte padrão 88%,
  botão de renomear aluno sem fundir, referências ao arquivo antigo
  corrigidas.

## 5. Arquivos que o próximo chat vai precisar
Pra continuar de onde parou:
- Este documento (`checklist-testes-sistema-v19.md`).
- `gestao-atas.html` e `idaluno.html` — versões desta rodada (suba a mais
  atual se já tiver testado/ajustado algo por conta própria).
- `identidade-aluno.js`, `db.firebase.js`, `firestore.rules` — não mudaram
  nesta rodada, mas mantenha à mão (o botão de renomear depende da
  `salvarAtas()` que já existe nelas).
- Se for retomar o trabalho do v18 (`cadastro-atas.html`,
  `cadastro-turmas.html`, `pesquisa-ata.html`): esses arquivos não mudaram
  nesta rodada, suba as versões mais atuais que você tiver.
