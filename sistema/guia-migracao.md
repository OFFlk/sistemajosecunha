# Guia de Migração de Páginas — Sistema Escolar

## Visão geral

Cada página antiga tem tudo inline: CSS, header, scripts de tema e chip.
O objetivo é deixar cada página só com o que é **exclusivo dela**.
O restante já está nos arquivos globais.

---

## 1. O que já está nos arquivos globais (NÃO duplicar)

### `header.css`
Contém tudo relacionado ao header e tema:
- Reset (`*, *::before, *::after`)
- Variáveis `:root` e `html[data-theme="dark"]` (--bg, --header-bg, --chip-bg, --ink, --muted, --line, --brand-*, --tbtn-*, --chip-*, --mark-*, --school-*, --btn-back-*, --btn-home-*, --dropdown-bg, --danger-*, --glow)
- `body` e `body::before`
- `.l-bar`
- `.app-header`, `.app-header-inner`, `.brand`, `.mark`, `.brand-title`, `.brand-sub`, `.v-badge`, `.header-actions`
- `.theme-toggle`, `.theme-toggle-compact`
- `.btn-back`, `.btn-home`
- `.header-context`, `.ctx-chip`, `.school-pill`, `.ctx-menu`

### `base.css`
Contém estilos gerais de layout:
- `.container`
- `a`, `footer`, `.l-fdot`
- Tipografia base

### `components.css`
Contém componentes reutilizáveis:
- `.card`, `.card-head`, `.card-body`
- `.section`, `.section-title`
- `.filters`, `.filter-actions`
- `.field`, `.field label`, `.field input`, `.field select`
- `.btn`, `.btn.primary`
- `.message`, `.message.err`, `.message.show`
- `.table-scroll`, `table`, `th`, `td`
- `.badge`, `.pill`, `.mono`
- `.row-actions`

### `header-logic.js`
Cuida de tudo do header via JS:
- Montar o HTML do header
- Tema (toggle claro/escuro)
- Chip de usuário e escola
- Auth guard (requireAuth)

---

## 2. O que FICA em cada página

Só o que é **exclusivo** daquela página:

- Variáveis CSS que a página sobrescreve (ex: `--card-bg`, `--field-bg`, `--shadow`)
- Classes de layout específicas (ex: `.grid2`, `.tabs`, `.tab`, `.note-box`)
- Classes de botões específicos (ex: `.btn-approve`, `.btn-danger-sm`, `.btn-primary`)
- Qualquer estilo que não existe nos arquivos globais

---

## 3. Passo a passo da migração

### PASSO 1 — Substituir o `<head>`

**Remover:**
```html
<style>
  /* TODO o bloco de CSS inline */
</style>
```

**Manter/adicionar:**
```html
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="icon" href="../icon.png" type="image/png"/>

<!-- Tema antecipado (manter — evita flash de tema errado) -->
<script>
(function(){
  var saved = (localStorage.getItem('ui_theme_v1') || '').toLowerCase();
  var theme = (saved === 'dark' || saved === 'light') ? saved : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
</script>

<!-- Scripts globais -->
<script src="../auth.firebase.js"></script>
<script src="../db.firebase.js"></script>
<script src="../theme-colors.js"></script>

<!-- Fonte -->
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">

<!-- CSS globais -->
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/header.css">
<link rel="stylesheet" href="/css/components.css">

<!-- CSS específico desta página (só o que não está nos globais) -->
<style>
  /* ── Variáveis que esta página sobrescreve ── */
  :root {
    --card-bg:      #ffffff;
    --card-border:  var(--brand-border);
    --field-bg:     #ffffff;
    --field-border: var(--brand-border);
    --shadow:       0 4px 20px rgba(0,0,0,0.06);
  }
  html[data-theme="dark"] {
    --card-bg:      #131c2e;
    --card-border:  #2a3a5c;
    --field-bg:     #0a1426;
    --field-border: #1e2540;
    --shadow:       0 4px 24px rgba(0,0,0,0.4);
  }

  /* ── Classes exclusivas desta página ── */
  /* (só o que não existe em nenhum dos .css globais) */
</style>

<title>Título da Página</title>
</head>
```

> **Páginas na raiz** (ex: `index.html`): use `src="auth.firebase.js"` sem `../`
> **Páginas em subpasta** (ex: `/admin/`): use `src="../auth.firebase.js"`
> Os CSS globais sempre com `/css/` (caminho absoluto — funciona de qualquer nível)

---

### PASSO 2 — Substituir o header inline no `<body>`

**Remover todo esse bloco:**
```html
<div class="l-bar"></div>
<header class="app-header">
  <div class="app-header-inner">
    ...tudo...
  </div>
</header>
```

**Substituir por:**
```html
<div id="header-placeholder"></div>
```

---

### PASSO 3 — Remover os scripts inline de tema e chip

**Remover estes blocos completamente** (o `header-logic.js` já faz tudo isso):

```html
<!-- REMOVER: script de tema inline -->
<script>
(function(){
  function applyTheme(theme){ ... }
  function init(){ ... }
  ...
})();
</script>

<!-- REMOVER: script de chip de usuário inline -->
<script>
(function(){
  function renderHeaderContext(){ ... }
  ...
})();
</script>
```

**Como identificar esses scripts:**
- Script de tema: contém `themeToggle`, `applyTheme`, `themeIcon`
- Script de chip: contém `renderHeaderContext`, `headerContext`, `ctx-chip`, `school-pill`

---

### PASSO 4 — Ajustar os scripts no final do `<body>`

**Ordem correta no final do body:**
```html
<!-- 1. header-logic (sempre primeiro — monta header, tema, chip, auth guard) -->
<script src="../header-logic.js"></script>

<!-- 2. Script específico da página (só a lógica desta página) -->
<script>
(function(){
  'use strict';
  // lógica da página aqui
})();
</script>

</body>
```

> **Remover** qualquer `<script src="../header-logic.js">` que esteja no meio da página.
> Ele deve ser **sempre o primeiro script no final do body**.

---

### PASSO 5 — Verificar o CSS que sobrou

Depois de remover o `<style>` completo, adicione de volta **só** o que não está nos globais.

**Checklist — o que REMOVER do CSS inline (já está nos globais):**

| Classe/seletor | Onde está |
|---|---|
| `*, *::before, *::after` | `header.css` |
| `:root { --bg, --header-bg, --chip-*, --mark-*, ... }` | `header.css` |
| `html[data-theme="dark"] { ... }` | `header.css` |
| `body`, `body::before` | `header.css` |
| `.l-bar` | `header.css` |
| `.app-header`, `.app-header-inner` | `header.css` |
| `.brand`, `.mark`, `.brand-title`, `.brand-sub`, `.v-badge` | `header.css` |
| `.header-actions`, `.theme-toggle`, `.theme-toggle-compact` | `header.css` |
| `.btn-back`, `.btn-home` | `header.css` |
| `.header-context`, `.ctx-chip`, `.school-pill`, `.ctx-menu` | `header.css` |
| `.container` | `base.css` |
| `a`, `footer`, `.l-fdot` | `base.css` |
| `.card`, `.card-head`, `.card-body` | `components.css` |
| `.field`, `.field input`, `.field select` | `components.css` |
| `table`, `th`, `td` | `components.css` |
| `.pill`, `.mono`, `.badge`, `.row-actions` | `components.css` |

**O que normalmente FICA no CSS inline da página:**

| Classe | Motivo |
|---|---|
| `--card-bg`, `--field-bg`, `--shadow` | Variáveis sobrescritas por esta página |
| `.tabs`, `.tab` | Exclusivo de páginas com abas |
| `.note-box`, `.note-box-head` | Exclusivo de páginas com caixas de nota |
| `.grid2` | Layout de formulário específico |
| `.btn-primary`, `.btn-danger-sm`, `.btn-approve` | Botões específicos desta página |
| `.spacer` | Espaçador simples |
| Qualquer classe que não aparece na tabela acima | Manter |

---

## 4. Estrutura final de cada página

```
<head>
  meta + favicon
  script tema antecipado        ← manter
  auth.firebase.js              ← manter
  db.firebase.js                ← manter
  theme-colors.js               ← manter
  Google Fonts                  ← manter
  /css/base.css                 ← adicionar
  /css/header.css               ← adicionar
  /css/components.css           ← adicionar
  <style> exclusivo da página   ← só o que não está nos globais
  <title>
</head>
<body>
  <div id="header-placeholder"></div>   ← substitui o header inline

  <!-- conteúdo da página -->

  <script src="../header-logic.js"></script>   ← sempre antes do script da página
  <script>
    /* lógica específica da página */
  </script>
</body>
```

---

## 5. Erros comuns

**Header não aparece:**
Confirmar que `<script src="../header-logic.js"></script>` está no final do body.
Páginas na raiz usam `src="header-logic.js"` (sem `../`).

**CSS quebrado após migração:**
Alguma variável foi removida mas ainda é usada. Adicionar de volta no `<style>` da página.

**Dados não carregam:**
O script da página deve ouvir `auth:ready`:
```javascript
document.addEventListener('auth:ready', async function(){
  await minhaFuncaoDeCarregamento();
}, { once: true });
```

**Tema não funciona:**
Confirmar que o script de tema antecipado está no `<head>` **antes** de qualquer outro script.

