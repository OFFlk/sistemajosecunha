/**
 * loading-overlay.js — Tela de carregamento reutilizável
 *
 * Uso:
 *   <script src="../loading-overlay.js"></script>
 *
 *   // Mostrar (automático ao carregar a página)
 *   Loading.mostrar('Buscando turmas...');
 *
 *   // Esconder (quando os dados estiverem prontos)
 *   Loading.esconder();
 *
 * A overlay é criada automaticamente ao carregar o script.
 * A logo é buscada em /icon.png (raiz do projeto).
 */
(function () {
  'use strict';

  /* ─── CSS ─── */
  const STYLE = `
    #_loadingOverlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0;
      background: var(--bg, #f3f0ff);
      transition: opacity 0.35s ease;
    }

    #_loadingOverlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    /* Logo */
    #_loadingOverlay ._lo-logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      margin-bottom: 10px;
      opacity: 0.9;
    }

    /* Nome do sistema */
    #_loadingOverlay ._lo-nome {
      font-size: 15px;
      font-weight: 700;
      color: var(--text, #1e1b4b);
      letter-spacing: 0.01em;
      margin-bottom: 36px;
      opacity: 0.75;
    }

    /* Spinner com gradiente cônico */
    #_loadingOverlay ._lo-spinner {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: conic-gradient(
        from 0deg,
        transparent 0%,
        transparent 30%,
        #6d28d9 60%,
        #4f46e5 80%,
        #818cf8 100%
      );
      animation: _loSpin 0.9s linear infinite;
      position: relative;
      margin-bottom: 20px;
    }

    /* Buraco central do spinner */
    #_loadingOverlay ._lo-spinner::after {
      content: '';
      position: absolute;
      inset: 7px;
      border-radius: 50%;
      background: var(--bg, #f3f0ff);
    }

    /* Texto */
    #_loadingOverlay ._lo-texto {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary, #6d28d9);
      opacity: 0.8;
      letter-spacing: 0.01em;
    }

    @keyframes _loSpin {
      to { transform: rotate(360deg); }
    }

    /* Dark mode */
    [data-theme="dark"] #_loadingOverlay {
      background: var(--bg, #0f0e17);
    }
    [data-theme="dark"] #_loadingOverlay ._lo-spinner::after {
      background: var(--bg, #0f0e17);
    }
    [data-theme="dark"] #_loadingOverlay ._lo-nome {
      color: var(--text, #e0e7ff);
    }
  `;

  /* ─── HTML ─── */
  function criarOverlay() {
    // Injeta CSS
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    // Cria overlay
    const overlay = document.createElement('div');
    overlay.id = '_loadingOverlay';
    overlay.innerHTML = `
      <img class="_lo-logo" src="/icon.png" alt="Logo" onerror="this.style.display='none'">
      <div class="_lo-nome">Sistema Escolar</div>
      <div class="_lo-spinner"></div>
      <div class="_lo-texto" id="_loadingTexto">Carregando dados…</div>
    `;

    // Insere no início do body (ou cria body se ainda não existe)
    if (document.body) {
      document.body.insertBefore(overlay, document.body.firstChild);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.insertBefore(overlay, document.body.firstChild);
      });
    }

    return overlay;
  }

  const overlay = criarOverlay();

  /* ─── API pública ─── */
  window.Loading = {
    /**
     * Mostra a tela de loading.
     * @param {string} texto — mensagem exibida (opcional)
     */
    mostrar(texto) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'flex';
      if (texto) {
        const el = document.getElementById('_loadingTexto');
        if (el) el.textContent = texto;
      }
    },

    /**
     * Esconde a tela de loading com fade suave.
     */
    esconder() {
      overlay.classList.add('hidden');
      setTimeout(() => { overlay.style.display = 'none'; }, 380);
    },

    /**
     * Atualiza só o texto sem mostrar/esconder.
     * @param {string} texto
     */
    texto(texto) {
      const el = document.getElementById('_loadingTexto');
      if (el) el.textContent = texto;
    },
  };

})();
