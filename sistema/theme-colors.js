/**
 * theme-colors.js — Sistema de cores do usuário
 * Deve ser carregado ANTES de qualquer CSS de cor, logo após o script de tema.
 *
 * Expõe window.ThemeColors com:
 *   ThemeColors.apply(key)   — aplica uma paleta imediatamente
 *   ThemeColors.get()        — retorna a chave atual
 *   ThemeColors.palettes     — objeto com todas as paletas
 *
 * Uso no <head> de cada página (após o script de tema):
 *   <script src="/theme-colors.js"></script>
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'ui_color_v1';

  const palettes = {
    violet: {
      label: 'Violeta',
      '--brand':        '#7c3aed',
      '--brand-hover':  '#6d28d9',
      '--brand-faded':  '#f5f3ff',
      '--brand-border': '#ddd6fe',
      '--brand-text':   '#6d28d9',
      '--brand-d':        '#7c3aed',
      '--brand-hover-d':  '#6d28d9',
      '--brand-faded-d':  'rgba(124,58,237,0.28)',
      '--brand-border-d': '#7c3aed',
      '--brand-text-d':   '#c4b5fd',
    },
    rose: {
      label: 'Rosa',
      '--brand':        '#be185d',
      '--brand-hover':  '#9d174d',
      '--brand-faded':  '#fdf2f8',
      '--brand-border': '#fbcfe8',
      '--brand-text':   '#9d174d',
      '--brand-d':        '#be185d',
      '--brand-hover-d':  '#9d174d',
      '--brand-faded-d':  'rgba(190,24,93,0.28)',
      '--brand-border-d': '#ec4899',
      '--brand-text-d':   '#f9a8d4',
    },
    wine: {
      label: 'Vermelho',
      '--brand':        '#b91c1c',
      '--brand-hover':  '#991b1b',
      '--brand-faded':  '#fff1f2',
      '--brand-border': '#fecaca',
      '--brand-text':   '#b91c1c',
      '--brand-d':        '#b91c1c',
      '--brand-hover-d':  '#991b1b',
      '--brand-faded-d':  'rgba(185,28,28,0.28)',
      '--brand-border-d': '#ef4444',
      '--brand-text-d':   '#fca5a5',
    },
    amber: {
      label: 'Laranja',
      '--brand':        '#b45309',
      '--brand-hover':  '#92400e',
      '--brand-faded':  '#fffbeb',
      '--brand-border': '#fde68a',
      '--brand-text':   '#92400e',
      '--brand-d':        '#b45309',
      '--brand-hover-d':  '#92400e',
      '--brand-faded-d':  'rgba(180,83,9,0.28)',
      '--brand-border-d': '#f59e0b',
      '--brand-text-d':   '#fcd34d',
    },
    gold: {
      label: 'Amarelo',
      '--brand':        '#a16207',
      '--brand-hover':  '#854d0e',
      '--brand-faded':  '#fefce8',
      '--brand-border': '#fef08a',
      '--brand-text':   '#713f12',
      '--brand-d':        '#a16207',
      '--brand-hover-d':  '#854d0e',
      '--brand-faded-d':  'rgba(161,98,7,0.28)',
      '--brand-border-d': '#eab308',
      '--brand-text-d':   '#fde047',
    },
    forest: {
      label: 'Verde',
      '--brand':        '#166534',
      '--brand-hover':  '#14532d',
      '--brand-faded':  '#f0fdf4',
      '--brand-border': '#bbf7d0',
      '--brand-text':   '#166534',
      '--brand-d':        '#166534',
      '--brand-hover-d':  '#14532d',
      '--brand-faded-d':  'rgba(22,101,52,0.28)',
      '--brand-border-d': '#22c55e',
      '--brand-text-d':   '#86efac',
    },
    teal: {
      label: 'Turquesa',
      '--brand':        '#0f766e',
      '--brand-hover':  '#0d6560',
      '--brand-faded':  '#f0fdfa',
      '--brand-border': '#99f6e4',
      '--brand-text':   '#0f766e',
      '--brand-d':        '#0f766e',
      '--brand-hover-d':  '#0d6560',
      '--brand-faded-d':  'rgba(15,118,110,0.28)',
      '--brand-border-d': '#14b8a6',
      '--brand-text-d':   '#5eead4',
    },
    cyan: {
      label: 'Ciano',
      '--brand':        '#155e75',
      '--brand-hover':  '#0e4f63',
      '--brand-faded':  '#ecfeff',
      '--brand-border': '#a5f3fc',
      '--brand-text':   '#155e75',
      '--brand-d':        '#155e75',
      '--brand-hover-d':  '#0e4f63',
      '--brand-faded-d':  'rgba(21,94,117,0.28)',
      '--brand-border-d': '#06b6d4',
      '--brand-text-d':   '#67e8f9',
    },
    navy: {
      label: 'Azul',
      '--brand':        '#120a8f',
      '--brand-hover':  '#0d0770',
      '--brand-faded':  '#eff0ff',
      '--brand-border': '#c4c6fd',
      '--brand-text':   '#120a8f',
      '--brand-d':        '#120a8f',
      '--brand-hover-d':  '#0d0770',
      '--brand-faded-d':  'rgba(18,10,143,0.28)',
      '--brand-border-d': '#4f52e8',
      '--brand-text-d':   '#a5b4fc',
    },
    deepblue: {
      label: 'Azul Escuro',
      '--brand':        '#1e3a5f',
      '--brand-hover':  '#172d4a',
      '--brand-faded':  '#f0f6fc',
      '--brand-border': '#b8d4ec',
      '--brand-text':   '#1e3a5f',
      '--brand-d':        '#1e3a5f',
      '--brand-hover-d':  '#172d4a',
      '--brand-faded-d':  'rgba(30,58,95,0.28)',
      '--brand-border-d': '#3b82f6',
      '--brand-text-d':   '#7aafd4',
    },
    slate: {
      label: 'Cinza',
      '--brand':        '#374151',
      '--brand-hover':  '#1f2937',
      '--brand-faded':  '#f9fafb',
      '--brand-border': '#e5e7eb',
      '--brand-text':   '#374151',
      '--brand-d':        '#374151',
      '--brand-hover-d':  '#1f2937',
      '--brand-faded-d':  'rgba(55,65,81,0.28)',
      '--brand-border-d': '#6b7280',
      '--brand-text-d':   '#d1d5db',
    },
    white: {
      label: 'Branco',
      '--brand':        '#ffffff',
      '--brand-hover':  '#f0f0f0',
      '--brand-faded':  '#fafafa',
      '--brand-border': '#d4d4d4',
      '--brand-text':   '#525252',
      '--brand-d':        '#ffffff',
      '--brand-hover-d':  '#f0f0f0',
      '--brand-faded-d':  'rgba(255,255,255,0.12)',
      '--brand-border-d': '#a3a3a3',
      '--brand-text-d':   '#ffffff',
    },
  };

  // ── Contraste de "card de destaque" (antes duplicado em 3 páginas do
  // módulo de atas: gestao-atas.html, pesquisa-ata.html, historico-aluno.html)
  //
  // Um card de destaque usa a cor de marca (--brand / --btn-home-bg) como
  // background. Só a luminância real dessa cor diz se o texto deve ser claro
  // ou escuro — não dá pra decidir pela paleta escolhida sozinha, porque o
  // mesmo nome de paleta pode render tons bem diferentes entre os temas claro
  // e escuro. calcularLuminancia() faz a conta padrão (WCAG, sRGB relative
  // luminance); ajustarContraste() lê o background computado do elemento,
  // calcula, e alterna a classe CSS "contraste-claro" (cada página already
  // define o CSS de ".card-destaque.contraste-claro" — isso não muda, só a
  // função que decide QUANDO aplicar a classe é que sai da página).
  function calcularLuminancia(corCss) {
    const m = String(corCss || '').match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return null;
    const [r, g, b] = m.map(Number);
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function ajustarContraste(seletor) {
    seletor = seletor || '.card-destaque';
    document.querySelectorAll(seletor).forEach((el) => {
      const luminancia = calcularLuminancia(getComputedStyle(el).backgroundColor);
      if (luminancia === null) return;
      el.classList.toggle('contraste-claro', luminancia > 0.5);
    });
  }

  // Cada página ainda precisa chamar ThemeColors.ajustarContraste() UMA VEZ
  // depois que o próprio card existir no DOM (o script deste arquivo roda no
  // <head>, antes do <body> — não dá pra centralizar essa primeira chamada
  // aqui). O que dá pra centralizar é o reajuste automático quando a pessoa
  // troca de cor sem recarregar a página — por isso o listener abaixo já
  // cobre as 3 páginas sem cada uma precisar registrar o próprio listener.
  // Se a página não tiver nenhum ".card-destaque", o querySelectorAll acima
  // só devolve uma lista vazia — sem custo, sem erro.
  document.addEventListener('colorchange', () => ajustarContraste());

  function apply(key) {
    const palette = palettes[key] || palettes['violet'];
    const root    = document.documentElement;

    root.style.setProperty('--brand',        palette['--brand']);
    root.style.setProperty('--brand-hover',  palette['--brand-hover']);
    root.style.setProperty('--brand-faded',  palette['--brand-faded']);
    root.style.setProperty('--brand-border', palette['--brand-border']);
    root.style.setProperty('--brand-text',   palette['--brand-text']);
    root.style.setProperty('--brand-d',        palette['--brand-d']);
    root.style.setProperty('--brand-hover-d',  palette['--brand-hover-d']);
    root.style.setProperty('--brand-faded-d',  palette['--brand-faded-d']);
    root.style.setProperty('--brand-border-d', palette['--brand-border-d']);
    root.style.setProperty('--brand-text-d',   palette['--brand-text-d']);

    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
    document.dispatchEvent(new CustomEvent('colorchange', { detail: { key, palette } }));
  }

  function get() {
    try { return localStorage.getItem(STORAGE_KEY) || 'violet'; } catch { return 'violet'; }
  }

  apply(get());

  new MutationObserver(function () { apply(get()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.ThemeColors = { apply, get, palettes, ajustarContraste, calcularLuminancia };
})();
