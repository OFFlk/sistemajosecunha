# Diagnóstico: Carga Horária (CH) não preenchida no export de histórico

**Status:** causa raiz identificada, correção pendente.
**Módulos envolvidos:** `schema_ch.html`, `historico_auto.html`, `db.firebase.js`
**Sintoma relatado:** ao criar um schema de CH novo (formato multi-disciplina, com `cargas`/`cargasT2`/`series`), o export de histórico em `historico_auto.html` sai sem nenhuma carga horária preenchida — nem no modo "regra específica" nem no modo "regras globais" (que nesse caso cai de volta no comportamento do schema antigo, turno 1 apenas).

---

## O que foi descartado

Antes de chegar na causa raiz, as seguintes hipóteses foram testadas e **descartadas**:

1. **Lógica de casamento ano/disciplina/série** (`resolveCHForSelected`, `chMatchEtapaOptional`, `chCanonSerie` em `historico_auto.html`) — testada isoladamente em Node.js com dados equivalentes aos reais; funcionou corretamente.
2. **Normalização de série entre páginas** — `chCanonSerie`/`nrm` são idênticas em `schema_ch.html` e `historico_auto.html`.
3. **Regra sem série definida (`series: []`)** — nesse caso `chMatchEtapaOptional` retorna `true` incondicionalmente (bypassa o teste de etapa por completo). Mesmo assim a CH saiu em branco, o que prova que a série não pode ser a causa nesse cenário.
4. **`prepararDataDocxComMarcacaoFonteNC`** (função que prepara os dados antes de gerar o DOCX) — só mexe em campos `_NC` (notas), não em `_CH`. Confirma que o problema acontece **antes**, dentro de `buildPlaceholders()`.

## Causa raiz confirmada

O problema está na camada de persistência (`db.firebase.js`), especificamente em `makeCollection(colName).saveAll()`:

```js
async saveAll(arr) {
  ...
  arr.slice(i, i + 400).forEach(obj => {
    const { _id, ...data } = obj;
    data.updatedAt = ts;
    // Usa _id explícito ou chave de negócio como ID do documento
    const businessKey = _id || obj.alunoId || obj.turmaId || obj.matriculaId || null;
    const ref = businessKey ? col(colName).doc(String(businessKey)) : col(colName).doc();
    batch.set(ref, data, { merge: true });
  });
  ...
}
```

### Problema 1 — `saveAll` não reconhece `id` como chave de negócio

As regras de CH usam o campo **`id`** (minúsculo, gerado em `chSalvarRegra()` como `ch_${Date.now()}_...`). A lista de `businessKey` só verifica `_id`, `obj.alunoId`, `obj.turmaId`, `obj.matriculaId` — **`id` não está nessa lista**.

- `_id` só existe num objeto de regra depois que ele já foi lido do Firestore pelo menos uma vez (é injetado por `snap2arr`: `{_id: d.id, ...d.data()}`).
- Toda regra **recém-criada na UI** não tem `_id` ainda.
- `saveAll()` **não retorna nada** — mesmo que criasse o doc corretamente, o `_id` gerado nunca volta pro objeto em `chState.rules`.

Resultado: `col(colName).doc()` (sem argumento) é chamado, gerando **um novo ID aleatório no Firestore a cada `saveAll`** — e `chSaveLS()` é disparado em qualquer ação (criar, editar, duplicar, reordenar, excluir *outra* regra), pois sempre reenvia o array inteiro. Cada chamada duplica a mesma regra lógica como um documento novo no Firestore.

**Evidência:** dois documentos com `_id` diferentes carregando o mesmo `id: 'ch_1784807293778_miw9j'` foram encontrados na coleção real.

### Problema 2 — exclusão nunca é propagada ao Firestore

```js
async remove(id) { ... }
async removeWhere(field, value) { ... }
```

Esses métodos existem em `makeCollection`, mas **nenhuma das páginas os chama**. O botão "Excluir" faz apenas:
```js
chState.rules.splice(i,1); chSaveLS();
```
Isso remove a regra do array local e resalva — mas `saveAll()` só faz *upsert* dos itens presentes no array; nunca deleta o que ficou pra trás no Firestore. Toda regra "excluída" ao longo do tempo permanece viva na coleção `schemasCH`.

### Consequência observada

A coleção `schemasCH` acumula lixo: documentos duplicados da mesma regra (em estados diferentes — às vezes salvos no meio de uma edição, com `cargas` incompletas) e regras "excluídas" que nunca sumiram. Isso foi confirmado comparando o `localStorage['historicoCHSchemas_v1']` das duas páginas na mesma sessão:

- **`schema_ch.html`** (após criar/editar): 2 regras (`teste 2`, `Padrão (arquivo original)`).
- **`historico_auto.html`** (`DB.schemas.listRules()` no carregamento): **9 regras**, incluindo duplicatas de `id` e documentos de formato divergente (ex.: `{colunas, ordenarPor, resultadoAtivo, serieAtiva, version, ...}` — de outro sistema/formato legado, sem `cargas`/`anos`, presumivelmente ignorado pelo filtro de `readCHRulesRaw` mas ocupando espaço na coleção).

### Como isso quebra a exportação de CH

`historico_auto.html` recarrega as regras do Firestore a cada load de página (`initCHRulesHist()`) e sobrescreve o `localStorage` local com o resultado — sem merge, sem dedupe. A resolução de CH (`resolveCHForSelected`/`resolveCHT2ForSelected`) usa `.find()`/`.filter()` sobre esse array, cuja **ordem vem da query do Firestore, não da ordem de criação/prioridade pretendida**:

- **Modo "regra específica" (`RULE:id`)** — se existir mais de um documento com o mesmo `id` (regra salva mais de uma vez antes de recarregar), o `.filter(r=>r.id===cfg.id)` pode devolver múltiplos, e o `.find()` seguinte pode bater primeiro numa cópia incompleta (salva antes de `cargas` estar preenchida) → CH em branco.
- **Modo "regras globais" (`GLOBAL`)** — `pool` é o array inteiro; regras antigas/legadas presentes em posições anteriores no array vencem o `.find()` antes de alcançar a regra nova → export sai idêntico ao comportamento do schema antigo (só turno 1).

---

## Correção necessária (quando for mexer)

Em `db.firebase.js`, dentro de `makeCollection(colName).saveAll()`:

1. **Incluir `id` na lista de `businessKey`:**
   ```js
   const businessKey = _id || obj.id || obj.alunoId || obj.turmaId || obj.matriculaId || null;
   ```
   (isso garante upsert real — sempre grava no mesmo doc pra uma regra com o mesmo `id`, mesmo antes de ela ter passado pelo Firestore uma vez.)

2. **Fazer `saveAll()` devolver os objetos salvos** (com `_id` preenchido), e as páginas atualizarem `chState.rules` com esse retorno — assim o app sempre sabe o `_id` real de cada regra depois do primeiro save, mesmo sem reload.

3. **Implementar delete real ao excluir uma regra**, chamando `DB.schemas.remove(id)` (ou `removeWhere('id', ruleId)` caso o Firestore tenma `_id` diferente do `id` de negócio) no `chAcoesRegra('del', id)`, em vez de só tirar do array local.

4. **Rodar uma limpeza única na coleção `schemasCH`** pra remover os documentos duplicados/órfãos já acumulados (via `removeWhere` ou manualmente pelo console/Firebase). Sem isso, mesmo depois do fix, o lixo antigo continua interferindo até ser limpo.

---

## Como verificar rapidamente, a qualquer momento

No console do navegador, em qualquer página que use `DB.schemas`:
```js
JSON.parse(localStorage.getItem('historicoCHSchemas_v1'))
```
Se aparecer mais de um item com o mesmo `id` (campo minúsculo, não `_id`), ou itens com `cargas: {}`/formato estranho, a duplicação ainda está presente na coleção `schemasCH`.
