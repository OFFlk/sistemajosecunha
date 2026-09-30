# Guia de padronização — Toasts e modal de confirmação

> Baseado na implementação em `cadastro-aluno-ativo.html`. Use este guia pra levar o mesmo padrão pras outras páginas/módulos do sistema.

## 1. As 4 cores (e só essas 4)

| Situação | Cor | Função | `kind` no `setMsg` |
|---|---|---|---|
| Sucesso / salvo | 🟢 Verde | `_toastSucesso(msg)` | `"ok"` |
| Aviso / cancelar | 🟡 Amarelo | `_toastAviso(msg)` | `"warn"` |
| Carregando | 🔵 Azul | `_toastCarregando(msg)` | `"loading"` |
| Erro | 🔴 Vermelho | `_toastErro(msg)` | `"err"` |

**Regra**: se aparecer uma situação que não se encaixa claramente em nenhuma dessas 4, não escolha uma cor sozinho — me pergunta antes. Enquanto isso, o `setMsg` já cai num padrão seguro (amarelo + aviso no console), nunca vermelho por padrão — vermelho passa a mensagem errada quando não é de fato um erro.

## 2. Bloco de código pra colar em cada página

Cole isso dentro do `<script>` principal da página (uma vez só por página). Não depende de nada externo além do CSS da seção 3.

```javascript
// ── Toasts padronizados (ver guia-toasts.md) ──────────────────────────
function _showToast(msg, bg, shadow, duration){
  const existing = document.getElementById('_toastGlobal');
  if(existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = '_toastGlobal';
  toast.style.cssText =
    `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);`+
    `display:flex;align-items:center;gap:12px;`+
    `background:${bg};color:#fff;font-family:'Nunito',sans-serif;`+
    `font-size:14px;font-weight:800;padding:12px 16px 12px 20px;border-radius:12px;`+
    `box-shadow:0 4px 24px ${shadow||'rgba(0,0,0,0.25)'};z-index:9999;`+
    `animation:toastSubir .25s ease;max-width:min(90vw,480px);text-align:left;`;
  const span = document.createElement('span');
  span.textContent = msg;
  span.style.cssText = 'flex:1;line-height:1.4;';
  toast.appendChild(span);
  const btnClose = document.createElement('button');
  btnClose.type = 'button';
  btnClose.textContent = '✕';
  btnClose.setAttribute('aria-label','Fechar aviso');
  btnClose.style.cssText =
    'background:rgba(255,255,255,0.15);border:none;color:#fff;'+
    'width:22px;height:22px;border-radius:6px;cursor:pointer;'+
    'font-size:12px;font-weight:800;line-height:1;flex:0 0 auto;';
  btnClose.onclick = () => toast.remove();
  toast.appendChild(btnClose);
  document.body.appendChild(toast);
  setTimeout(() => { if(toast.isConnected) toast.remove(); }, duration || 2500);
}

function _toastSucesso(msg){
  _showToast(msg, '#166534', 'rgba(22,163,74,0.95)', 2500);
}
function _toastErro(msg){
  _showToast(msg, '#991b1b', 'rgba(185,28,28,0.95)', 4500);
}
function _toastAviso(msg){
  _showToast(msg, '#92400e', 'rgba(217,119,6,0.95)', 4000);
}
function _toastCarregando(msg){
  _showToast(msg, '#1e3a8a', 'rgba(37,99,235,0.95)', 8000);
}

// Ponto de entrada único — prefira chamar setMsg(texto, kind) em vez de
// chamar _toastX diretamente, assim fica padronizado por página.
function setMsg(text, kind){
  const t = (text||"").toString();
  if(!t) return;
  if(kind === "err") _toastErro('⚠️ ' + t);
  else if(kind === "ok") _toastSucesso('✅ ' + t);
  else if(kind === "warn") _toastAviso('⚠️ ' + t);
  else if(kind === "loading") _toastCarregando('⏳ ' + t);
  else {
    console.warn('[toast] kind desconhecido:', JSON.stringify(kind), '— usando "aviso" (amarelo) como padrão seguro.');
    _toastAviso(t);
  }
}

// ── Modal de confirmação (substitui confirm() nativo) ─────────────────
function _escHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function _confirmModal({ titulo, corpo, corDestaque, textoConfirmar, textoCancelar }){
  return new Promise((resolve) => {
    const cor = corDestaque || '#b45309'; // amber-700 — padrão pra avisos
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'flex';
    backdrop.innerHTML =
      `<div style="background:var(--card-bg,#fff);border-radius:14px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.25);">`+
        `<h3 style="margin:0 0 6px;font-size:16px;font-weight:800;color:${cor};">${_escHtml(titulo || 'Confirmar ação')}</h3>`+
        `<p style="margin:0 0 18px;font-size:13px;color:var(--muted);white-space:pre-line;line-height:1.5;">${corpo || ''}</p>`+
        `<div style="display:flex;justify-content:flex-end;gap:8px;">`+
          `<button type="button" class="btn ghost" id="_confirmModalCancelar">${_escHtml(textoCancelar || 'Cancelar')}</button>`+
          `<button type="button" id="_confirmModalOk" style="padding:9px 16px;border-radius:8px;font-size:13px;font-weight:800;`+
            `background:${cor};border:1px solid ${cor};color:#fff;cursor:pointer;font-family:'Nunito',sans-serif;">`+
            `${_escHtml(textoConfirmar || 'Continuar')}`+
          `</button>`+
        `</div>`+
      `</div>`;
    document.body.appendChild(backdrop);

    function fechar(resultado){
      backdrop.remove();
      resolve(resultado);
    }
    backdrop.querySelector('#_confirmModalOk').addEventListener('click', () => fechar(true));
    backdrop.querySelector('#_confirmModalCancelar').addEventListener('click', () => fechar(false));
    backdrop.addEventListener('click', (ev) => { if(ev.target === backdrop) fechar(false); });
  });
}
```

⚠️ Se a página já tiver um `setMsg` (a maioria tem, de formas diferentes), **não cole por cima sem olhar** — funde a lógica: mantenha as validações específicas da página, só troque o roteamento de cor final pra usar `_toastSucesso`/`_toastErro`/`_toastAviso`/`_toastCarregando`.

## 3. CSS necessário

A maioria das páginas provavelmente já tem isso (é o padrão visual do sistema todo), mas confirme que existem antes de colar o JS acima:

```css
@keyframes toastSubir {
  from { opacity: 0; transform: translateX(-50%) translateY(16px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.modal-backdrop {
  position: fixed; inset: 0; background: rgba(15,23,42,.55);
  display: none; align-items: center; justify-content: center;
  padding: 18px; z-index: 50;
}

.btn {
  border: 1px solid var(--border); background: var(--card); color: var(--text);
  padding: 9px 14px; border-radius: 10px; font-weight: 700; font-size: 14px;
  text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
  cursor: pointer; font-family: 'Nunito', sans-serif; white-space: nowrap;
  transition: background 0.18s, border-color 0.18s, transform 0.06s;
}
.btn.ghost, .btn.secondary {
  background: var(--chip-bg); border-color: var(--chip-border); color: var(--chip-color);
}
```

Se a página não tiver as variáveis `--card-bg`, `--muted`, `--chip-bg`, etc., os `var(--x, fallback)` no código já têm um fallback embutido — não quebra, só perde a adaptação ao tema claro/escuro daquela página específica.

## 4. Como usar no dia a dia

```javascript
// Erro de validação
setMsg("Informe o CPF.", "err");

// Sucesso
setMsg("Aluno cadastrado com sucesso!", "ok");

// Aviso / cancelamento
setMsg("Operação cancelada.", "warn");

// Carregando (mostrar antes de um await, o próximo setMsg substitui automaticamente)
setMsg("Salvando…", "loading");
await window.DB.algumaColecao.save(dados);
setMsg("Salvo!", "ok");

// Confirmação (substitui confirm() nativo) — sempre dentro de função async
const confirmou = await _confirmModal({
  titulo: "⚠️ Tem certeza?",
  corpo: "Essa ação não pode ser desfeita.\n\nDeseja continuar?",
  textoConfirmar: "Sim, continuar",
});
if(!confirmou) return;
```

## 5. Checklist pra migrar uma página existente

1. Procure por `alert(`, `confirm(` nativos → decida se cada um vira toast (`setMsg`) ou modal (`_confirmModal`). Regra prática: **confirmação de ação** (usuário precisa decidir sim/não) → `_confirmModal`; **mensagem informativa** (não precisa de decisão) → `setMsg`.
2. Procure por toasts/mensagens já existentes na página (`console.log`/`alert`/spans de status/cores hardcoded tipo `background:red` etc.) e mapeie cada um pra um dos 4 `kind`.
3. Preste atenção especial em mensagens de **"salvando..."/"carregando..."/"enviando..."** — são as que mais aparecem coladas em vermelho ou verde por engano (era exatamente o bug que corrigimos no cadastro).
4. Depois de migrar, teste pelo menos um caso de cada cor na página (sucesso, erro, aviso, carregando) antes de dar como concluído.
5. Se a página tiver uma situação que não é claramente nenhuma das 4 (ex.: "informação neutra" tipo "nenhum resultado encontrado" — isso é erro? aviso?), não decida sozinho — me chama que a gente define juntos e atualiza este guia.
