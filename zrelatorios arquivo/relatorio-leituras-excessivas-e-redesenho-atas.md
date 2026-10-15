# Relatório — Leituras excessivas no Firestore + redesenho do módulo de Atas

> Continuação do relatório anterior (`/areas/firestore-leituras-excessivas.md`).
> Este documento fecha a investigação de causa raiz, registra a limpeza já feita,
> e desenha o schema do redesenho combinado nesta conversa. **Nada foi codado
> ainda** — é o desenho pra efetivar depois, nas páginas reais.

---

## 1. Causa raiz confirmada (atualizada)

A causa original identificada (contador atômico nunca decrementa + `identidade-aluno.js`
carregando a coleção `alunos` inteira a cada carga de página) segue válida, mas a
investigação nesta conversa achou o **mecanismo exato de acúmulo contínuo**:

- `gestao-atas.html` já tem uma rotina de GC (`_limparIdentidadesOrfas()`) que roda
  automaticamente ao apagar turma(s) pela tela normal — ela compara os `alunoId`
  das turmas apagadas contra o que sobra em outras turmas de Atas **e** em
  `anoAtivoMatriculas`, e só remove de `alunos` o que não aparece em nenhum dos dois.
  Essa parte já está correta e não precisa de mudança.
- O vazamento real acontece em **`admin_backup.html`**, usado pra reset rápido
  durante testes. O botão **"Apagar somente turmas"** (`apagarTurmas()`) apaga
  `turmas`, `atas`, `matriculas`, `anoAtivoTurmas` **e** `anoAtivoMatriculas`, mas
  **preserva `alunos` de propósito** (é o comportamento correto e intencional
  desse botão especificamente — decisão confirmada nesta conversa). Como ele apaga
  `anoAtivoMatriculas` na mesma ação, não sobra nenhuma referência pra uma GC
  algum dia perceber que aqueles `alunoId` ficaram órfãos.
  Combinado com o fato de que reimport de Atas sem CPF/nascimento **sempre** cria
  `alunoId` novo (não reaproveita — ver checklist v12), cada ciclo de
  "testar → apagar turmas → reimportar" empilha um lote de identidades que nunca
  mais são limpas por nenhuma rotina existente.
- **Decisão tomada**: não mexer em `apagarTurmas()`/`limparAlunosIds()` — o
  comportamento de cada botão está correto pelo desenho atual (dois níveis de
  reset: só turmas, ou alunos+turmas-relacionadas). O problema era de **uso**:
  durante teste, resets completos devem usar o botão **"Reset Total"** (que já
  apaga tudo, incluindo `alunos`), não "Apagar turmas" sozinho. Nenhum código
  muda em `admin_backup.html`.

## 2. Limpeza já executada

Diagnóstico rodado via console (script ad-hoc, somente leitura, depois limpeza
manual pelo usuário com apoio de outra IA):

| Escola | Total em `alunos` | Válidos (em `anoAtivoAlunos`) | Órfãos |
|---|---|---|---|
| ESCOLA_MUNICIPAL_JOSE_CUNHA | 148 | 146 | 2 |
| TESTE2 | 4 | 2 | 2 |

Resultado: **4 órfãos restantes**, considerados ruído aceitável (não vale o
esforço de tratar). Os ~17.800 órfãos do relatório original foram limpos.

**Achado de infraestrutura, registrado pra referência futura**: a regra de
segurança do Firestore (`firestore.rules`) libera `collectionGroup()` (consulta
entre todas as escolas de uma vez, pro admin global) apenas pra
`anoAtivoTurmas`/`anoAtivoAlunos`/`anoAtivoMatriculas`/`changeRequests` — não
para `alunos`, `turmas`, `atas` ou `matriculas` (módulo de Atas). Qualquer
ferramenta futura que precise ler essas coleções entre escolas de uma vez
precisa iterar escola por escola (via `schools/{schoolId}/...`), não usar
`collectionGroup`, a menos que uma regra nova seja adicionada.

## 3. Prevenção — itens discutidos, ainda em aberto

Estes dois pontos foram levantados nesta conversa mas **não fechados** — ficam
registrados como pendência pra retomar quando o redesenho abaixo for efetivado
(a arquitetura nova provavelmente já resolve boa parte deles por construção,
já que `alunos` deixa de ser fonte de listagem):

- **Auto-boot indiscriminado em `identidade-aluno.js`**: o script carrega o
  catálogo inteiro sozinho, no load de qualquer página que o inclua via
  `<script>`, mesmo que a página nunca use a API. Falta levantamento de quais
  páginas hoje incluem esse script sem necessidade real.
- **Arquitetura "carrega tudo pra buscar"**: `findOrCreate`/`findOrCreateBatch`
  sempre carregam o catálogo inteiro pra montar índices em memória (CPF, nome+
  nascimento), em vez de fazer buscas pontuais (`.where()`) no Firestore. Não é
  urgente hoje (152 docs), mas volta a doer conforme o catálogo real crescer
  com o tempo/mais escolas.

## 4. Redesenho do módulo — schema combinado

### Princípio geral
`alunos` deixa de ser fonte de listagem/dados. Vira **só um elo de confirmação**
entre um registro do módulo Atas e um registro do módulo Ano-Ativo que já foram
identificados como a mesma pessoa. Cada aluno vinculado existe com o **mesmo
`alunoId`** nas três coleções — não há mapeamento entre IDs diferentes, o
vínculo é feito por **reescrita** do ID de um dos lados na hora da fusão (mesmo
princípio de "fusão cross-módulo" que `idaluno.html` já faz hoje).

### `alunos/{alunoId}` — elo de confirmação (o que sobra da coleção antiga)
```
{
  alunoId,
  vinculadoEm: timestamp   // quando idaluno.html confirmou o vínculo
}
```
Só existe um doc aqui **depois** que alguém confirma manualmente, em
`idaluno.html`, que um registro de `alunos-atas` e um de `anoAtivoAlunos` são a
mesma pessoa. `idaluno.html` passa a ser a única página que escreve nesta
coleção.

### `alunos-atas/{alunoId}` — nova coleção, dados legíveis do módulo Atas
```
{
  alunoId,
  nome,
  ultimoAnoRegistro,     // ver cálculo abaixo
  atualizadoEm
}
```
Sem CPF, nascimento, mãe/pai — esses dados são exclusivos de `anoAtivoAlunos`.
Populada a partir do import de XLSX (mesmo fluxo de hoje), sem mudar o que já
existe em `matriculas`/`turmas`.

### `anoAtivoAlunos` — módulo Ano-Ativo, inalterado
Sem mudanças — mantém CPF, nascimento, mãe, pai, etc.

### Cálculo de `ultimoAnoRegistro` (feature nova — regra proposta)
Ancorado na função já existente que informa **o ano letivo ativo do sistema**
(módulo Ano-Ativo). Em vez de pegar o maior `anoLetivo` entre as matrículas do
aluno (vulnerável a erro de digitação/teste com ano futuro), pega a matrícula
cujo `anoLetivo` está **mais próximo** do ano letivo ativo.

> **Suposição a confirmar**: "mais próximo" aqui foi interpretado como o mais
> próximo **anterior ou igual** ao ano ativo (nunca um ano futuro — não faz
> sentido lógico "último registro" ser no futuro). Se a intenção for outra
> (ex.: mais próximo em qualquer direção), ajustar antes de implementar.

Fica em aberto, pra decidir na implementação:
- **Denormalizado** (gravado no doc, recalculado ao confirmar import, ao
  apagar turma, e ao fundir em `idaluno.html`) — leitura rápida, mais pontos
  de sincronização pra manter certos.
- **Calculado na hora** (query pontual em `matriculas` por `alunoId` a cada
  exibição) — sempre correto, custo desprezível (busca pontual, não coleção
  inteira).

## 5. Pendências pra quando for efetivar (fora do escopo desta conversa)

- Migração dos dados atuais pro novo schema (criar `alunos-atas` a partir do
  que já existe em `matriculas`/`turmas`; decidir o que fazer com o `alunos`
  atual, que hoje mistura dados dos dois módulos).
- Reescrever `identidade-aluno.js` pro novo modelo (parar de ser "catálogo
  geral", virar suporte de `alunos-atas` + o elo `alunos`).
- Atualizar `gestao-atas.html`, `pesquisa-ata.html` e qualquer outra página
  que referencie a coleção `alunos` hoje no sentido antigo.
- Implementar o cálculo de `ultimoAnoRegistro` (escolher denormalizado vs.
  calculado na hora, confirmar a suposição de direção "mais próximo").
- Revisar `idaluno.html` pro novo papel (só linkar Atas↔Ano-Ativo, sem mais
  nenhuma outra responsabilidade).
- Retomar os dois itens da seção 3 (auto-boot indiscriminado, arquitetura de
  carregamento) quando o redesenho estiver perto de ser efetivado.
