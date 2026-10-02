# Módulo Histórico + Schema de Carga Horária — Documentação de decisões

Documento de arquivo. Complementa o `handoff-backend-historico.md`.
Data da última atualização: 01/10/2026 (inclui as respostas sobre template/parte diversificada e Ensino Médio).

> **Legenda:** ✅ feito e entregue · 📌 decidido, a implementar · ❓ em aberto · ⚠️ depende de arquivo ainda não analisado

---

## 1. Estado das páginas

| Arquivo | Estado |
|---|---|
| `schema_ch.html` | ✅ corrigido (B2, B3, localStorage, guard admin, catálogo em constante). Validado só por sintaxe; **testar no navegador**. |
| `db.firebase.js` | ✅ `cleanupDuplicates` reescrito com `dryRun`. |
| `historico_auto.html` | ⚠️ **ainda não analisado neste chat.** Tudo da seção 5 está pendente. |
| `schema_ata.html` | não será alterado agora (decisão do usuário); ver seção 4 (futuro). |

> **Atenção ao nome do arquivo:** o upload do chat grava `db.firebase.js` como `db_firebase.js`
> no ambiente do Claude. O nome correto é **`db.firebase.js`** (as páginas fazem
> `<script src="../db.firebase.js">`). Conferir o nome ao baixar.

---

## 2. Bugs encontrados e corrigidos (B2 e B3)

Verificado no código (`db.firebase.js` + `schema_ch.html`):

1. **Duplicar sobrescrevia o original.** A cópia herdava o `_id`; o `saveAll` usa `_id || id` como ID do
   documento, então o original virava "(cópia)" no servidor. *Corrigido:* a cópia perde `_id`/`createdAt`/`updatedAt`.
2. **localStorage ressuscitava regras.** A chave `historicoCHSchemas_v1` não é separada por escola e era
   regravada no servidor. *Corrigido:* a página não usa mais localStorage (apaga a cópia antiga ao abrir).
3. **Excluir não pegava regra sem campo `id`.** `removeWhere('id', …)` só acha docs com esse campo.
   *Corrigido:* exclui por ID do documento **e** por `id`.
4. **`cleanupDuplicates` antigo apagava docs sem campo `id`** mesmo preenchidos. *Corrigido:* nova versão
   com `dryRun`, remove só regras em branco (sem nenhuma carga > 0) e duplicatas (mesmo `id` ou mesmo nome+anos+séries).
5. **Setas ↑↓ nunca persistiram a ordem** e o histórico não as usa para pré-selecionar. *Removidas*;
   coluna Ações 254px → 198px; título sem "prioridade". A lista agora tem ordem estável (menor ano, depois nome).
6. **Salvar gravava a lista inteira** (`saveAll`). *Corrigido:* grava só a regra alterada
   (`DB.schemas.save({_id: _id||id, …})`), com ID do documento estável.

Os 3 "padrão do sistema" eram dados antigos no Firestore (a string não existe nos arquivos analisados).
Foram excluídos pela própria tela e **não voltaram** → o problema está encerrado.
O `DB.traceWrites = ['schemasCH']` (já existe no `db.firebase.js`) serve para caçar escritas indevidas se algo reaparecer.

### Como usar a limpeza (se voltar a precisar)
```js
await DB.schemas.cleanupDuplicates({ dryRun: true })  // só mostra a tabela, não apaga
await DB.schemas.cleanupDuplicates()                  // apaga de verdade
```
Sempre rodar o `dryRun` primeiro e conferir a tabela.

---

## 3. RBAC (conforme `guia-restricoes-rbac.md` e `firestore.rules`)

- Roles do sistema: `admin` e `user`. **Gestor de escola = `role == 'admin'` com o `schoolId` da escola**;
  admin global = `role == 'admin'` com `schoolId == 'ADMIN'`. Logo `Auth.requireRole('admin')` cobre os dois
  (não é preciso lista de papéis — resolve a pergunta do handoff).
- ✅ `schema_ch.html`: Padrão 1 aplicado (`<script>window.Auth && Auth.requireRole('admin');</script>` após `auth.firebase.js`).
- 📌 `historico_auto.html`: aplicar o mesmo guard.
- 📌 `documentos.html` (hub): card *Histórico por aluno* com chip `Admin` + bloqueio coerente (padrão 6.6 do guia de contraste, como em `atas.html`).
- Rules relevantes: `schemasCH` leitura **pública**, escrita só admin (`canWriteSchoolData`). Coleções de aluno/turma/matrícula:
  leitura para qualquer conta aprovada da escola, escrita só admin. Ou seja, o guard da página **só esconde a tela**;
  qualquer usuário aprovado da escola ainda consegue *ler* esses dados pelo console. Aceitável se já é assim nas outras páginas; registrar a decisão.
- Rules **não** estão sendo alteradas por enquanto, exceto o item 4.4 abaixo (futuro).

---

## 4. Decisão B1 — Schema padrão para históricos (FUTURO, 📌 decidido)

### 4.1 Ideia
O schema de ata padrão (que já **nunca pode ser apagado**) passa a ser o **catálogo do documento oficial**:
renomeado para **"Schema para históricos (padrão)"**, imutável, independente do nível do usuário, permanente.

O **código da matéria é a ligação** entre três coisas:
**nota (schemaAta) ↔ carga horária (schemaCH) ↔ placeholder do template DOCX** (`A{n}_{CODE}_CH`, `A{n}{CODE}C`, `N1..N9`…).

Uma turma só tem histórico se foi cadastrada nesse schema **ou** num schema personalizado que **usa os mesmos códigos**.
Isso dispensa o campo de mapeamento e o `schemaAtaId` na regra de CH.

### 4.2 Exemplo prático (1999)
Em 1999 não havia Artes, Ed. Física, Inglês etc., mas o documento (emitido depois de 2022) tem esses espaços.
Fluxo:
1. O usuário **duplica** o schema padrão e **remove** as matérias que não existiam.
2. Cadastra os alunos/turmas nesse schema personalizado (as notas usam os mesmos códigos).
3. Em `schema_ch`, cadastra a regra de CH com o ano letivo 1999, aplicada a todas as séries.
4. No export, o script acha cada nota pelo código e preenche o placeholder; matérias sem nota/CH ficam **em branco**, como o documento oficial permite.

### 4.3 Regras de consistência (a implementar)
1. **Código imutável:** na cópia, dá para *remover* matérias; não dá para trocar o código de uma que fica.
   Dois códigos iguais no mesmo schema → barrar.
2. **Código fora do catálogo é permitido, mas não entra no histórico.** A tela do histórico deve **avisar** quais
   matérias ficaram de fora (nunca omitir em silêncio).
3. **Apelidos de compatibilidade** `EFI → EDF` e `REL → ER` continuam (turmas antigas) até padronizar os códigos.
4. **Imutabilidade garantida no Firestore**, não só no front: hoje `atasSchemas` permite escrita a qualquer admin.
   Criar regra que bloqueie `update`/`delete` do documento do schema padrão (precisa do ID/flag desse documento — ver `schema_ata.html`).
5. **Versionamento:** se o documento oficial mudar, o padrão atual segue imutável e nasce um "padrão v2".
6. **Turmas guardam cópia do schema** (`turma.schemaSnapshot`, gravado por `cadastro-turmas.html`). Renomear/ajustar o
   padrão não atualiza turmas existentes → confirmar que os códigos do padrão atual já são os 9 do documento.

### 4.4 Regra de CH em branco
Não permitir salvar regra de CH sem nenhuma carga. Se nenhuma regra casar com ano+série, as CH saem em branco do mesmo jeito.
⚠️ Confirmar no `historico_auto` que ele **não exige** que exista uma regra para exportar.
(O `cleanupDuplicates` trata regra sem nenhuma carga como lixo — coerente com isso.)

### 4.5 Preparação já feita em `schema_ch.html`
Os códigos agora vivem em **uma constante** `CATALOGO_HISTORICO` (`LP, MAT, CIE, HIS, GEO, ART, EDF, ER, ING`),
com comentário apontando para este documento. Quando o schema padrão for a fonte, só essa constante muda.
**Turno 2 = parte diversificada (✅ confirmado).** No template existe a "parte diversificada": ela **não recebe notas, só carga horária**.
Fica coberta pelo card *Turno 2* do `schema_ch` (`rule.cargasT2[CODE]`, `ATIVIDADES_T2`), fixa e independente do schemaAta.
Consequência: o schemaAta não precisa conter essas atividades; o histórico lê só a CH delas.

**Ensino Médio descontinuado (✅ decidido).** Nada será feito para EM neste módulo. No `schema_ch` foram removidas as opções
1º–4º EM do select de séries. O ramo `EM` de `chCanonSerie` também foi removido (não havia dados reais de EM salvos; só testes).

---

## 5. Pendências em `historico_auto.html` (⚠️ precisa do arquivo entregue)

Ordem sugerida:
1. 📌 Guard `requireRole('admin')` (+ card do hub).
2. **Ligação por código:** notas das matérias do schemaAta da turma → placeholders pelo código; aviso de matérias fora do catálogo; CH achada por ano+série+código.
3. **A3 — formato fixo F2 (N1→N9) e fim do EM (📌 decidido):** remover o `<select id="formato">` (F1/F2/EM/TODOS) e trocar por constante F2; ajustar `formatoPermite`, `getFilteredRegs`, `onFormatoMudou`, `buildPlaceholders`, registro do histórico de exportações.
   **Retirar tudo de Ensino Médio** (opção `EM`, filtros 1ª–3ª série EM, textos, rótulos). Alunos que só tenham matrícula de EM simplesmente não aparecem — deixar claro na tela que o histórico é do Ensino Fundamental.
4. **B3 no histórico:** o resumo "Usando regras globais com prioridade por ordem…" deixa de ser verdade (setas removidas) → reescrever/remover. O select `#schemaCHModo` já pré-seleciona o último escolhido ou `GLOBAL`, não "a primeira regra".
5. **Limpeza do legado:** editor de CH escondido (`#cardCHSchema`, `chState`, `chSaveLS` com `saveAll`, importar/exportar JSON) — **pode reintroduzir os bugs 1 e 2**; usa a mesma chave de localStorage. Remover. Depois: 29 `alert()` + 1 `confirm()` → toast/modal (`guia-toasts.md`); avaliar tirar o template DOCX embutido (469 KB).
6. **A2 — export em PDF** (por último). ❓ Caminho a decidir: (1) converter o mesmo DOCX no servidor (máxima fidelidade, exige backend); (2) PDF no navegador (`pdf-lib`/`jsPDF`) redesenhando o layout; (3) HTML de impressão (`window.print`). O documento é institucional → fidelidade pesa. O stub atual `alert('…ainda não está disponível')` vira toast ou some; decidir se o histórico de exportações registra "PDF".

---

## 6. Perguntas em aberto (resumo)

- ✅ Template: tem a parte diversificada (só CH, coberta pelo Turno 2). ❓ Ainda falta confirmar se há outras linhas além das 9 matérias + Turno 2; matéria sem espaço: avisar e não entrar.
- ❓ Duas matérias com o mesmo código no mesmo aluno (somar, média ou barrar)? Pela regra 4.3.1 deve ser barrado no schema.
- ✅ Ensino Médio descontinuado (retirar tudo no histórico).
- ❓ A2: caminho do PDF.
- ✅ `ATIVIDADES_T2` continua fixa (= parte diversificada).
- ❓ `schema_ch`: manter o bloqueio de edição quando o carregamento do servidor falha? (hoje mantido, pois sem a lista a checagem de conflito série/ano fica cega)

## 7. Arquivos necessários para continuar

| Arquivo | Para quê |
|---|---|
| `historico_auto.html` (versão entregue) | seção 5 inteira |
| `schema_ata.html` | ver como o padrão é protegido (flag/ID) e quais códigos usa — **só leitura**, para a regra do Firestore e a trava de códigos |
| `auth.firebase.js` | confirmar assinatura de `requireRole` (opcional) |
| template DOCX (ou o base64 do `historico_auto`) | mapear campos e responder as perguntas do template |

## 8. Referências
`guia-restricoes-rbac.md` · `guia-toasts.md` · `guia-migracao-contraste-theme-colors.md` (Partes 6.6, 7 e 8) · `firestore.rules` · `handoff-backend-historico.md`
