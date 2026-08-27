# Checklist de Testes — Sistema Escolar (pré-auditoria) — v13

> v1 tinha o levantamento inicial. v2 corrigiu escopo/contagem/RBAC/localStorage.
> v3 refletia a primeira rodada real de testes. v4 refletia a rodada de fixes
> em `cadastro_usuario.html` e `perfil.html`. v5 refletia a rodada de fixes em
> `cadastro-aluno-ativo.html`. v6 refletia a primeira rodada de testes do
> **módulo Admin**: `admin.html` e `schema_ata.html` testados sem erros,
> `admin_escolas.html` com 2 bugs achados e corrigidos, `cadastro_admin.html`
> com o bug já conhecido confirmado (email não atualizava na tela), e
> `idaluno.html` testado visualmente sem erros mas pendente de revisão de
> código. v7 refletiu a investigação do bug de email do `cadastro_admin.html`:
> causa raiz achada em `auth.firebase.js` (corrigido — bug #3 saiu da lista e
> foi pra **✅ Fixes aplicados**) e, como efeito colateral da investigação,
> uma **falha grave de segurança** achada nas Firestore Security Rules
> (escalonamento de privilégio via `users.update`, já corrigida) e uma
> **falha de exclusão** achada em `Auth.deleteUser()` (contas "excluídas"
> pelo painel continuavam válidas no Firebase Authentication — mitigada por
> ora, fix definitivo fica pendente). Esta **v8** fecha duas pendências sem
> nenhum código mexido: **`config.html`** confirmado órfão e já retirado do
> sistema (sai de "achado novo" e vai pra **✅ Decisões já tomadas**); e o
> possível bug de **`perfil.html`** (troca de email não chegando no primeiro
> endereço testado) foi retestado e confirmado como caso isolado, não bug de
> código — sai da lista de bugs. **v9** fecha de vez a pendência 🔴 mais
> antiga da lista: a exclusão real de contas no Firebase Authentication.
> Implementado como endpoint próprio (`functions/api/users-delete.js` no
> Cloudflare Pages, não Cloud Function do Firebase — sem custo), com
> autorização em duas camadas (admin global vs. gestor de escola) pra bater
> com o RBAC que `cadastro_admin.html` ganhou nesse meio tempo. Testado e
> confirmado em produção. **v10** fecha as 3 observações menores das Rules
> que estavam pendentes e trava duas brechas novas achadas na revisão: o
> `allow delete` de `users` foi fechado (`if false` — toda exclusão passa
> pelo endpoint), e o `allow update` não deixa mais o gestor de escola
> promover ninguém a admin direto pelo Firestore. Testado e confirmado.
> **v11** cobre a revisão de código de `idaluno.html` (pendência da v6),
> a página mais complexa do módulo Admin — responsável por unificar o ID de
> um mesmo aluno entre os módulos Atas e Ano Ativo, pra alimentar o export
> automático de histórico escolar. Três causas raiz achadas e corrigidas
> (sync incompleto com o Firestore no módulo Ano Ativo, e o ID errado
> podendo sobreviver numa fusão cross-módulo — o que arriscava órfãos de
> mídia no Cloudinary). Fica **parcialmente resolvido**: testado ponta a
> ponta com sucesso (dados pessoais + notas + avatar sobreviveram à fusão),
> mas achado um sintoma na **página de pesquisa de Atas**, ainda sem causa
> raiz confirmada (ver `🐛 Bugs encontrados`). Também revisados nesta rodada,
> só como leitura de apoio (nada alterado neles): `cadastro-turma.html`,
> `cadastro-aluno-ativo.html`, `identidade-aluno.js`/`db.firebase.js`, e o
> guia de migração do contador atômico de `alunoId` — nenhuma das três
> páginas checadas precisa de ajuste por causa dessa migração. **v12** abre
> uma frente nova, maior que um fix pontual: a **modernização do módulo de
> Atas** (o mais antigo do sistema, hoje muito atrás dos demais em
> funcionalidade). Causa raiz do bug de "nome desatualizado" da v11
> **confirmada**: nome do aluno é gravado como texto fixo dentro do
> documento da turma (não como referência ao catálogo), então uma fusão em
> `idaluno.html` nunca se reflete na Ata. Descoberta adicional: a versão
> debugada do `identidade-aluno.js` **removeu** o casamento por nome sozinho
> (fonte de fusões erradas) — o que é correto, mas sem CPF/nascimento (que
> Atas nunca manda), todo import passa a criar `alunoId` novo sempre, sem
> nenhum matching por nome. Nasceu daí um plano de fundo (relatório entregue,
> ver arquivo em separado) e a primeira implementação real: em
> `gestao-atas.html`, foram corrigidos dois bugs pontuais (leitura de
> resultado "Conservado"/"Insatisfatória" ausente, log de exclusão de turmas
> gigantesco) e construída uma **checagem de plausibilidade de trajetória
> escolar** (série/ano/situação) pra decidir, na importação, se um nome
> repetido é ou não a mesma pessoa — com um novo fluxo de **análise → revisão
> (verde/amarelo/vermelho) → confirmação**, substituindo o antigo "salva
> direto". **Ainda não testado de ponta a ponta** (testes em andamento — ver
> `⏳ Pendências`). Durante os primeiros testes manuais já apareceram dois
> achados novos (ver `🐛 Bugs encontrados`), e ficaram registradas três
> decisões de arquitetura pra próxima rodada de código (ver `⏳ Pendências`):
> um modelo de matrícula única por aluno (como o Ano Ativo já faz), um ID
> determinístico de matrícula pra travar reimportação duplicada de turma, e
> mover a detecção de nomes semelhantes (hoje em `idaluno.html`) pra dentro
> da própria análise de importação, antes do `alunoId` ser criado de vez.
>
> **v13** fecha duas pendências, fora da frente de modernização do Atas
> (que segue em andamento, tratada por você em paralelo): **`admin_backup.html`**
> foi finalmente reescrito pra ler/gravar direto no Firestore (a decisão que
> estava travando esse item desde a v2) e ganhou duas rodadas de fix — a
> primeira corrigindo `SYSTEM_KEYS` (cache local de "Apagar TODOS os dados"
> não cobria as coleções do Ano Ativo/Funcionários) e a segunda estendendo
> `apagarTurmas()`/`limparAlunosIds()` pra também apagar (Firestore + cache
> local) a coleção de funcionários, que antes era preservada por essas duas
> ações — decisão sua, mudando o comportamento anterior. E foi achado e
> corrigido um **bug novo, fora do escopo do checklist** (achado por você
> "fuçando o sistema", não fazia parte da rodada de testes formal):
> `pesquisa-ano-ativo.html` não mostrava nenhum aluno/turma quando o ADMIN
> global selecionava "Todas as escolas" no cabeçalho — sempre devolvia zero.
> Causa raiz: `db.firebase.js` sempre lê os dados de uma única escola por
> vez; o valor especial que marca "nenhuma escola selecionada" (`"ADMIN"`)
> acabava sendo usado como se fosse um `schoolId` de verdade, apontando pra
> uma escola que não existe. Corrigido com uma consulta nova entre todas as
> escolas de uma vez (`collectionGroup` do Firestore) só pra esse caso,
> mostrando um chip 🏫 com o nome da escola em cada aluno/turma da lista.
> Precisou também de uma regra nova no `firestore.rules` (consulta entre
> escolas exige regra própria, a aninhada por escola não cobre) — só
> leitura, só pro ADMIN global, sem abrir brecha pra gestor de escola ver
> dado de outra escola. Testado e confirmado por você em produção.

---

## 🐛 Bugs encontrados (a corrigir)

- **`gestao-atas.html` — linha de aluno com nome "--" é tratada como aluno de
  verdade.** Achado testando a nova análise de importação (imagem 1 anexada
  na v12): a ata original tem uma linha em branco no meio da numeração (erro
  humano na transcrição manual da ata física), preenchida como "--" no lugar
  do nome pra não quebrar a numeração impressa (Nº 10, no exemplo). Hoje o
  import lê "--" como um nome válido e cria um "aluno" sem notas/situação.
  Decisão já tomada: **como o sistema não depende de sumário numérico
  (é um banco pesquisável), essas linhas devem ser ignoradas no import** —
  não pular o número na tabela física (isso é problema burocrático, fora do
  sistema), só não criar registro de aluno pra essas linhas. Sem fix
  aplicado ainda.
- **`gestao-atas.html` — indicador de série "--" não reconhecido.** Achado
  no mesmo teste (imagem 2 anexada na v12, turma "EJA1 2021"): 2 alunos
  gerando aviso `indicador "--" não reconhecido`. Conferido no `.xlsx` de
  origem: "--" ali é só **"não informado"** genérico (mesmo caso de dado
  ausente que aparece em outras colunas), sem lógica especial por trás —
  não é algo exclusivo do EJA. (Separadamente, esses mesmos 2 alunos também
  tinham resultado `AND`/Em andamento nessa aba — já reconhecido pelo
  `toResultado()`, sem relação de causa com o aviso do indicador.) Sem fix
  aplicado ainda — falta decidir se "--" no campo de série deve parar de
  gerar aviso (tratado como série desconhecida, sem travar nem avisar) ou
  se deve continuar avisando, já que "não informado" ali é, de fato, uma
  lacuna de dado.
- **Pesquisa de Atas mostra o nome antigo depois de uma fusão em
  `idaluno.html`.** Testado: aluno "teste1" (Ano Ativo) fundido com
  "teste2" (Atas), escolhendo manter o nome "teste1". No Firestore e na
  página de Histórico, os dados batem certo com "teste1" (nome, nascimento,
  filiação). Mas na **pesquisa de Atas**, o mesmo aluno ainda aparece na
  tabela como **"teste2"**. **Causa raiz confirmada na v12** (ver resumo no
  topo do arquivo): nome gravado como texto fixo dentro do documento da
  turma, nunca lido de volta do catálogo — não é cache/front-end como se
  suspeitava na v11. Fix estrutural (fazer a Ata guardar só `alunoId` e ler
  nome ao vivo) faz parte do plano maior de modernização do módulo,
  registrado em relatório separado — não é mais um fix pontual isolado.
- **`gerarIds()` em `idaluno.html` (botão "Gerar / Atualizar IDs") chama
  `findOrCreateBatch()` sem `await`, numa função que não é `async`.** Achado
  ao rodar o teste do Passo 1 do guia de migração do contador atômico
  (`identidade-aluno.js`) — não é causado pela migração, já estava assim
  antes. Como `findOrCreateBatch()` é `async`, o retorno vira uma Promise em
  vez do array esperado, e o código que distribui `alunoId` de volta pras
  turmas (`resultados[rIdx++]`) provavelmente nunca funcionou. Suspeita:
  quem realmente cria os IDs de Atas hoje é o `garantirIds()` de
  `cadastro-turma.html` (que usa `await` corretamente, na hora de salvar a
  turma), tornando esse botão redundante/quebrado sem que ninguém tenha
  notado. **Sendo resolvido em paralelo, em outro chat** (v12).

*(ver **✅ Fixes aplicados** pro que foi resolvido, e **⏳ Pendências** pro
que falta investigar/corrigir)*

---

## ✅ Decisões já tomadas (não são mais perguntas em aberto)

- **`oldcadastro-funcionario.html` confirmado sem uso** — órfã, pode ser
  removida quando fizer sentido (não é urgente).
- **`config.html` (hub de Configurações) confirmado órfão** — já retirado do
  sistema.
- **`perfil.html` — troca de email não chegando no primeiro endereço
  testado** — retestado com mais emails, chegou normalmente. Confirmado
  caso isolado do endereço original, não bug de código. Encerrado.

---

## ⏳ Pendências (ainda não testado)

- **Modernização do módulo de Atas — em andamento (v12).** Plano completo
  em relatório separado. Nesta rodada, em `gestao-atas.html`: fluxo de
  import trocado de "salva direto" pra **análise → revisão
  (verde/amarelo/vermelho) → confirmação**, com checagem de plausibilidade
  de trajetória (`avaliarTrajetoria`, baseada em série + ano letivo +
  situação, com janela de 1 a 3 anos a partir do último vínculo conhecido do
  aluno). **Implementado, ainda não testado de ponta a ponta** — testes em
  andamento, já geraram os dois achados novos listados em
  `🐛 Bugs encontrados`.
- **Decisão de arquitetura: matrícula única por aluno (como o Ano Ativo já
  faz), em vez de um `alunoId` novo por turma/ano.** Hoje cada import
  potencialmente cria um `alunoId` por aparição do nome; a ideia é o aluno
  ter só um ID pra sempre, e uma **matrícula** (documento próprio, no
  padrão de `anoAtivoMatriculas`) vinculando esse ID a cada turma/ano
  cursado. Decidido: a resolução de identidade continua 100% automática
  tanto no import quanto no futuro cadastro manual — sem precisar de telas
  separadas pra aluno/turma/matrícula. Sem migração de dados necessária
  (sistema em fase de testes, sem turmas reais ainda). Ainda não
  implementado.
- **ID determinístico de matrícula/turma, pra travar reimportação
  duplicada.** Decidido que precisa existir alguma verificação pra que a
  mesma turma (ou matrícula, no novo modelo acima) não seja importada 2+
  vezes sem querer. Ainda não implementado — depende de o modelo de
  matrícula acima estar definido primeiro.
- **Mover a detecção de nomes semelhantes de `idaluno.html` pra dentro da
  análise de importação de `gestao-atas.html`, antes do `alunoId` nascer.**
  Hoje o script de semelhança de nome (% configurável) só existe em
  `idaluno.html`, criado originalmente pra achar erro humano de
  cadastro/import (ex.: "João" vs. "Joao"). Problema identificado: como o
  contador de `alunoId` é atômico, se dois nomes parecidos viram dois IDs
  na importação e só depois alguém mescla no `idaluno.html`, um número de
  ID é perdido pra sempre (inflaciona a sequência). Decidido mover essa
  checagem pra **antes** do `findOrCreateBatch` rodar na análise — nome
  parecido vira uma decisão pendente (é a mesma pessoa? sim/não) dentro da
  própria revisão verde/amarelo/vermelho, em vez de já reservar um ID novo
  e só corrigir depois. Escopo confirmado: comparar o nome candidato **tanto
  contra o catálogo já existente quanto entre linhas da mesma planilha**
  (ex.: aluno já no catálogo com nome acentuado, e a planilha nova tem esse
  mesmo aluno em duas turmas — uma com acento, outra sem). Em ambos os
  casos, a decisão "é a mesma pessoa" deve levar em conta a proximidade de
  série→situação→ano letivo (o mesmo `avaliarTrajetoria` já construído),
  não só a semelhança textual do nome. Isso também tira peso do
  `idaluno.html`, que passaria a focar só no vínculo Ano Ativo↔Atas (seu
  propósito original). Ainda não implementado — combinado que só entra
  depois do fluxo de análise/revisão atual ser testado.
- **Módulo Admin — todas as páginas testadas.** `admin.html`,
  `admin_escolas.html`, `schema_ata.html`, `idaluno.html` e agora
  `admin_backup.html` já passaram por teste/revisão (ver detalhes abaixo em
  cada um). `idaluno.html` segue **parcialmente resolvido** — ver item logo
  abaixo.
- **`idaluno.html` — 🟡 parcialmente resolvido.** Revisão de código completa
  feita (pendência da v6). Três causas raiz achadas e corrigidas nesta
  rodada (ver `✅ Fixes aplicados`), testadas ponta a ponta com sucesso pelo
  fluxo Atas↔Ano Ativo → Histórico. O sintoma na página de pesquisa de Atas
  teve a causa raiz confirmada na v12 (nome fixo no documento da turma) e
  virou parte do plano de modernização do módulo de Atas, em vez de fix
  pontual — ver pendência acima. O `gerarIds()` sem `await` está sendo
  resolvido em paralelo, em outro chat.
- **`historico_auto.html`** e **`schema_ch.html`** — aguardando os fixes que
  você já está desenvolvendo (mencionado antes de começar os testes).
- **Levantamento completo de localStorage por página** — vou refazer a
  varredura (mais a fundo dessa vez, já mirando os bugs de cache que
  apareceram no teste, como o do email em `cadastro_admin.html`) assim que
  tiver acesso ao repo de novo. **Última coisa a fazer antes dos logs.**

---

## ✅ Resolvido (sem fix de código necessário / já testado)

- **Email de confirmação de troca (`perfil.html`) sempre cai no spam — sem
  solução viável no momento.** Investigado: o site roda em subdomínio
  `.pages.dev` (Cloudflare Pages), então não há domínio próprio pra
  registrar como "domínio autorizado" no Firebase Auth — sem isso, não dá
  pra configurar SPF/DKIM/DMARC próprios, e o Firebase nem permite
  customizar o template do email sem domínio próprio verificado. Trocar só
  o texto do template não muda a reputação do remetente, que é o que
  decide ir pro spam. Decisão consciente: aceitar o risco por ora — só
  resolveria de verdade migrando pra um domínio próprio no futuro, se virar
  prioridade.
- **Checagem de erros no console no fluxo crítico — testado, sem bugs
  reais.** Percorrido login → cadastro (Ano Ativo) → pesquisa → exportação
  (os 5 formatos: 3 PDFs coletivos, 1 PDF individual, 1 CSV), sem nenhum
  erro vermelho real em nenhuma etapa. Único achado: os 3 PDFs coletivos
  disparam um `console.error` da própria lib `jspdf-autotable`
  (`"Of the table content, 0.11 units width could not fit page"`) — é um
  aviso interno dela por arredondamento de largura de coluna (tabela mais
  larga = mais perto do limite da página), não afeta o conteúdo exportado
  e não precisa de fix. Só aparece nos coletivos porque têm mais colunas;
  o individual e o CSV têm folga e não disparam.

---

## Testes pulados intencionalmente (sem necessidade de repetir)

- `pesquisa-ano-ativo.html` e `readmitir-aluno.html` — já testados logo após
  os fixes anteriores; cobertura considerada suficiente por você. **Achado
  na v13:** apesar disso, um bug real apareceu depois em
  `pesquisa-ano-ativo.html` num cenário que os testes anteriores não
  tinham coberto (ADMIN global em modo "Todas as escolas") — corrigido, ver
  `✅ Fixes aplicados`.

---

## ✅ Fixes aplicados

### Rodada de hoje — `admin_backup.html`, `pesquisa-ano-ativo.html`, `db.firebase.js`, `firestore.rules`

**`admin_backup.html` — reescrito pra Firestore-first (decisão pendente
desde a v2), em duas rodadas:**

- **Export/restore/status/limpeza agora leem e gravam direto no Firestore**,
  por `schoolId` explícito, nunca via `window.DB`/cache local — elimina o
  problema original (backup gerado a partir do cache podia ficar
  desatualizado em relação ao Firestore). Ganhou também escopo por **escola
  específica** ou **todas as escolas de uma vez** (backup/restore/limpeza
  cobrindo múltiplas escolas num arquivo só, com confirmação extra de texto
  pra restaurar/apagar em massa).
- **Bug: `SYSTEM_KEYS` incompleto — corrigido.** A lista de chaves de cache
  local limpas por "Apagar TODOS os dados" só cobria o módulo Atas legado
  (`turmasDB`, `alunosDB` etc.), sem as chaves do Ano Ativo
  (`anoAtivoTurmasDB`, `anoAtivoAlunosDB`, `anoAtivoMatriculasDB`) nem de
  Funcionários (`funcionariosDB`). Depois de apagar tudo no Firestore, o
  cache local dessas coleções ficava com dado velho até um refresh completo.
  Corrigido incluindo as quatro chaves que faltavam.
- **Mesmo tipo de bug, achado de novo em `apagarTurmas()` e
  `limparAlunosIds()` — corrigido.** As duas já apagavam as coleções certas
  no Firestore (incluindo Ano Ativo), mas suas próprias listas de cache
  local (independentes do `SYSTEM_KEYS` acima) não cobriam as mesmas chaves
  do Ano Ativo. Corrigido.
- **Decisão sua: funcionários deixa de ser preservado por "Apagar somente
  turmas" e "Limpar alunos/IDs".** Antes essas duas ações preservavam a
  coleção de funcionários de propósito; a pedido seu, passaram a apagar
  (Firestore + cache local) junto com o resto. `TURMAS_RELATED_COLS` e
  `ALUNOS_RELATED_COLS` atualizados, e todos os textos de confirmação/aviso
  da tela corrigidos pra refletir o novo comportamento (não diziam mais
  "funcionários... permanecem intactos"). Export e "Apagar TODOS os dados"
  já cobriam funcionários desde antes, não precisaram de ajuste.

**Testado e confirmado por você em produção** (as duas rodadas).

**Bug novo achado por você fora da rodada de testes formal —
`pesquisa-ano-ativo.html` não lista nada em "Todas as escolas":**

- **Causa raiz:** `db.firebase.js` sempre escopa a leitura a uma única
  escola (`Auth.getActiveSchoolId()`). Quando o ADMIN global está em modo
  "Todas as escolas" no cabeçalho, esse getter cai no valor sentinel
  literal `"ADMIN"` (não uma escola de verdade) — que a leitura normal usa
  como se fosse um `schoolId` real, apontando pra uma escola que não
  existe e devolvendo sempre zero, silenciosamente.
- **Fix:** `DB.loadAllAnoAtivo()` detecta esse sentinel e delega pra uma
  função nova, `DB.loadAllAnoAtivoTodasEscolas()`, que usa
  `collectionGroup()` do Firestore pra ler `anoAtivoTurmas`/
  `anoAtivoAlunos`/`anoAtivoMatriculas` de todas as escolas de uma vez,
  marcando cada item com o `schoolId` real (tirado do caminho do
  documento, nunca de um campo salvo) e devolvendo um mapa
  `schoolId → nome` pra UI. `pesquisa-ano-ativo.html` atualizado pra
  mostrar um chip 🏫 com o nome da escola em cada card de turma/aluno
  nesse modo.
- **`firestore.rules` — regra nova de collection group.** A consulta
  `collectionGroup()` batia em "Missing or insufficient permissions": a
  regra aninhada em `schools/{schoolId}/anoAtivoAlunos/{docId}` só cobre
  leitura de uma escola por vez, não uma consulta entre escolas. Adicionadas
  3 regras (`anoAtivoTurmas`/`anoAtivoAlunos`/`anoAtivoMatriculas`) no
  formato `match /{path=**}/<coleção>/{docId}`, só leitura, só pra
  `isGlobalAdmin()` — mesmo padrão já usado ali pra `changeRequests`. Não
  mexe em nenhuma regra existente.
- **Observação:** o mesmo tipo de bug provavelmente afeta outros
  carregadores em modo "Todas as escolas" (ex.: `loadAll()` do módulo
  Atas) — não corrigido lá ainda, só no caminho do Ano Ativo.

**Testado e confirmado por você em produção** (listagem completa com o
chip de escola aparecendo certo).

**Arquivos entregues nessa rodada:** `admin_backup.html`, `db.firebase.js`,
`pesquisa-ano-ativo.html`, `firestore.rules`.

---

### Rodada anterior — `gestao-atas.html`

Início da modernização do módulo de Atas (plano completo em relatório
separado). Três mudanças, nesta ordem:

- **`toResultado()` não reconhecia "Conservado" (`C`) nem "Insatisfatória"
  (`I`)** — caíam em "Não informado" silenciosamente. Adicionados aos
  códigos e palavras-chave reconhecidos.
- **Log de exclusão de turmas gigantesco — condensado.** Apagar várias
  turmas de uma vez gerava de 1 a 4 linhas de log *por turma* (uma por
  tentativa de remoção no Firestore), mais uma segunda lista repetindo os
  nomes no final — pra 59 turmas, ~180 linhas. Trocado por um resumo
  (`X/Y turma(s) removida(s)`) mais uma lista de avisos que só aparece
  quando alguma turma precisou de fallback (`_id`/`removeWhere`) ou falhou
  de verdade — o caminho normal (tudo removido de primeira) agora gera 2
  linhas de log em vez de ~180.
- **Nova checagem de plausibilidade de trajetória, e fluxo de import
  trocado de "salva direto" pra "análise → revisão → confirmação".**
  Funções novas: `_categoriaResultado`, `_parseSerieCanonica`,
  `avaliarTrajetoria`, `ultimoRegistroDoAluno` — decidem se um nome
  repetido no catálogo, com uma nova série/ano/situação, é uma continuação
  plausível da mesma pessoa (janela de 1 a 3 anos a partir do último
  vínculo conhecido daquele `alunoId`, com série esperada calculada a
  partir do resultado anterior: Aprovado/Satisfatório/Parcial avança,
  Reprovado/Desistente/Conservado/Insatisfatória/Em andamento mantém,
  Transferido/Não informado fica sem expectativa de série, Falecido
  bloqueia sempre). O antigo `importarSelecionadas()` (salvava direto no
  Firestore) foi separado em `analisarSelecionadas()` (monta um buffer em
  memória, sem gravar nada) → tela de revisão com cada turma marcada
  verde/amarelo/vermelho (`renderRevisaoImportacao`, com botão de remover
  turma da lista, `removerTurmaDoBuffer`) → `confirmarImportacao()` (só aí
  grava de fato) ou `cancelarImportacao()` (descarta tudo, limpando
  identidades órfãs criadas durante a análise). **Trade-off assumido e
  avisado na própria tela:** a resolução de identidade
  (`findOrCreateBatch`) já roda na fase de análise, antes da confirmação,
  porque ela já persiste sozinha no catálogo — não foi criada uma versão
  "simulada" dela. **Ainda não testado de ponta a ponta** — ver achados em
  `🐛 Bugs encontrados` e a decisão de mover a checagem de nomes
  semelhantes pra dentro desse fluxo em `⏳ Pendências`.

**Arquivos entregues nessa rodada:** `gestao-atas.html`.

---

### Rodada anterior — `idaluno.html`

Revisão de código completa da página (pendência da v6). Contexto: essa
página existe pra unificar sob um único `alunoId` o mesmo aluno cadastrado
separadamente em dois módulos — **Atas** (histórico, só nome/nota/série/
turno/ano letivo, sem dados pessoais) e **Ano Ativo** (aluno atual, ficha
completa com CPF/filiação/mais de 20 campos, e mídia no Cloudinary — avatar
e documentos, indexada só por `alunoId`). A unificação existe pra alimentar
automaticamente a página de Histórico Escolar (export em `.docx`), que hoje
precisa puxar notas de Atas **e** dados pessoais de Ano Ativo do mesmo
aluno.

- **🔴 Sync incompleto com o Firestore no módulo Ano Ativo — corrigido.**
  `unirIds()` atualizava corretamente o catálogo central (`alunos`, via
  `window.Identidade`) numa fusão, mas as duas coleções do Ano Ativo
  (`anoAtivoTurmas`, `anoAtivoMatriculas`) ficavam de fora do mapa de sync
  de `salvarJSON()` — a fusão gravava certo só no `localStorage` do
  navegador que fez a ação, nunca subia pro servidor. Um aluno "unido" nesse
  navegador continuava duplicado em qualquer outro dispositivo. Corrigido:
  as duas chaves entraram no `_MAP` de sync, apontando pras coleções reais
  (`anoAtivoTurmas`/`anoAtivoMatriculas`).
- **🔴 Ano Ativo não era recarregado do Firestore ao abrir a página —
  corrigido.** No boot (`DOMContentLoaded`), só `turmasDB`/`alunosDB`/
  `matriculas`/`atasDB` eram pré-carregados do Firestore pro `localStorage`.
  As duas coleções do Ano Ativo ficavam de fora, então a página podia
  calcular sugestões de fusão em cima de cache local desatualizado.
  Corrigido: `window.DB.loadAllAnoAtivo()` agora roda junto no boot,
  populando as três chaves (`anoAtivoTurmasDB_v1`, `anoAtivoMatriculasDB_v1`
  e `anoAtivoAlunosDB_v1` — essa última achada só depois, ver abaixo).
- **🔴 ID errado podia sobreviver numa fusão cross-módulo, arriscando
  órfãos de mídia no Cloudinary — corrigido.** Esse foi o achado mais sério,
  confirmado com teste real (aluno "teste1" em Ano Ativo + "teste2" em
  Atas). O ID que sobrevive a uma fusão (`idManter`) era decidido só pela
  ordem alfabética dos nomes na lista — sem nenhuma garantia de que fosse o
  ID do Ano Ativo. Como o Cloudinary indexa avatar/documentos só pelo
  `alunoId` (sem escola/módulo), se o ID de Atas vencesse a fusão, a mídia
  do aluno ficava órfã (o app passa a perguntar pelo `alunoId` novo, que
  nunca teve nada enviado sob esse nome). Corrigido em duas partes:
  (1) `gerarSugestoes()` agora força o ID do Ano Ativo a ser sempre o
  sobrevivente em pares cross-módulo, invertendo os papéis internamente
  quando necessário; (2) a checagem de "isso é Ano Ativo" (`isAA()`), que
  antes dependia de existir **matrícula ativa** pro aluno (sinal frágil — um
  aluno pode ter ficha completa e mídia sem matrícula corrente), passou a
  checar direto a coleção-catálogo `anoAtivoAlunos` — daí a necessidade da
  terceira chave de sync/preload citada no item acima.
  **Testado e confirmado ponta a ponta:** fusão de teste (Ano Ativo +
  Atas) manteve ID, nome, nascimento, filiação e **avatar** corretos depois
  da fusão, e o Histórico exportou notas + dados pessoais do mesmo aluno
  automaticamente.
  **Sintoma remanescente, sem causa raiz confirmada ainda:** a página de
  pesquisa de Atas continua mostrando o nome antigo do aluno fundido (ver
  `🐛 Bugs encontrados`).
- **Revisado e descartado como não-crítico (não mexido):** o bloco de
  aliases legado dentro de `unirIds()` (`alunosAliasesDB`) é código morto
  no caminho principal — computado e nunca salvo quando `window.Identidade`
  existe (só é usado no fallback legado). Confirmado que o catálogo atual
  (`identidade-aluno.js`) não depende dele pra nada. Baixo risco, baixa
  prioridade — não corrigido de propósito, pra não mexer no fallback à toa.

**Revisados nesta rodada só como leitura de apoio, nada alterado neles:**
`cadastro-turma.html`, `cadastro-aluno-ativo.html`, `identidade-aluno.js`,
`db.firebase.js`, e o guia de migração do contador atômico de `alunoId`.
Rodado o teste do Passo 1 do guia (`grep ".proximoId("`) nas três páginas:
nenhuma chama `proximoId()` direto, todas usam `findOrCreate`/
`findOrCreateBatch`/`salvar`/`remover` — nenhum ajuste necessário por causa
da migração do contador atômico. Achado nesse processo (não relacionado à
migração): `gerarIds()` em `idaluno.html` chama `findOrCreateBatch()` sem
`await` (ver `🐛 Bugs encontrados`).

**Arquivos entregues nessa rodada:** `idaluno.html`.

---

### Rodada anterior — `auth.firebase.js` + `firestore.rules`

- **Bug #3 (`cadastro_admin.html`: email não atualiza na tela) — corrigido
  na raiz.** Não era bug da página — `cadastro_admin.html` só exibe o que
  `Auth.listUsers()` devolve, sem cache próprio. A causa real: o sistema
  guarda o email em dois lugares (Firebase Auth, que é o que de fato loga a
  pessoa, e o campo `email` do doc `users/{uid}` no Firestore, que é o que a
  tela do admin lê) e nada sincronizava um com o outro depois da troca.
  `perfil.html` troca o email só via `verifyBeforeUpdateEmail()`, que
  atualiza o Firebase Auth de forma assíncrona (só depois que o usuário
  clica no link de confirmação, fora da sessão do navegador) — e nunca
  escreve no Firestore. Corrigido em `loadProfile()` (roda a cada login/
  refresh de sessão): compara o email atual do Firebase Auth com o que está
  salvo no Firestore e, se divergem, regrava o Firestore com o valor
  correto. Só sincroniza se o doc já existir (`snap.exists`), pra não tentar
  `update` num perfil que ainda está sendo criado (corrida possível durante
  o cadastro novo em `cadastro_usuario.html` — inofensiva antes do fix,
  gerava só um warning no console).
  **Efeito colateral aceito, sem fix:** a sincronização só acontece no
  próximo login depois da confirmação, não no instante em que o link é
  clicado (não tem como — o navegador nem está aberto nesse momento).
  Considerado suficiente; Cloud Function pra sync instantâneo foi avaliada e
  descartada por ser desproporcional pro sistema.
- **🔴 Falha de segurança corrigida nas Firestore Rules — escalonamento de
  privilégio via `users.update`.** Achada só de revisar as Rules durante a
  investigação acima, sem relação direta com o bug de email. A regra de
  `update` em `users/{uid}` deixava o próprio usuário alterar **qualquer**
  campo do próprio documento, incluindo `role` e `schoolId` — ou seja,
  qualquer conta (mesmo uma `pending` recém-criada, nunca aprovada) podia se
  promover a admin global sozinha, direto pelo Firestore, sem passar pelo
  app nem precisar de nenhum bug de tela (bastava um `update()` chamado pelo
  console do navegador). Corrigido: usuário comum agora só edita o próprio
  doc se `role` e `schoolId` do documento novo forem idênticos aos já
  salvos — só admin altera esses dois campos. Resto do doc (nome, foto etc.)
  continua editável pelo próprio dono normalmente.
- **🔴 Bug de exclusão corrigido — `Auth.deleteUser()` agora apaga dos dois
  lugares.** Era o item que tinha ficado como "achado, mas não corrigido"
  na rodada anterior. Antes só apagava o doc do Firestore, deixando a conta
  ativa no Firebase Authentication pra sempre (confirmado em produção com
  contas de teste antigas ainda válidas pra login, uma delas de admin).

**Arquivos entregues nessa rodada:** `auth.firebase.js`, `firestore.rules`.

---

### Rodada seguinte — exclusão de usuário via endpoint próprio (`users-delete.js`)

- **🔴 Gestão real de contas no Firebase Authentication — resolvido e
  testado.** Trocado `Auth.deleteUser()` por uma chamada a um endpoint
  próprio (`functions/api/users-delete.js`, Cloudflare Pages Function —
  **não** é Cloud Function do Firebase, então não precisou do plano Blaze).
  O endpoint usa uma service account do Firebase (REST, sem `firebase-admin`
  — esse SDK não roda no runtime do Cloudflare Pages) pra apagar a conta no
  Firebase Authentication e o doc em `users/{uid}` no Firestore numa
  chamada só. Autorização em duas camadas, batendo com o RBAC de
  `cadastro_admin.html`:
  - **Admin global** (`schoolId: 'ADMIN'`): pode excluir qualquer um.
  - **Gestor de escola** (`role: 'admin'` com `schoolId` de uma escola
    específica): só pode apagar via esse endpoint se o alvo for uma
    solicitação **pendente da própria escola** (reprovação). Excluir
    usuário já aprovado — de qualquer escola, inclusive a própria — exige
    passar pelo fluxo de `changeRequests`/aprovação do admin global. Isso
    fecha uma brecha real: sem essa checagem, um gestor de escola
    conseguiria excluir qualquer usuário já aprovado chamando o endpoint
    direto (fora da UI), pulando a aprovação.
  - Bloqueado também excluir a própria conta pelo endpoint.
  **Testado e confirmado em produção:** exclusão via painel some da lista,
  do Authentication e do Firestore; gestor de escola tentando excluir
  usuário já aprovado recebe 403 com a mensagem certa; gestor reprovando
  pendente da própria escola funciona normalmente.

**Arquivos entregues nessa rodada:** `functions/api/users-delete.js`,
`auth.firebase.js` (método `deleteUser()` atualizado pra chamar o endpoint,
e `listUsers()` passou a aceitar `schoolId` opcional pra suportar a query
com escopo do gestor de escola — exigência das próprias Rules).

---

### Rodada seguinte — `firestore.rules` (ajustes finos de RBAC)

- **As 3 observações menores das Rules, resolvidas:** `changeRequests.create`
  agora valida `requestedBy == request.auth.uid`; as funções mortas
  `isPendingSignup()`/`resource_uid()` foram limpas — `isPendingSignup()`
  passou a ser usada de verdade no `allow create` de `users`. O
  `schools/{schoolId}` com `allow read: if true` foi mantido (intencional,
  documentado em comentário — dropdown de escola no autocadastro precisa
  disso antes do login).
- **🔴 `allow delete` em `users/{uid}` fechado — `if false`.** A regra
  antiga (`isGlobalAdmin() || isSchoolAdmin(resource.data.schoolId)`)
  deixava o gestor de escola apagar direto pelo Firestore **qualquer**
  usuário da própria escola, inclusive já aprovado — ignorando por completo
  a restrição de "só pendente" que tinha acabado de ser implementada no
  endpoint `/api/users-delete`. Como toda exclusão do app já passa por esse
  endpoint (que usa service account, não o client SDK, então nem depende
  dessa regra pra funcionar), a solução foi travar o delete direto de vez —
  ninguém apaga usuário pelo Firestore, nem o admin global. Fecha o atalho
  que reintroduzia conta fantasma nesse caminho específico.
- **🟡 `allow update` de `users/{uid}` — gestor de escola não promove mais a
  admin.** Antes só travava troca de `schoolId`; nada impedia o gestor de
  virar o `role` de um usuário da própria escola pra `admin` direto pelo
  Firestore. Ajustado pra permitir só a transição `pending` → `user`
  (aprovação) ou manter o `role` como está — qualquer outra mudança de role
  exige admin global. Decisão de negócio confirmada com você antes de
  aplicar (fluxo combinado: gestor aprova/reprova sozinho; qualquer alteração
  em usuário já aprovado passa pelo admin global).
  **Testado e confirmado:** aprovar pendente funciona normal; gestor
  tentando promover a admin é bloqueado (`permission-denied`); delete direto
  pelo Firestore bloqueado até pro admin global; exclusão de escola
  (`deleteSchool()`, regra separada) continua funcionando normal.

**Arquivos entregues nessa rodada:** `firestore.rules`.

---

### Rodada anterior — `admin_escolas.html`

- **`ADMIN` aparecendo como escola nas listagens — corrigido.** O doc
  `ADMIN` no Firestore (marcador de admin global, não é uma escola de
  verdade) estava sendo listado normalmente por `fetchSchools()` — entrava
  na tabela e contava no "X escola(s)". O filtro de `ADMIN` que já existia
  no select do `cadastro_usuario.html` não é reaproveitado aqui, por ser
  outra tela/função — corrigido filtrando na fonte (`fetchSchools()`), pra
  cobrir tabela, contagem e qualquer outro uso da função.
- **Solicitações de alteração não apareciam pro ADMIN global — corrigido
  (causa raiz + índice + regra de segurança).** A gravação (`btnSendReq`)
  sempre gravou certo no Firestore, em `schools/{sid}/changeRequests`. O
  problema era a leitura: `refreshApprovals()` lia de uma chave de
  localStorage (`auth_school_change_requests_v1`) que nunca era escrita por
  nada no sistema — leitura e escrita apontando pra lugares diferentes.
  Reescrito pra ler do Firestore via `collectionGroup('changeRequests')`,
  que é o mesmo lugar onde já era gravado. Precisou de mais dois ajustes de
  infra, fora do código: (1) regra do Firestore em escopo de **collection
  group** — a regra aninhada em `schools/{schoolId}/changeRequests` só vale
  pra leitura de uma escola por vez, então foi somada `match
  /{path=**}/changeRequests/{docId}` fora do bloco de `schools`; (2) um
  índice de campo único (`changeRequests`/`status`) com exceção de escopo
  "grupo de coleção" habilitada no console do Firestore, exigido pela
  própria query.
- **Botões Aprovar/Reprovar sem funcionalidade — corrigido.** Existiam no
  HTML mas não tinham nenhum listener no script — clicar não fazia nada.
  Implementados: Aprovar aplica os campos de `changes` (`name`/
  `displayName`) diretamente no doc da escola e marca a solicitação como
  `approved`; Reprovar só marca como `rejected` (com confirmação antes).
- **Solicitação mandando os dois campos mesmo editando só um —
  corrigido.** O formulário de solicitação já vem pré-preenchido com os
  valores atuais de `name`/`displayName`, então o envio sempre incluía os
  dois no `changes`, mesmo quando só um foi alterado. Corrigido pra
  comparar com o valor original e só incluir no `changes` (e por
  consequência na tela do ADMIN global) o que de fato mudou. Bônus: se
  nada for alterado, agora avisa "Nenhuma alteração para enviar" em vez de
  mandar uma solicitação vazia.
- **Legenda removida** do card de "Solicitações de alteração" a pedido.

**Testado e confirmado funcionando** (fluxo completo: solicitar edição como
admin restrito de escola → aparecer certo pro ADMIN global → aprovar →
refletir na escola).

**Arquivos entregues nessa rodada:** `admin_escolas.html`.

---

### Rodada anterior — `cadastro-aluno-ativo.html`

- **Naturalidade sem maiúsculo — corrigido.** O campo usa o mesmo
  autocomplete de cidade do endereço; um `.toUpperCase()` solto quebraria a
  seleção via dropdown (o valor voltaria pro texto salvo no banco assim que
  o usuário escolhesse uma sugestão). Adicionada uma opção `uppercase` na
  fábrica `criarAutocompleteCidade`, ativada só na instância de Naturalidade
  — o campo de Cidade do endereço não foi mexido, continua igual (alimentado
  por ViaCEP/autocomplete em texto normal, sem maiúsculo forçado).
- **NEE — especificidade não vinha marcada ao editar: causa raiz nº1
  (nomes de campo trocados) — corrigido.** Ao salvar, "Deficiência física"
  grava como `defFisica` e "Deficiência intelectual" como `defIntelectual`,
  mas o pré-preenchimento da edição lia `aluno.fisica`/`aluno.intelectual` —
  campos que não existem no documento salvo. "TEA" funcionava por
  coincidência, por não levar prefixo `def`. Corrigido o mapeamento pra usar
  os nomes reais salvos em vez de assumir que batiam com as chaves internas.
- **NEE — especificidade ainda não vinha marcada em Deficiência
  visual/auditiva: causa raiz nº2 (achada só depois do fix acima) —
  corrigido.** Depois do fix nº1, os checkboxes principais passaram a marcar
  certo, mas os rádios de subtipo (ex. "Baixa visão") continuavam com o
  círculo vazio — mesmo com o estilo de "selecionado" aplicado (linha
  destacada, badge preenchido). Causa: `_neeSelectSub` só adicionava a
  classe CSS `.selected` na linha, nunca setava `radio.checked = true` no
  input de verdade. Passava despercebido no uso normal porque um clique
  manual do usuário já marca o radio nativamente antes do `onchange`
  disparar — só a chamada programática do pré-preenchimento expunha o
  problema. Corrigido pra marcar o `.checked` de fato.
- **Bônus, achado no mesmo teste: badge de subtipo mostrando valor cru.**
  O badge mostrava `BAIXA_VISAO` em vez de "Baixa visão" — o
  pré-preenchimento passava o mesmo valor salvo como `value` e como
  `label` ao mesmo tempo. Criado um helper (`_neeSubLabel`) que busca o
  texto legível direto do radio correspondente no DOM, em vez de duplicar a
  lista de labels em outro lugar do código.

**Arquivos entregues nessa rodada:** `cadastro-aluno-ativo.html`.

---

### Duas rodadas atrás — `cadastro_usuario.html`, `perfil.html`, `theme-colors.js`

#### `cadastro_usuario.html`
- **Header reduzido implementado.** Ficou header inline na própria página
  (não usa `header-logic.js`/`#header-placeholder`) — decisão tomada depois
  de ver o `header-logic.js` real: o `runAuthGuard()` dele chama
  `Auth.requireAuth()` sem exceção pra páginas do `PAGES_NONE`, e você não
  quis abrir mão do auth guard no `index.html` só por causa disso. Então o
  header ficou estático, usando as classes/variáveis já existentes em
  `header.css` (sem duplicar CSS), só que sem chip e sem o botão "Voltar" —
  o link pra login já existe no corpo do card, então não ficou órfão.
- **Filtro do `ADMIN` no select de escola** — `ADMIN` não aparece mais como
  opção.
- **Select mostrando só `displayName`** — trocado `nome (ID)` por
  `sc.displayName || sc.name || sc.nome` (mesmo fallback usado no resto do
  sistema), sem o ID exposto no texto.

#### `perfil.html`
- **Migrado pro header padrão de verdade** — `<div id="header-placeholder">`
  + `header-logic.js` + `header.css`/`base.css`/`components.css`. Os scripts
  inline de tema e de chip de usuário/escola foram removidos (o
  `header-logic.js` já cobre isso), assim como o `Auth.requireAuth()` solto
  no topo da página.

#### `theme-colors.js` (não era bug do checklist, mas mexemos naquela rodada)
- Paleta **"Não Clique!!" (troll)** removida.
- Paleta **"Branco"** adicionada no lugar, pra não deixar o grid de cores
  vazio — segue o mesmo formato das outras 11 paletas (só `--brand*`, sem
  mexer em `--bg`/`--ink`). Uma ideia de "alto contraste" (fundo preto,
  texto branco/amarelo) foi tentada e depois revertida a pedido seu, por
  causar problemas no fluxo do sistema que não existem no sistema de
  referência (a faculdade).

**Arquivos entregues nessa rodada:** `cadastro_usuario.html`, `perfil.html`,
`theme-colors.js`.

