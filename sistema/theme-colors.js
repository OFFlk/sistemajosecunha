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
      '--brand-d':        '#ec4899',
      '--brand-hover-d':  '#be185d',
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
      '--brand-d':        '#ef4444',
      '--brand-hover-d':  '#b91c1c',
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
      '--brand-d':        '#f59e0b',
      '--brand-hover-d':  '#b45309',
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
      '--brand-d':        '#eab308',
      '--brand-hover-d':  '#a16207',
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
      '--brand-d':        '#22c55e',
      '--brand-hover-d':  '#166534',
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
      '--brand-d':        '#14b8a6',
      '--brand-hover-d':  '#0f766e',
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
      '--brand-d':        '#06b6d4',
      '--brand-hover-d':  '#155e75',
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
      '--brand-d':        '#4f52e8',
      '--brand-hover-d':  '#120a8f',
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
      '--brand-d':        '#3b82f6',
      '--brand-hover-d':  '#1e3a5f',
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
      '--brand-d':        '#6b7280',
      '--brand-hover-d':  '#374151',
      '--brand-faded-d':  'rgba(55,65,81,0.28)',
      '--brand-border-d': '#6b7280',
      '--brand-text-d':   '#d1d5db',
    },
    contrast: {
      label: 'Alto Contraste',
      '--brand':        '#ffd60a',
      '--brand-hover':  '#ffc300',
      '--brand-faded':  '#000000',
      '--brand-border': '#ffd60a',
      '--brand-text':   '#ffd60a',
      '--brand-d':        '#ffd60a',
      '--brand-hover-d':  '#ffc300',
      '--brand-faded-d':  '#000000',
      '--brand-border-d': '#ffd60a',
      '--brand-text-d':   '#ffd60a',
      // Alto contraste também precisa trocar fundo/texto — as outras
      // paletas não mexem nisso (só acento), por isso ficam num bloco à parte.
      extra: {
        '--bg':            '#000000',
        '--ink':           '#ffffff',
        '--muted':         '#e5e5e5',
        '--line':          '#ffd60a',
        '--card':          '#000000',
        '--header-bg':     '#000000',
        '--header-border': '#ffd60a',
        '--field-bg':      '#000000',
        '--field-border':  '#ffd60a',
        '--danger':        '#ff453a',
        '--glow':          'none',
      },
    },
  };

  // Variáveis que só o modo alto contraste (ou uma paleta futura assim) usa.
  // Precisam ser limpas a cada troca de paleta, senão "vazam" pras cores normais.
  const EXTRA_KEYS = [
    '--bg', '--ink', '--muted', '--line', '--card',
    '--header-bg', '--header-border', '--field-bg', '--field-border', '--danger', '--glow',
  ];

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

    // Limpa sempre primeiro — se a paleta anterior era alto contraste e a
    // nova não usa 'extra', as páginas voltam a herdar bg/ink normais.
    EXTRA_KEYS.forEach(function (k) { root.style.removeProperty(k); });
    if (palette.extra) {
      Object.keys(palette.extra).forEach(function (k) {
        root.style.setProperty(k, palette.extra[k]);
      });
    }

    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
    document.dispatchEvent(new CustomEvent('colorchange', { detail: { key, palette } }));
  }

  function get() {
    try { return localStorage.getItem(STORAGE_KEY) || 'violet'; } catch { return 'violet'; }
  }

  apply(get());

  new MutationObserver(function () { apply(get()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.ThemeColors = { apply, get, palettes };
})();
