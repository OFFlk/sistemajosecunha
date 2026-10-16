# Guia de Restrições de Acesso (RBAC)
> Sistema escolar · roles: `ADMIN` e `USER`

---

## A variável padrão de permissão

Toda página com restrição parcial deve declarar isso **uma vez, no topo do script principal**, antes de qualquer renderização:

```js
/* ========================= */
/* Permissões               */
/* ========================= */
const _session = (window.Auth && typeof Auth.getSession === 'function')
  ? Auth.getSession()
  : null;
const _podeEditar = !!_session && _session.role === 'admin';
```

> Padrão já usado em `pesquisa-ano-ativoOLD.html`. Mantenha como referência para todas as páginas novas.

---

## Padrão 1 — Bloquear a página inteira

**Usado em:** `admin.html`, `cadastro_admin.html`, `schema_ata.html`…

No `<head>`, logo após carregar o `auth.firebase.js`:

```html
<!-- página exclusiva de ADMIN -->
<script>window.Auth && Auth.requireRole('admin');</script>

<!-- qualquer usuário logado -->
<script>window.Auth && Auth.requireAuth();</script>
```

USER que tentar acessar é redirecionado automaticamente pelo `auth.js`.

---

## Padrão 2 — Ocultar elemento gerado em JS

**Usado em:** `pesquisa-ano-ativo.html` — botão ✏️ Editar

Quando o elemento é montado via `innerHTML` dinâmico, usa o ternário com `_podeEditar`:

```js
// dentro do template literal do card de aluno
${_podeEditar
  ? `<button class="btn-edit" type="button"
      data-edit-aluno="${a.alunoId}"
      data-edit-turma="${a.turmaId||''}"
      data-edit-ano="${anoSelecionadoOuAtivo()}"
      title="Editar dados do aluno">✏️ Editar</button>`
  : `<div style="visibility:hidden;pointer-events:none;
      display:inline-flex;padding:6px 12px;font-size:12px;"
      aria-hidden="true">✏️ Editar</div>`
}
```

> O `div` invisível no `else` preserva o espaço do layout — o alinhamento dos checkboxes não quebra quando o botão some.

---

## Padrão 3 — Ocultar elemento estático no HTML

**Usado em:** `admin.html` — card Backup

Quando o elemento já existe no HTML (não é gerado por JS), oculta via script:

```js
// para um elemento específico
if (!_podeEditar) {
  const el = document.getElementById('cardBackup');
  if (el) el.style.display = 'none';
}

// ou para múltiplos elementos, use um atributo marcador
if (!_podeEditar) {
  document.querySelectorAll('[data-admin-only]')
    .forEach(el => el.style.display = 'none');
}
```

---

## Checklist por página nova

- [ ] **Head tem proteção?** — exclusiva de ADMIN → `requireRole('admin')` · só logados → `requireAuth()`
- [ ] **Script tem `_podeEditar`?** — declarar `_session` e `_podeEditar` no topo se houver qualquer elemento condicional
- [ ] **Elementos dinâmicos usam ternário?** — todo botão de editar/excluir gerado em JS deve ter `${_podeEditar ? '...' : ''}`
- [ ] **Elementos estáticos têm `data-admin-only`?** — marcados com o atributo e ocultados pelo padrão 3
- [ ] **Firestore Rules protegem a escrita?** — ocultar no front não impede chamada pelo console; a regra no Firestore é a proteção real

---

## Quando usar cada padrão

| Padrão | Quando usar | Exemplo |
|--------|-------------|---------|
| **1** | Página que USER nunca deve ver | `admin.html`, `cadastro_admin.html` |
| **2** | Botão/ação em página compartilhada, gerado por JS | `btn-edit` na pesquisa |
| **3** | Card ou botão já no HTML que só ADMIN deve ver | card Backup no `admin.html` |
| **1 + 3** | Protege a rota E oculta elementos internos | qualquer página admin com sub-elementos |
