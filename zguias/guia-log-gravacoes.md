# Guia — registrar log de gravações nas páginas (`log.js`)

Para quem vai portar o log para uma página do sistema.
Pilotos de referência: `cadastro-atas.html` (lista dentro de documento), `cadastro-turmas.html` (documento único, criar/editar), `cadastro-aluno-ativo.html` (cadastro com vários documentos) `gerir-dados-ano-ativo.html` (ações administrativas em lote), `cadastro-turma-ativa.html` (criar/editar e inativar/reativar uma turma) e `readmitir-aluno.html` (documento que pode já existir).

## 1. O que já existe (não refazer)

| Peça | Onde | Observação |
|---|---|---|
| `log.js` | raiz do sistema (junto de `auth.firebase.js` e `db.firebase.js`) | SDK **compat** (`Auth.db`, `firebase.firestore`). Expõe `window.Log`. |
| Coleção `logs` | raiz do Firestore | 1 documento por ação. Campo `schoolId` filtra por escola. |
| Regras | `firestore.rules`, bloco `match /logs/{logId}` | Só admin cria; só admin global lê; ninguém altera/apaga pelo cliente. |
| TTL | campo `expiraEm` | O Firestore apaga os registros antigos sozinho (`Log.RETENCAO_DIAS`, hoje 365). |
| Consulta | card "📜 Registro de alterações" em `admin_backup.html` | Só admin global. Lê sob demanda, 50 por vez. |

**Esta tarefa NÃO mexe em:** regras, índices, TTL, `admin_backup.html`, nem no visual/textos da página. Só acrescenta chamadas ao `Log` no JavaScript da página.

**Pré-requisito de versão.** A versão correta do `log.js` é a **3**. Antes de começar, confira no console da página: `Log.VERSAO` deve devolver `3`.

| Versão | O que tem |
|---|---|
| 1 | Primeira. Sem `registrarLista`; `Log.registrar` sem `schoolId` grava `schoolId: null` e o registro **não aparece** no filtro por escola. |
| 2 | `registrarLista` e escola ativa como padrão. |
| 3 | Versão 2 + `parcial: true` (4.3), `atualizadoEm`/`criadoEm`/`id` ignorados nas comparações e **vazio ≡ ausente**. Tem `Log.VERSAO`. |

A 3 é compatível com páginas feitas na 2: nada que já foi portado precisa ser refeito. Se `Log.VERSAO` vier `undefined`, o `log.js` publicado está desatualizado: **não altere o `log.js` por conta própria**, peça a versão 3.

## 2. Regra de ouro: um registro por AÇÃO DO USUÁRIO

O log registra **o que a pessoa fez** ("salvou a turma", "excluiu a ata"), não cada documento que o Firestore gravou por consequência.

- Salvar uma turma pode gravar turma + ata + 30 matrículas + identidades + elos. Isso é **1 registro**, não 33.
- Custo no Firestore: **+1 gravação por ação** (cerca de 1 KB). Se uma página passar a gravar 1 log por documento derivado, o custo explode e o log vira ruído.

**Qual documento é o "principal"?** Quando a ação toca vários documentos, logue o que a pessoa enxerga como o objeto da ação:

| Ação | Documento principal |
|---|---|
| Cadastrar aluno novo | o aluno |
| Rematrícula (aluno já existe) | a matrícula criada |
| Editar aluno | o aluno |
| Trocar de turma / encerrar matrícula | a matrícula |
| Excluir aluno / turma **do banco** (gerir-dados-ano-ativo) | o aluno / a turma (as matrículas apagadas vão como lista enxuta dentro do `antes`) |
| Tirar um aluno **de uma turma** (cadastro-atas) | a turma, como `editar`: o aluno sai da lista, a matrícula é apagada e o cadastro só se for a única matrícula. O `resumo` diz o que foi apagado do banco |

Mudanças em documentos secundários da mesma ação entram **no mesmo registro**, não em um segundo (ver 4.5, padrão G).

**Qual `acao` usar:** a coluna "Ação" descreve o que aconteceu com o **documento principal** do registro.

| O documento principal... | `acao` | Exemplo |
|---|---|---|
| deixou de existir | `excluir` | gerir-dados-ano-ativo: apagar aluno ou turma |
| continua existindo, com algo a menos ou diferente | `editar` | cadastro-atas: aluno sai da lista da turma |

Por isso a mesma pessoa excluindo "um aluno" pode aparecer como "Excluiu" numa página e "Editou" em outra. Não é erro, mas o `resumo` **tem que dizer o efeito real no banco** (ex.: "apagou do banco 1 matrícula e o cadastro/vínculo de 1 aluno"), para a tela de consulta nunca sugerir que mais ou menos foi apagado do que de fato foi.

## 3. API do `log.js`

| Função | Uso |
|---|---|
| `Log.registrar({ acao, colecao, docId, resumo, antes, depois, parcial })` | Registro avulso. **Nunca lança erro** (falha vira `console.error`). `parcial: true` para save com merge (4.3). |
| `Log.registrarLista({ campo, colecao, docId, resumo, antes, depois, chaves, preenchidos, ignorar, rotuloItem })` | Compara duas listas (ex.: alunos da turma) e grava **1 registro só com o que mudou**. Sem mudança → não grava nada. |
| `Log.montar({...})` | Monta o registro sem gravar. Devolve `null` quando não há o que registrar. Útil para descobrir se houve diferença (`montar(...).campos`). |
| `Log.noBatch(batch, {...})` | Registro dentro de um `writeBatch` (atômico). Só para páginas que chamam `Auth.db.batch()` direto. |
| `Log.salvarDoc(ref, dados, {antes, merge})` / `Log.excluirDoc(ref, {antes})` | Atalhos quando a página tem a referência (`ref`) do documento. |

Valores de `acao`: `criar`, `editar`, `excluir`, `restaurar`, `limpeza`.

Detalhes que o `log.js` já resolve (não repetir na página):
- `schoolId` é omitido → usa a escola ativa (`Auth.getActiveSchoolId()`), e `null` se for o marcador `ADMIN`.
- Usuário (`uid`, `email`, `nome`) vem da sessão do Firebase Auth.
- `editar` sem nenhuma diferença entre `antes` e `depois` → não grava.
- Ignora `updatedAt`, `createdAt`, `atualizadoEm`, `criadoEm`, `_id` e `id` nas comparações (carimbos de data e ids não contam como alteração).
- Campo **ausente, `null` e `''` valem o mesmo** na comparação: um campo que não existia e foi gravado vazio não gera "alteração". Limpar um campo que tinha valor (`'123'` → `''`) continua sendo alteração.
- Sentinelas do Firestore (`serverTimestamp`, `increment`, `delete`) são descartadas automaticamente.
- `antes`/`depois` viram texto JSON, limitado a ~60 mil caracteres (acima disso guarda só um aviso de truncamento).

**Atenção:** só as ações `editar` e `criar` passam por comparação. `editar` **sem `antes` nem `depois`** devolve `null` e **não grava nada**. Para ações em lote, use `restaurar`/`limpeza`/`excluir` ou o padrão F (4.5).

## 4. Passo a passo para portar uma página

### 4.1 Incluir o script

Logo depois do `db.firebase.js` (e antes de qualquer script que grave):

```html
<script src="../db.firebase.js"></script>
<script src="../log.js"></script>
```

Para páginas na própria raiz: `log.js` em vez de `../log.js`. Mantenha o mesmo sufixo de versão (`?v=7`) que a página usa nos outros scripts.

### 4.2 Mapear os pontos de gravação

Procure no JavaScript da página:

```
DB\.\w+(\.\w+)*\.(save|saveAll|remove|batchWrite)
Auth\.db        \.set\(   \.update\(   \.delete\(   batch\.commit
Identidade\.    (grava por baixo)
```

Monte uma tabela e **classifique cada ponto**:

| Ponto | É ação do usuário? | Decisão |
|---|---|---|
| botão "Salvar" → grava a turma | sim | **Logar** |
| botão "Excluir" → remove um documento | sim | **Logar** (com cópia do documento) |
| gravação de matrículas / ata / identidade / elo / contador | não, é consequência | **Não logar** |
| limpeza em lote, importação, restauração, migração | sim, mas em massa | **Logar 1 resumo** (sem cópia dos documentos) |

### 4.3 Capturar o "antes"

O `antes` é como o dado estava **no banco antes da ação**. Quase sempre a página já tem isso em memória (a turma carregada, o documento aberto para edição, o documento lido "fresco" logo antes de salvar). Guarde-o no **início** da função de salvar, antes de qualquer alteração:

```js
const _antesLog = Array.isArray(turmaAtual.alunos) ? turmaAtual.alunos : [];
```

**Não faça uma leitura extra no Firestore só para o log.** Se a página não tem o "antes" em memória, registre só o `resumo` e o `depois`, e avise na entrega.

**Gravação com merge parcial (`set` com `merge:true`, ou `update`).** O que não vai no payload continua como está no banco, então o log não pode tratar essas chaves como "removidas". Há duas formas; use a **primeira** (versão 3):

**1) `parcial: true`** (recomendada): passe o `antes` (o documento como estava) e o `depois` (só o que foi enviado). Com `parcial: true`, o `log.js` compara **só as chaves presentes no `depois`**.

```js
await window.DB.turmas.save(payload);                  // payload = { nome, turno, atualizadoEm, ... }
await Log.registrar({ acao: 'editar', colecao: 'turmas', docId: id,
  resumo: `Turma ${nome}`, antes: docOriginal, depois: payload, parcial: true });
```

Campo que não existia e foi gravado vazio (`''`/`null`) já é tratado como "sem alteração" pelo `log.js`, então não é preciso limpar o `depois`.

**2) `depois` = documento completo** (ainda válido, útil quando o documento final já está montado em memória): monte o `depois` como o documento **inteiro como ficou**, sem `parcial`.

```js
const gravado = { alunoId, ...dadosComp, nome, cpfNum };          // o que a página envia
const depoisLog = { ...original, ...gravado };                    // o que ficou no banco
await Log.registrar({ acao: 'editar', colecao: 'anoAtivoAlunos', docId: alunoId, antes: original, depois: depoisLog });
```

Se você passar só os campos gravados **sem** `parcial: true`, o `log.js` entende que todo campo que existe no `antes` e não vem no `depois` foi **removido**.

Em **criação**, deixe fora do `depois` os campos grandes que não dizem nada sobre a ação (ex.: `schemaSnapshot`); o `schemaId` e o `resumo` bastam.

### 4.4 Registrar depois do sucesso, com `await`

- Chame o log **depois** que a gravação principal deu certo (não registre ação que falhou).
- Use **`await`**. Se a página recarrega ou navega logo depois, uma gravação sem `await` é cancelada e o registro some. Isso vale para `location.reload()`, `window.location.reload()`, `location.href = ...` **e também** para `setTimeout(() => location.href = ..., 2000)`: o log precisa vir **antes** do toast e do agendamento.
- Registre **logo depois do commit** e antes de passos externos (apagar arquivo no Cloudinary, enviar foto, recarregar a lista). Assim a ação fica registrada mesmo que o passo seguinte falhe.
- `Log.registrar` nunca lança erro, então não precisa de `try/catch` e não pode bloquear a ação do usuário.
- Proteja com `if (window.Log)`, para a página continuar funcionando se o `log.js` não carregar.

### 4.5 Os padrões

**A) Lista dentro de um documento** (ex.: alunos da turma, matérias do schema):

```js
if (window.Log) {
  await Log.registrarLista({
    campo: 'alunos', colecao: 'turmas', docId: turmaIdAtual,
    resumo: `Turma ${turmaAtual.nome || turmaIdAtual}`,
    antes: _antesLog, depois: turmaObj.alunos,
    chaves: [a => a?.alunoId, a => String(a?.nome || '').trim().toLowerCase()],
    preenchidos: ['alunoId'],            // id gerado no 1º salvamento não conta como alteração
    ignorar: ['alunoIdVinculado'],       // campo transitório que não vai para o banco
    rotuloItem: a => a?.nome,
  });
}
```

`chaves` são tentadas em ordem para casar um item "antes" com o "depois" (primeiro o id, depois o nome, para dados antigos sem id).

**B) Documento único** (criar / editar):

```js
await window.DB.turmas.save(obj);
if (window.Log) await Log.registrar({
  acao: antes ? 'editar' : 'criar',
  colecao: 'turmas', docId: obj.turmaId,
  resumo: 'Turma 2026 — 1º ano A',
  antes, depois: obj,                    // 'editar' grava só os campos que mudaram
});
```

Se o gravado é parcial (merge), use `parcial: true` (ver 4.3).

**C) Exclusão de documento** (guarda uma cópia, para recuperar depois):

```js
await window.DB.atas.remove(id);
if (window.Log) await Log.registrar({
  acao: 'excluir', colecao: 'atas', docId: id,
  resumo: 'Ata excluída',
  antes: documentCarregado,              // cópia completa do que foi apagado
});
```

**D) Ação em massa sem diff** (importar, limpar, restaurar): **um** registro, sem cópia dos documentos:

```js
if (window.Log) await Log.registrar({
  acao: 'limpeza', colecao: 'turmas',
  resumo: 'Apagou 12 turmas do ano 2024',
});
```

**E) Exclusão em cascata** (excluir aluno ou turma que apaga matrículas, vínculos etc.): **1 registro** no documento principal, com a cópia dele e uma **lista enxuta** dos documentos apagados junto (id e poucos campos, não a cópia completa):

```js
await window.DB.batchWrite(ops);
if (window.Log) await Log.registrar({
  acao: 'excluir', colecao: 'anoAtivoAlunos', docId: alunoId,
  resumo: `Excluiu aluno ${nome} — ${mats.length} matrícula(s), ${elos.length} vínculo(s)`,
  antes: { ...aluno, _matriculas: mats.map(matCompacta), _elos: elos.map(e => ({ id: e._id, atasId: e.atasId })) },
});
```

Para listas potencialmente grandes, limite a quantidade (`slice(0, 200)`) e guarde o total em outro campo (`_totalMatriculas`).

**F) Edição em massa sem `antes` por documento** (migração, correção de contadores): `editar` sem `antes`/`depois` não grava nada. Passe um **resumo estruturado** em `depois` (e `antes: {}`), ou, se houver o valor anterior em memória, um mapa `nome → valor` em `antes` e em `depois`:

```js
// migração: só contagens
await Log.registrar({ acao: 'editar', colecao: 'anoAtivoMatriculas',
  resumo: `Migração: ajustou ${n} matrícula(s)`,
  antes: {}, depois: { matriculasAjustadas: n, camposAjustados: { serie: 40, turno: 12 } } });

// contadores: valor anterior e novo por turma (já estavam em memória)
await Log.registrar({ acao: 'editar', colecao: 'anoAtivoTurmas',
  resumo: `Corrigiu contadores de ${n} turma(s) (alunos / integral)`,
  antes: { 'Turma A (T1)': '30 / 5' }, depois: { 'Turma A (T1)': '28 / 5' } });
```

**G) Ação que também altera um documento secundário** (ex.: editar aluno e, no mesmo salvar, o modelo da matrícula): **não crie um segundo registro**. Leve a mudança do documento secundário para o `antes`/`depois` do principal, com prefixo:

```js
_antesLog['matricula_modelo']  = matAntes.modelo ?? null;
_depoisLog['matricula_modelo'] = novoModelo;
```

Assim, se só o documento secundário mudou, o `editar` ainda tem diferença e grava.

**H) Ação em que o documento principal pode não mudar** (rematrícula: os dados do aluno ficam iguais, mas nasce uma matrícula): `editar` sem diferença não grava, e a ação sumiria. Logue o documento que **nasce ou é afetado** (`criar` da matrícula) e, se também houve mudança no outro, cite no `resumo`:

```js
const mudou = Log.montar({ acao: 'editar', antes: alunoOriginal, depois: alunoDoc });   // null = sem diferença
await Log.registrar({ acao: 'criar', colecao: 'anoAtivoMatriculas', docId: matriculaId, depois: novaMatricula,
  resumo: `Rematrícula — ${nome}` + (mudou ? ` (dados pessoais atualizados: ${mudou.campos.join(', ')})` : '') });
```

**I) Ação que troca o ID do documento** (trocar de turma gera outro `matriculaId`): use o ID **novo** em `docId` e passe `antes`/`depois` pequenos e explícitos, não os documentos inteiros:

```js
await Log.registrar({ acao: 'editar', colecao: 'anoAtivoMatriculas', docId: novoId,
  resumo: `Trocou de turma: ${turmaAntiga} → ${turmaNova} (${ano}) — ${nome}`,
  antes:  { matriculaId: mat._id, turmaId: mat.turmaId, serie: mat.serie ?? null },
  depois: { matriculaId: novoId,  turmaId: t.turmaId,  serie: nova.serie } });
```

**J) Lote que pode falhar no meio** (`for` com `batchWrite` de 400 em 400): cada lote é atômico, mas o conjunto não. Conte os lotes já gravados e, se der erro depois do primeiro, registre a interrupção:

```js
let _feitos = 0;
try {
  for (let i = 0; i < ops.length; i += 400) { await DB.batchWrite(ops.slice(i, i + 400)); _feitos = Math.min(i + 400, ops.length); }
  if (window.Log) await Log.registrar({ /* registro normal */ });
  _feitos = 0;                      // concluído: um erro posterior (ex.: recarregar a tela) não é "interrupção"
} catch (e) {
  if (_feitos && window.Log) await Log.registrar({ acao: 'editar', colecao: '...',
    resumo: `... INTERROMPIDA por erro: ${_feitos} de ${ops.length} já gravada(s)`, antes: {}, depois: { gravadas: _feitos } });
  // ...mensagem de erro da página
}
```

**K) Convenção do `resumo`:** `O que aconteceu — nome do registro, contexto`. Exemplos: `Rematrícula — Maria Silva — turma 1º A, 2026`; `Excluiu turma 2º B (2026) — 28 matrícula(s), 3 avatar(es)`. É o texto que aparece na tela de consulta; use palavras, não IDs soltos.

**L) Documento que pode já existir** (readmitir um aluno cuja matrícula encerrada tem o **mesmo ID**: o `set` reaproveita o documento em vez de criar outro): a mesma ação do usuário pode ser `criar` ou `editar`, conforme o documento já existia. Decida pelo que a página **já leu** antes de gravar (sem leitura extra) e diga isso no `resumo`:

```js
const reaproveitada = todas.find(m => m._id === matriculaId) || null;   // lista que a página já leu
const resumo = `Readmissão — ${nome} — turma ${turma}, ${ano}` + (reaproveitada ? ' (reativou matrícula encerrada)' : '');
if (reaproveitada) await Log.registrar({ acao: 'editar', colecao: 'anoAtivoMatriculas', docId: id, resumo,
  antes: reaproveitada, depois: novaMatricula, parcial: true });
else await Log.registrar({ acao: 'criar', colecao: 'anoAtivoMatriculas', docId: id, resumo, depois: novaMatricula });
```

Se a mesma gravação **apaga documentos secundários** (matrículas encerradas de outras turmas no mesmo ano), não faça um segundo registro: leve uma lista enxuta no `depois` (`_residuosApagados`) e cite a quantidade no `resumo` (padrão G).

**M) Campo limpo com `FieldValue.delete()`:** o `log.js` descarta sentinelas, então a limpeza não aparece. Para ela aparecer nos Detalhes, monte o `depois` do log com `null` no lugar (`{ ...payload, encerradoEm: null }`). Com `vazio ≡ ausente` (versão 3), `null` mostra "tinha data → ficou vazio". O `payload` que vai para o banco continua com o `delete()`.

### 4.6 O que NÃO registrar

- Gravações derivadas: matrículas, ata, identidade (`alunos-atas`), elo, contadores (`system/contadores`), índices (`atasIndice`), caches.
- **Contadores com `increment()`** (`qtdAlunos`, `qtdIntegral`) e **cópias de campos de busca** (`nome`, `sexo`, `nascDia/Mes/Ano` copiados do aluno para as matrículas) que acompanham outra gravação. Só viram registro quando a **própria ação do usuário** é corrigi-los (padrão F).
- Reserva de IDs (contadores de `Identidade`).
- Leituras (consultas, pesquisas). Só o log de gravação é necessário.
- Rascunhos em memória, antes do "Salvar".
- Uploads de arquivos (Cloudinary), foto e documentos (`fotoUrl`, `fotoFileId`), a menos que a ação do usuário seja justamente excluir/trocar o documento no banco. A exclusão do arquivo remoto **não** é logada; a do documento no banco, sim.

## 5. Exemplos reais

### 5.1 `cadastro-atas.html`

| Ponto da página | Decisão |
|---|---|
| `salvarTurmasDB` (grava a turma, 2 vezes no fluxo) | Derivado do "Salvar": não logado separado |
| `DB.atas.save`, `DB.matriculas.saveAll`, `Identidade.*`, `DB.batchWrite` (limpeza de identidade/elo) | Derivados: não logados |
| `DB.matriculas.remove` das exclusões marcadas | Já aparece como "removido" na lista de alunos |
| **Fim de `_salvarNoBancoInterno`** | **1 registro** com `registrarLista` (padrão A) |
| `Identidade.renomearAtas` (afeta todas as turmas) | **1 registro** extra, `colecao: 'alunos-atas'` (padrão B) |

Exclusão de aluno marcada na tela: o registro é `editar` na turma (o aluno sai da lista) e o `resumo` informa o que foi apagado do banco: "apagou do banco N matrícula(s)" e, quando era a única matrícula do aluno em Atas, "e o cadastro/vínculo de N aluno(s)". O aluno só **some do sistema** se essa era a única matrícula dele em Atas; os dados do módulo Ano-Ativo não são tocados.

Detalhes: `_antesLog` capturado no início, antes de montar o `turmaObj`; o log vem depois de `garantirIdsESistemaParaTurma` e das exclusões e **antes** de `turmaAtual = turmaObj` e do `location.reload()`; falha parcial vira sufixo "com falhas parciais" no `resumo`; salvar sem mudar nada não grava.

### 5.1b `cadastro-turmas.html`

Uma única gravação de usuário: `salvarTurma()` → `DB.turmas.save(payload)`, em dois modos.

| Ponto da página | Decisão |
|---|---|
| `DB.turmas.save` na **criação** | **1 registro** `criar` (padrão B), sem o `schemaSnapshot` |
| `DB.turmas.save` na **edição** (só `nome` e `turno`, merge) | **1 registro** `editar` com `parcial: true`; o `antes` é o `docOriginal` que a página já tem |
| `registrarAnoNoIndice` (`atasIndice` da escola) | Consequência da criação: não logado |

O log fica logo depois do `save` e **antes** do `window.location.reload()` da edição, com `await`. Se nome e turno não mudaram, não grava nada.

### 5.2 `cadastro-aluno-ativo.html`

Tudo grava por `DB.batchWrite(ops)`, mas a página decide o que é a ação.

| Ação | Registro | `antes` (sem leitura extra) |
|---|---|---|
| Cadastro de aluno novo | `criar` em `anoAtivoAlunos` (padrão B) | não tem |
| Rematrícula | `criar` em `anoAtivoMatriculas` (padrão H) | `alunoOriginal` |
| Editar aluno | `editar` em `anoAtivoAlunos`, com `matricula_*` (padrões B e G) | `original` |
| Trocar de turma | `editar` na matrícula nova (padrão I) | `mat` |
| Encerrar matrícula | `editar` em `anoAtivoMatriculas` | `matAluno` |

Não logados: contadores da turma, cópia de busca nas matrículas, elo, foto e documentos.

### 5.3 `gerir-dados-ano-ativo.html` (página de administração)

| Ação | Registro |
|---|---|
| Migração de matrículas | `editar` em `anoAtivoMatriculas`, contagem por campo (padrão F) + interrupção (padrão J) |
| Corrigir contadores | `editar` em `anoAtivoTurmas`, valores antes → depois por turma (padrões F e J) |
| Remover matrículas duplicadas | `excluir`, lista enxuta das removidas e qual ficou, limitada a 150 (padrões E e J) |
| Importar backup JSON | `restaurar`, 1 resumo com arquivo e contagens (padrão D); interrupção também registrada |
| Excluir aluno | `excluir` em `anoAtivoAlunos` com cópia do aluno + matrículas e vínculos enxutos (padrão E) |
| Excluir turma | `excluir` em `anoAtivoTurmas` com cópia da turma + matrículas enxutas (padrão E) |
| Gerar ata (ano-ativo → Atas) | `criar` em `turmas` (módulo de Atas), com resumo da ata gerada, não o documento inteiro |
| Apagar matrícula solta (consistência) | `excluir` em `anoAtivoMatriculas` com a cópia (`m` já lido) |

Não logados: índice de anos (`atasIndice`), reserva de IDs, exclusão de arquivos no Cloudinary, buscas e verificações (só leitura).

### 5.4 `gestao-atas.html` (administração do módulo de Atas)

Tudo o que grava é um botão de administração, então cada clique é 1 registro.

| Ação | Registro |
|---|---|
| Apagar turmas selecionadas | `excluir` em `turmas`: lista enxuta das turmas removidas (id, nome, ano, turno, qtd de alunos, limite de 150) e, no `resumo`, as atas/matrículas apagadas junto e os cadastros de aluno sem matrícula (padrão E) |
| Aplicar merge (importar JSON) | `restaurar` em `turmas`: 1 resumo com as contagens e os primeiros nomes (padrão D). Se a gravação falha no meio, registra "COM FALHA" com a mensagem, porque parte dos lotes pode já ter sido gravada (padrão J) |
| Reconstruir índice de anos | `editar` em `schools` (doc da escola): `antes`/`depois` com a lista de anos, `resumo` com o que entrou e saiu (padrão F: o usuário corrige o índice de propósito) |
| Consistência: apagar matrícula | `excluir` em `matriculas`, com a cópia da matrícula; o `resumo` diz se o cadastro e o vínculo foram apagados junto |
| Consistência: apagar as matrículas de aluno sem cadastro | `excluir` em `matriculas`: lista enxuta das matrículas (limite de 150) |
| Consistência: recriar cadastro | `criar` em `alunos-atas` |
| Consistência: apagar cadastro sem matrícula / apagar vínculo (elo) | `excluir` em `alunos-atas` / `alunos`, com a cópia do documento |
| Consistência: aplicar nome / atualizar último ano | `editar` em `alunos-atas`, com `antes` e `depois` pequenos e explícitos |

Não logados: o GC de identidades órfãs depois de apagar turmas (conta no `resumo`), `reconstruirAuxiliares` e `recalcularUltimoAnoRegistroBatch` (derivados do merge), limpeza de scans no Cloudinary, e as verificações de consistência (só leitura).

### 5.5 `cadastro-turma-ativa.html`

Três pontos de gravação, todos com o `antes` já em memória. Os dois primeiros saem do mesmo botão "Salvar".

| Ponto da página | Decisão |
|---|---|
| `salvarTurma`, **criação** (`DB.anoAtivoTurmas.save`) | **1 registro** `criar` em `anoAtivoTurmas` (padrão B). `resumo`: nome, ano, turno e séries. Os contadores `qtdAlunos`/`qtdIntegral` nascem em 0 e ficam só no `depois` |
| `salvarTurma`, **edição** (só nome, turno e professor, com merge) | **1 registro** `editar` com `parcial: true`; o `antes` é o `get()` fresco que a página já faz. Sem mudança não grava (`professor` novo vazio não conta, versão 3) |
| `toggleStatusTurma` (inativar / reativar) | **1 registro** `editar` com `parcial: true`: `antes` = a turma em memória, `depois` = `{ status }`. `resumo` "Inativou/Reativou turma X (ano)" |
| `garantirAnoAtivoConfig` (`DB.escola.save`, grava o ano ativo se a escola ainda não tem) | Consequência de salvar a turma: não logado |

O log fica logo depois do `save` e **antes** do `window.location.reload()`, com `await`. O `originalLog` é guardado fora do `if (ehEdicao)` só para o log (sem leitura extra).

### 5.6 `readmitir-aluno.html`

Uma ação do usuário ("Confirmar readmissão"), vários documentos no mesmo `DB.batchWrite`.

| Ponto da página | Decisão |
|---|---|
| Matrícula nascendo ou sendo reativada | **1 registro** no documento principal, a matrícula: `criar` (nasce) ou `editar` com `parcial: true` (reaproveita a encerrada da mesma turma/ano), conforme o padrão L |
| Matrículas encerradas do mesmo ano em **outra** turma, apagadas junto (os "resíduos") | Mesmo registro: `resumo` com a quantidade e `_residuosApagados` (lista enxuta) no `depois` (padrão G/L) |
| `encerradoEm: FieldValue.delete()` na matrícula reativada | `encerradoEm: null` só no `depois` do log, para a limpeza aparecer (padrão M) |
| Contador da turma, cópia de busca nas outras matrículas, foto (`DB.anoAtivoMatriculas.save` x2) | Derivados: não logados |

O log fica logo depois do `batchWrite`, com `await`, **antes** da foto e do `setTimeout` do redirect.

## 6. Armadilhas

1. **Sem `await` antes de recarregar ou redirecionar** → o registro some. Vale também para `setTimeout` com redirect.
2. **Log por documento derivado** → custo multiplicado e ruído. Siga a regra de ouro.
3. **Leitura extra só para obter o "antes"** → gasta cota de leitura. Use o que está em memória.
4. **Só admin grava logs** (regras). Se um usuário comum chegar a executar o código, o log falha silenciosamente com `console.error` e a página continua normal.
5. **Marcador `ADMIN`**: admin global sem escola selecionada fica com `schoolId: null` no registro.
6. **Não alterar texto nem visual da página.** Esta tarefa só adiciona chamadas ao `Log` no JavaScript.
7. Documento com cópia grande (exclusão de turma com muitos alunos) pode passar de ~60 mil caracteres: o registro guarda só o aviso de truncamento e o `resumo`. Se isso importar, coloque no `resumo` os dados essenciais (nome, ano, quantidade) e use listas enxutas (padrão E).
8. **`depois` parcial em edição com merge, sem `parcial: true`** → campos "removidos" que na verdade não mudaram. Use `parcial: true` ou monte o `depois` completo (4.3).
9. **`editar` sem diferença não grava**, o que some com ações cujo efeito principal está em outro documento (rematrícula). Logue o documento que nasce ou é afetado (padrão H).
10. **O log é gravado depois do commit e separado dele.** Se o log falhar, a ação já foi feita e fica sem registro. É esperado (o log não pode bloquear o usuário). Para ter atomicidade, só passando o registro dentro do mesmo batch (`Log.noBatch`), com o custo de uma falha do log derrubar a ação.
11. **`editar` sem `antes` nem `depois` não grava nada.** Em lote, use `restaurar`/`limpeza`/`excluir` ou o padrão F.
12. **Erro depois do sucesso** (ex.: ao recarregar a tela) cai no `catch` e pode registrar uma "interrupção" falsa. Zere o contador de lotes depois do log de sucesso (padrão J).
13. **`FieldValue.delete()` some do log** (sentinela descartada). Se limpar o campo é parte da ação, passe `null` no `depois` do log (padrão M).
14. **Um mesmo clique pode ser `criar` ou `editar`** (documento reaproveitado). Decida pelo que a página já leu e diga no `resumo` (padrão L); não leia o banco só para decidir.

## 7. Como medir o consumo

1. Antes de usar a página: Firebase Console → **Firestore Database → aba Uso (Usage)** e anote as gravações do dia (e das leituras).
2. Use a página normalmente por um dia (salvar, editar, excluir).
3. Compare as gravações do dia: o aumento deve ser de **+1 por ação do usuário**, não +N.
4. Em `admin_backup.html`, **Consultar** e abra **Detalhes** de alguns registros: confira se o `resumo` e o antes/depois fazem sentido.
5. No console do Firestore, abra um documento de `logs` e veja o tamanho do maior caso (ex.: importação grande, exclusão de turma).
6. Estimativa de armazenamento: ~1 KB por registro. 1.000 ações/dia ≈ 30 MB/mês.

## 8. Checklist por página (preencher na entrega)

- [ ] `<script src="../log.js">` incluído depois do `db.firebase.js`
- [ ] Versão do `log.js` conferida (`Log.VERSAO === 3`)
- [ ] Todos os pontos de gravação listados e classificados (ação do usuário / derivado)
- [ ] `antes` capturado no início da função, sem leitura extra
- [ ] Em gravação com merge, `parcial: true` ou `depois` é o documento completo (4.3)
- [ ] Cada ação do usuário gera **1** registro (padrão A a M)
- [ ] `await` em todos os registros, **antes** de reload/redirect/`setTimeout`; `if (window.Log)` em volta
- [ ] Nenhum registro para gravações derivadas, contadores/busca acompanhando outra ação, nem leituras
- [ ] Lotes de 400 com contagem de interrupção (padrão J), quando houver
- [ ] Nenhum texto/visual da página alterado
- [ ] Sintaxe do JavaScript conferida: extrair cada `<script>` inline e rodar `node --check`

**Relatório final (por página):**
- quais pontos foram logados e em qual coleção/documento principal;
- quais foram deixados de fora e por quê;
- qualquer ação cujo "antes" não estava disponível;
- **decisões tomadas** (qual documento foi o principal, o que entrou como `matricula_*`, o que foi limitado) para quem revisa poder conferir.

## 9. Teste manual (por página)

| Cenário | Esperado em `admin_backup.html` → Consultar |
|---|---|
| Editar um dado e salvar | 1 registro "Editou", Detalhes mostram só o campo alterado |
| Salvar sem mudar nada | nenhum registro novo |
| Criar | 1 registro "Criou" |
| Excluir | 1 registro "Excluiu", Detalhes com a cópia do documento |
| Ação em massa | 1 registro só, com o resumo |
| Falha ao salvar (simular) | nenhum registro da ação que falhou |
| Rematrícula (sem mudar dados pessoais) | 1 registro "Criou" na matrícula |
| Editar mudando só um dado do documento secundário (ex.: modelo da matrícula) | 1 registro "Editou" com `matricula_*` nos Detalhes |
| Trocar de turma / encerrar matrícula | 1 registro cada, com `resumo` legível |
| Excluir com cascata (aluno, turma) | 1 registro, cópia do principal + lista enxuta dos apagados |
| Lote interrompido (simular erro no 2º lote) | 1 registro "INTERROMPIDA" com a quantidade já gravada |
| Inativar e reativar uma turma | 1 registro "Editou" cada, com só `status` nos Detalhes |
| Editar só um campo de um documento com merge (ex.: professor da turma) | 1 registro "Editou" só com esse campo; salvar sem mudar nada não grava |
| Readmitir com matrícula encerrada na **mesma** turma/ano | 1 registro "Editou" com `status`, `situacao` e `encerradoEm` → vazio nos Detalhes |
| Readmitir com matrícula encerrada em **outra** turma do mesmo ano | 1 registro "Criou", `resumo` com a quantidade de resíduos apagados |

## 10. Decisão registrada: log na página, não no `db.firebase.js`

Foi analisada a alternativa de registrar dentro de `DB.batchWrite`/`save`. **Decisão: manter o log na página.** Motivos:

1. A camada não sabe qual é a ação do usuário. Um "Salvar" chega ao `batchWrite` como 4 a 6 operações (principal, matrículas, cópia de busca, contador, elo). Logar por operação viola a regra de ouro; logar 1 genérico perde o `resumo` útil.
2. Não tem o `antes`. Obtê-lo ali custaria 1 leitura por documento.
3. Contadores e cópia de busca viriam juntos, exigindo uma lista de exceções difícil de manter.
4. `save()`, `saveAll()` e `remove()` seguem outros caminhos; cobrir tudo exige instrumentar todos.

**Opção futura (meio-termo), se for preciso atomicidade:** `DB.batchWrite(ops, { log: {...} })`, em que a página decide o registro e o `batchWrite` apenas o inclui no mesmo commit com `Log.noBatch`. Custo: se o log falhar (por exemplo, usuário sem permissão), o commit inteiro falha e bloqueia a ação do usuário.
