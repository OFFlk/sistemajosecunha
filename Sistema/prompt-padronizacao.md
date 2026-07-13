# PROMPT DE PADRONIZAÇÃO — Sistema de gestão escolar
# Use este prompt em um novo chat para cada página que precisar padronizar.
# Cole o conteúdo do arquivo HTML da página junto com este prompt.

---

Você vai padronizar uma página HTML de um sistema de gestão escolar.
Siga as instruções abaixo com atenção — não altere nada além do que está indicado.

## O QUE FAZER

### 1 — Substituir o bloco de CSS do header

No `<head>` da página, localize o bloco `<style>` e **remova** os seguintes grupos de regras CSS:

- `*, *::before, *::after` (reset)
- `:root { ... }` (variáveis tema claro)
- `html[data-theme="dark"] { ... }` (variáveis tema escuro)
- `body { ... }` e `body::before { ... }`
- `.l-bar { ... }`
- `.app-header`, `.app-header-inner`
- `.brand`, `.mark`, `.brand-title`, `.brand-sub`, `.v-badge`
- `.header-actions` e seu `@media`
- `.theme-toggle`, `.theme-toggle:hover`
- `.theme-toggle-compact`, `.theme-toggle-compact:hover`
- `.btn-back` e seus filhos `.b-icon`, `.b-label` — **SOMENTE SE** a classe `.btn-back` não for usada em nenhum elemento fora do `<header>`
- `.btn-home` e seus filhos `.b-icon`, `.b-label` — **SOMENTE SE** a classe `.btn-home` não for usada em nenhum elemento fora do `<header>`
- `.header-context`
- `.ctx-chip` e todos os seus filhos (`.avatar`, `.text`, `.name`, `.sub`)
- `.school-pill` e `.school-pill select`
- `.ctx-chip.ctx-clickable`, `.ctx-chip.ctx-clickable:focus`, `.ctx-chip.ctx-clickable:hover`
- `.school-pill:hover`
- `.ctx-menu`, `.ctx-menu.open`
- `.ctx-menu .menu-btn` e suas variações (`:hover`, `html[data-theme="dark"]`, `.danger`)

⚠️ ATENÇÃO — CLASSES COMPARTILHADAS:
Se a página usar `.btn-back` ou `.btn-home` no body (fora do `<header>`), NÃO remova o CSS dessas classes.
Em vez disso, renomeie a classe do elemento do body para algo específico (ex: `.btn-back-body`) e mantenha o CSS original no `<style>` local da página, renomeado.

Após remover os blocos acima, o `<style>` da página deve conter APENAS o CSS específico daquela página (grids, tabelas, formulários, modais, etc.).

---

### 2 — Adicionar o link do CSS padrão no `<head>`

Após a tag `<script src="../theme-colors.js"></script>`, adicione esta linha:

```html
<link rel="stylesheet" href="../header.css">
```

⚠️ Ajuste o caminho `../` conforme a profundidade da pasta da página:
- Raiz do projeto: `./header.css`
- 1 nível de pasta: `../header.css`
- 2 níveis de pasta: `../../header.css`

---

### 3 — Corrigir o Script 2 (chip de usuário + chip de escola)

Este passo tem três correções independentes. Aplique **todas** que forem encontradas na página.

---

#### 3a — Linha do `schoolName` (fora do bloco admin)

Localize a linha que monta o `schoolName` fora do bloco admin. Ela provavelmente está assim:

```js
const schoolName = matched ? (matched.name || matched.nome || '').toString().trim() : '';
```

Substitua por:

```js
const schoolName = matched ? (matched.displayName || matched.name || matched.nome || '').toString().trim() : '';
```

---

#### 3b — Texto exibido no chip/span de escola (modo usuário e modo admin)

Em **todo** o Script 2, localize qualquer trecho que define o texto visível do chip ou span de escola. Esse trecho pode aparecer em dois contextos:

**Modo usuário** — geralmente um `span`, `textContent` ou `.innerText` que exibe o nome da escola. Exemplos de padrões incorretos:

```js
// ❌ padrões incorretos — podem incluir idSchool, name, ou combinações
span.textContent = matched.name || matched.idSchool;
span.textContent = `${matched.displayName} (${matched.idSchool})`;
nameEl.textContent = matched.name || matched.nome;
```

**Modo admin** — geralmente dentro de um bloco `if (isAdmin)` ou similar, pode definir o `.name` ou `.textContent` do chip de escola. Exemplos de padrões incorretos:

```js
// ❌ padrões incorretos
chipName.textContent = school.name + ' (' + school.idSchool + ')';
chipName.textContent = school.displayName + ' (' + school.idSchool + ')';
chipName.textContent = school.name || school.idSchool;
```

Em **todos** esses casos, substitua para exibir **somente** o `displayName`:

```js
// ✅ padrão correto — somente displayName, sem idSchool, sem parênteses
element.textContent = (school.displayName || school.name || school.nome || '').toString().trim();
```

⚠️ Aplique essa correção em todos os lugares do Script 2 onde o nome da escola é atribuído a um elemento visível (chip, span, label, etc.). Não altere atributos `value` de `<option>` — apenas o texto visível.

---

#### 3c — Opções do `<select>` de escola (modo admin)

No bloco admin do Script 2, localize o trecho que gera as `<option>` para o select de escola usando `.map()`. Exemplos de padrões incorretos:

```js
// ❌ padrões incorretos
schools.map(s => `<option value="${s.idSchool}">${s.name} (${s.idSchool})</option>`)
schools.map(s => `<option value="${s.idSchool}">${s.displayName} (${s.idSchool})</option>`)
schools.map(s => `<option value="${s.idSchool}">${s.displayName || s.name} (${s.idSchool})</option>`)
schools.map(s => `<option value="${s.idSchool}">${s.name || s.nome}</option>`)
```

Substitua para que o texto visível da opção seja **somente** o `displayName`:

```js
// ✅ padrão correto — somente displayName no texto da option; value continua sendo idSchool
schools.map(s => `<option value="${s.idSchool}">${(s.displayName || s.name || s.nome || '').toString().trim()}</option>`)
```

⚠️ O atributo `value` da `<option>` deve continuar sendo `s.idSchool` (ou equivalente). Apenas o **texto visível** entre as tags `<option>...</option>` muda.

---

### 4 — Verificar o `<head>` — snippets obrigatórios

Confirme que o `<head>` da página contém, nesta ordem:

```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="../icon.png" type="image/png">
<script src="../auth.firebase.js"></script>
<!-- se a página usar banco de dados: -->
<script src="../db.firebase.js"></script>
<script>
(function(){
  const saved = (localStorage.getItem('ui_theme_v1') || '').toLowerCase();
  const theme = (saved === 'dark' || saved === 'light') ? saved : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
</script>
<script src="../theme-colors.js"></script>
<link rel="stylesheet" href="../header.css">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
<title>Nome da Página</title>
<style>
  /* somente CSS específico desta página */
</style>
```

Ajuste os caminhos `../` conforme a profundidade da página.
Se a página não usar `db.firebase.js`, remova aquela linha.

---

### 5 — Verificar a ordem dos elementos em `.header-actions`

Dentro do `<header>`, localize o elemento `<div class="header-actions">` e confirme que seus filhos aparecem **exatamente** nesta ordem:

```
1. chip do usuário   → elemento com classe ctx-chip (chip de login)
2. chip da escola    → elemento com classe school-pill (ou ctx-chip de escola)
3. btn-back          → elemento com classe btn-back (somente se existir na página)
4. btn-home          → elemento com classe btn-home
5. theme-toggle      → elemento com classe theme-toggle ou theme-toggle-compact
```

Se algum elemento estiver fora dessa ordem, mova-o para a posição correta dentro de `.header-actions`.

⚠️ ATENÇÃO:
- Não altere nenhum atributo, conteúdo ou classe dos elementos — apenas reordene se necessário.
- O `theme-toggle` deve ser **sempre o último** elemento de `.header-actions`.
- O `btn-back` é opcional: páginas sem botão "Voltar" pulam direto para `btn-home → theme-toggle`.
- Pode haver variações de nome no `btn-back` (ex: `btn-back` com label "Ano Ativo", "Documentos", etc.) — o critério é a classe, não o texto do botão.

---

### 6 — Verificar variáveis CSS remanescentes no `<style>` local

Após remover os blocos de CSS do header (passo 1), o `<style>` local pode conter regras que referenciam variáveis que eram definidas localmente mas agora vêm do `header.css`. Confirme que as regras remanescentes usam **apenas variáveis fornecidas pelo `header.css`** — nunca variáveis que foram removidas.

**Variáveis seguras para usar no CSS local** (definidas pelo `header.css` + `theme-colors.js`):
- `var(--brand)`, `var(--brand-d)` — cor principal da marca
- `var(--brand-hover)`, `var(--brand-hover-d)` — hover da marca
- `var(--brand-faded)`, `var(--brand-faded-d)` — fundo suave da marca
- `var(--brand-border)`, `var(--brand-border-d)` — borda da marca
- `var(--brand-text)`, `var(--brand-text-d)` — texto sobre fundo suave da marca
- `var(--bg)` — fundo da página
- `var(--ink)` — cor principal do texto
- `var(--muted)` — texto secundário/discreto
- `var(--sub-color)` — subtítulos e labels de seção (ex: `// módulos`)
- `var(--line)` — linhas divisórias
- `var(--title-color)` — títulos principais
- `var(--chip-bg)`, `var(--chip-border)`, `var(--chip-name)` — chips genéricos
- `var(--dropdown-bg)` — fundo de dropdowns
- `var(--header-border)` — borda do header (útil para footers)

⚠️ ATENÇÃO — VARIÁVEIS ESPECÍFICAS DE PÁGINA:
Se a página usa variáveis customizadas como `--card-bg`, `--card-border`, `--pill-bg`, etc., que **não existem** no `header.css`, mantenha-as definidas nos blocos `:root` e `html[data-theme="dark"]` do `<style>` local. Defina **somente** essas variáveis exclusivas — não redefina as que já vêm do `header.css`.

⚠️ ATENÇÃO — LABELS DE SEÇÃO (ex: `// módulos`, `// turmas`):
Se a página tiver um elemento com papel de label de seção (geralmente com `letter-spacing`, `text-transform: uppercase`, `font-size` pequeno), use `color: var(--sub-color)` — nunca `var(--chip-color)` nem `var(--brand-text)`. A variável `--sub-color` é a única que replica corretamente o brilho em ambos os temas.

---

### 7 — Verificar o CSS do `<select>` de escola no tema escuro

O `<select>` do chip de escola (`.school-pill select`) e suas `<option>` devem ter cores corretas em **ambos os temas**. Como o CSS do `.school-pill select` foi removido no Passo 1 e agora vem do `header.css`, **não adicione regras para ele no `<style>` local** — ele já está coberto.

Porém, se a página continha regras inline ou locais que sobrescreviam as cores do select no dark mode (ex: `color: #000`, `background: #fff` fixos), **remova-as**, pois interferem com o `header.css`.

As cores corretas que o `header.css` já define são:
- **Tema claro** — texto escuro sobre fundo claro
- **Tema escuro** — texto branco (`color: #fff` ou `var(--ink)`) sobre fundo escuro (`background: var(--dropdown-bg)`)

Se, após importar o `header.css`, o select ainda exibir letras escuras sobre fundo escuro no dark mode, significa que a página tem uma regra local conflitante. Remova qualquer regra que force `color` ou `background` fixos no `.school-pill select` ou em `option` dentro do `<style>` local.

---

## O QUE NÃO FAZER

- Não altere o HTML do `<header>` (o bloco `<header class="app-header">...</header>`), exceto para reordenar elementos dentro de `.header-actions` conforme o passo 5
- Não altere o Script 1 (tema claro/escuro)
- Não altere o Script 3 (auth guard)
- Não altere nenhum CSS específico do body da página
- Não renomeie classes, IDs ou atributos
- Não mude a lógica de nenhum script além das linhas indicadas no passo 3

---

## ENTREGA ESPERADA

Retorne o arquivo HTML completo e revisado, com:
- O `<style>` local contendo apenas CSS da página
- O `<link rel="stylesheet" href="../header.css">` no lugar correto
- O Script 2 corrigido nos três pontos do Passo 3 (schoolName, texto do chip/span, texto das options)
- Os elementos de `.header-actions` na ordem correta
- Tudo mais intacto
