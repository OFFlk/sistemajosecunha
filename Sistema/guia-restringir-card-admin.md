# Guia — Restringir card a administradores (role ≠ admin)

Padrão para bloquear o acesso de usuários comuns a um `href` específico num hub de cards.
Para usuários com `role !== 'admin'`: o link é removido, o card recebe visual de desabilitado, cursor de bloqueio e exibe o tooltip **"Sem acesso"** ao passar o mouse.

---

## O que este guia cobre

1. Marcar o card no HTML com `id` e badge `Admin`
2. Adicionar o CSS do tooltip ao `<style>` da página (caso não venha do `base.css`)
3. Adicionar o script de restrição com leitura de `role` via `Auth.getSession()`
4. Adicionar o script do tooltip flutuante via `position:fixed`

> **Por que `position:fixed`?**
> Cards desabilitados têm `opacity < 1`. Elementos filhos herdam essa opacidade, tornando qualquer tooltip filho invisível. Com `position:fixed` o tooltip sai do stacking context do card e é renderizado no topo da página, sem herdar opacidade.

---

## Pré-requisitos

- A página já carrega `auth.firebase.js` (expõe `window.Auth`)
- A página já carrega `theme-colors.js` (expõe `window.ThemeColors`)
- O CSS global (`base.css` / `hub.css`) já define `.card.disabled` com `opacity` reduzida e `cursor: not-allowed`
- O `header-logic.js` (ou equivalente) já dispara o evento `auth:ready` após autenticação

---

## Passo 1 — Marcar o card no HTML

Adicione um `id` único ao card e o badge `Admin`. O `href` original deve ser mantido no HTML.

**Não adicione `data-tooltip` no HTML.** O atributo é inserido pelo script (Passo 3) somente quando o usuário não é admin — se estivesse no HTML, o tooltip apareceria também para o admin, que tem acesso livre ao card.

```html
<!-- ANTES -->
<a class="card" href="pagina-restrita.html">
  <div class="card-icon">🔒</div>
  <div class="card-title">Nome da página</div>
  <div class="card-footer">
    <div class="card-desc">Descrição breve.</div>
  </div>
</a>

<!-- DEPOIS -->
<a class="card" id="cardNomePagina" href="pagina-restrita.html">
  <span class="card-badge">Admin</span>
  <div class="card-icon">🔒</div>
  <div class="card-title">Nome da página</div>
  <div class="card-footer">
    <div class="card-desc">Descrição breve.</div>
  </div>
</a>
```

**Regras:**
- `id` deve ser único na página. Convenção sugerida: `card` + nome em camelCase da funcionalidade (ex: `cardGerirDados`, `cardRelatorios`).
- `card-badge` com texto `Admin` é visual — indica ao usuário que o card é exclusivo para administradores.
- `data-tooltip` **não entra aqui** — é responsabilidade exclusiva do script do Passo 3.

---

## Passo 2 — CSS do tooltip (se não estiver no `base.css`)

Se o `base.css` global já contém o bloco abaixo, **pule este passo**.
Caso contrário, cole dentro do `<style>` no `<head>` da página:

```css
/* tooltip para cards bloqueados — necessário para o JS de position:fixed funcionar */
.card[data-tooltip] {
  position: relative;
}
```

> Apenas `position: relative` é necessário aqui. Todo o visual do tooltip é criado e posicionado pelo script do Passo 4 via `position:fixed`.

---

## Passo 3 — Script de restrição por role

Cole este bloco **antes do `</body>`**, após o `header-logic.js`.
Substitua apenas os valores indicados.

```html
<script>
document.addEventListener('auth:ready', function () {
  var session = window.Auth && typeof Auth.getSession === 'function'
    ? Auth.getSession()
    : null;
  var role = session ? String(session.role || '').trim().toLowerCase() : '';

  // ── IDs dos cards restritos a admin ──────────────────────────────────
  // Substitua pelos ids definidos no Passo 1. Pode listar mais de um.
  ['cardNomePagina'].forEach(function (id) {
  // ─────────────────────────────────────────────────────────────────────
    var card = document.getElementById(id);
    if (!card) return;

    if (role !== 'admin') {
      card.removeAttribute('href');                        // remove o link
      card.classList.add('disabled');                      // cursor: not-allowed e opacidade vêm do CSS global
      card.setAttribute('data-tooltip', 'Sem acesso');     // ativa o tooltip só para não-admins
      card.title = 'Acesso restrito a administradores';
    }
  });

  // Chama initTooltipCards APÓS o bloqueio — o data-tooltip foi adicionado
  // dinamicamente, então o initCards() inicial (DOMContentLoaded) não o capturou
  if (typeof initTooltipCards === 'function') initTooltipCards();
});
</script>
```

**O que substituir:**
| Placeholder | O que colocar |
|---|---|
| `'cardNomePagina'` | O `id` exato definido no Passo 1 (ex: `'cardGerirDados'`). Para múltiplos cards: `['cardGerirDados', 'cardRelatorios']` |

**O que este script faz:**
- Lê `session.role` via `Auth.getSession()` — a mesma função usada pelo resto do sistema.
- Roda dentro de `auth:ready` para garantir que a sessão já foi carregada.
- Remove o `href` para que o card não seja navegável nem pelo teclado.
- Adiciona a classe `disabled` — o CSS global aplica `opacity` reduzida e `cursor: not-allowed`. **Não usar `style.pointerEvents = 'none'`**, pois isso bloqueia o `mouseenter` e impede o tooltip de funcionar.
- Chama `initTooltipCards()` (exposta pelo script do Passo 4) para registrar os listeners nos cards que acabaram de receber `data-tooltip`.

---

## Passo 4 — Script do tooltip flutuante

Cole este bloco logo **após** o script do Passo 3, também antes do `</body>`.
Este script é **idêntico para todas as páginas** — não há nada para substituir.

```html
<script>
(function () {
  var bubble = null;

  function getBrandColor() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var key     = (window.ThemeColors && window.ThemeColors.get) ? window.ThemeColors.get() : 'violet';
    var palette = (window.ThemeColors && window.ThemeColors.palettes && window.ThemeColors.palettes[key])
                  || { '--brand': '#7c3aed', '--brand-d': '#7c3aed' };
    var color = dark
      ? (palette['--brand-d'] || '#7c3aed')
      : (palette['--brand']   || '#7c3aed');
    return { color: color, dark: dark };
  }

  /* Atualiza só cor/texto — nunca toca opacity nem transform */
  function stylesBubble(b) {
    var bc = getBrandColor();
    b.style.background = bc.color;
    b.style.color      = bc.dark ? '#f0f0f8' : '#ffffff';
  }

  /* Define estrutura e layout completos — chamado só na criação */
  function initBubble(b) {
    b.style.cssText = [
      'position:fixed',
      'z-index:9999',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.15s ease, transform 0.15s ease',
      'transform:translateX(-50%) translateY(4px)',
      'font-size:12px',
      'font-family:inherit',
      'font-weight:700',
      'letter-spacing:0.04em',
      'text-transform:uppercase',
      'white-space:nowrap',
      'padding:5px 12px',
      'border-radius:6px',
    ].join(';');
    stylesBubble(b);
  }

  function ensureBubble() {
    if (bubble) return bubble;
    bubble = document.createElement('span');
    initBubble(bubble);
    document.body.appendChild(bubble);
    return bubble;
  }

  function positionBubble(card) {
    var rect = card.getBoundingClientRect();
    bubble.style.left      = (rect.left + rect.width / 2) + 'px';
    bubble.style.top       = (rect.top - 8) + 'px';
    bubble.style.transform = 'translateX(-50%) translateY(-100%)';
  }

  function showTooltip(e) {
    var card = e.currentTarget;
    var b    = ensureBubble();
    b.textContent = card.getAttribute('data-tooltip');
    stylesBubble(b);
    positionBubble(card);
    /* requestAnimationFrame garante que opacity:0 seja pintado antes de animar para 1 */
    requestAnimationFrame(function () {
      b.style.opacity   = '1';
      b.style.transform = 'translateX(-50%) translateY(-100%)';
    });
  }

  function hideTooltip() {
    if (bubble) bubble.style.opacity = '0';
  }

  /* Exposta globalmente para ser chamada pelo script do Passo 3 após o bloqueio dinâmico.
     A flag _tooltipBound evita registrar listeners duplicados. */
  window.initTooltipCards = function () {
    document.querySelectorAll('.card[data-tooltip]').forEach(function (card) {
      if (card._tooltipBound) return;
      card._tooltipBound = true;
      card.addEventListener('mouseenter', showTooltip);
      card.addEventListener('mouseleave', hideTooltip);
    });
  };

  /* Reaplica cor se o tooltip estiver visível quando tema/paleta mudar */
  function onThemeChange() {
    if (bubble && bubble.style.opacity === '1') stylesBubble(bubble);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initTooltipCards);
  } else {
    window.initTooltipCards();
  }

  new MutationObserver(onThemeChange)
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('colorchange', onThemeChange);
})();
</script>
```

---

## Exemplo completo aplicado

O `ano-ativo.html` com o card `cardGerir` restrito a admin — referência real do sistema.

**No HTML do card** (Passo 1):
```html
<a class="card" id="cardGerir" href="gerir-dados-ano-ativo.html">
  <span class="card-badge">Admin</span>
  <div class="card-icon">🗄️</div>
  <div class="card-title">Gestão de dados</div>
  <div class="card-footer">
    <div class="card-desc">Importe, exporte, migre e gerencie os dados do módulo de ano ativo.</div>
  </div>
</a>
```

**Script de restrição** (Passo 3):
```html
<script>
document.addEventListener('auth:ready', function () {
  var session = window.Auth && typeof Auth.getSession === 'function'
    ? Auth.getSession()
    : null;
  var role = session ? String(session.role || '').trim().toLowerCase() : '';

  ['cardGerir'].forEach(function (id) {
    var card = document.getElementById(id);
    if (!card) return;
    if (role !== 'admin') {
      card.removeAttribute('href');
      card.classList.add('disabled');
      card.setAttribute('data-tooltip', 'Sem acesso');
      card.title = 'Acesso restrito a administradores';
    }
  });

  if (typeof initTooltipCards === 'function') initTooltipCards();
});
</script>
```

Seguido do script do tooltip do Passo 4 sem alterações.

---

## Checklist de aplicação

- [ ] Card tem `id` único definido
- [ ] Card tem `href` original mantido no HTML
- [ ] Card tem `card-badge` com texto `Admin`
- [ ] `data-tooltip="Sem acesso"` **não** está no HTML — é adicionado pelo script do Passo 3
- [ ] CSS do Passo 2 presente (no `base.css` global ou no `<style>` da página)
- [ ] Script do Passo 3 presente, com o `id` correto no array, **sem** `pointerEvents: none`
- [ ] Script do Passo 3 chama `initTooltipCards()` ao final
- [ ] Script do Passo 4 presente, sem modificações
- [ ] Os dois scripts estão **após** o `header-logic.js` (ou equivalente que dispara `auth:ready`)
