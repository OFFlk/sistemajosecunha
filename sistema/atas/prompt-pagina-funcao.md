# PROMPT PÁGINA-FUNÇÃO — Sistema de gestão escolar
# Use este prompt em conjunto com o prompt-padronizacao.md.
# Aplique APÓS concluir todos os passos do prompt-padronizacao.md.
# Cole o conteúdo do arquivo HTML da página junto com este prompt.

---

Você vai aplicar a padronização visual de **inputs, botões e cards** em uma página de função (formulário, cadastro, pesquisa, etc.) de um sistema de gestão escolar.
Siga as instruções abaixo com atenção — não altere nada além do que está indicado.

---

## CONTEXTO — Como funciona o sistema de cores

A página já possui um script (`theme-colors.js`) que define variáveis CSS dinâmicas com base na cor escolhida pelo usuário nas configurações. As variáveis disponíveis são:

**Tema claro:**
- `var(--brand)` — cor principal (ex: roxo, verde, vermelho…)
- `var(--brand-d)` — variante dark da cor principal
- `var(--brand-hover)` — hover da cor principal
- `var(--brand-hover-d)` — hover dark
- `var(--brand-faded)` — fundo suave (baixa opacidade)
- `var(--brand-faded-d)` — fundo suave dark
- `var(--brand-border)` — borda da cor
- `var(--brand-border-d)` — borda dark
- `var(--brand-text)` — texto sobre fundo suave
- `var(--brand-text-d)` — texto dark

Essas variáveis já são usadas nos botões do header. O objetivo aqui é estender o mesmo sistema para o **corpo da página**.

---

## PASSO A — Bordas dos inputs e selects

### A.1 — Localizar as variáveis de borda de campos no `<style>` local

Procure no bloco `:root` do `<style>` as variáveis que definem a borda dos inputs/selects. Elas podem ter nomes como:
- `--field-border`
- `--border`
- `--input-border`
- `--line`
- ou borda definida diretamente em `input, select { border: ... }`

### A.2 — Substituir pelos valores dinâmicos do tema

No bloco `:root`, altere a variável de borda dos campos para herdar do sistema de cores:

```css
:root {
  --field-border: var(--brand-border, #ddd6fe);
  /* mantenha os demais valores intactos */
}
```

No bloco `html[data-theme="dark"]`, altere para:

```css
html[data-theme="dark"] {
  --field-border: var(--brand-border-d, #7c3aed);
  /* mantenha os demais valores intactos */
}
```

⚠️ Se a variável de borda do campo já for `var(--brand-border, ...)` e `var(--brand-border-d, ...)`, pule este passo — já está correto.

⚠️ Se a borda estiver definida diretamente na regra `input, select { border: 1px solid #xxx }` (sem usar variável), substitua o valor fixo por `var(--field-border)` e defina `--field-border` como acima.

### A.3 — Confirmar o estado de foco

Certifique-se de que o `:focus` dos inputs/selects usa a cor dinâmica:

```css
input:focus, select:focus {
  border-color: var(--brand, #7c3aed);
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.06);
}
```

Se já estiver assim, não altere nada.

---

## PASSO B — Classificação e estilo dos botões do body

⚠️ **IMPORTANTE:** Não altere os botões dentro do `<header>` (`.btn-back`, `.btn-home`, `.theme-toggle`). Este passo se aplica **exclusivamente** aos botões do corpo da página (`<div class="container">` e demais elementos fora do `<header>`).

### B.1 — Categorias de botões

Identifique cada botão do body da página e classifique-o em uma das três categorias abaixo, conforme sua função:

#### Categoria 1 — Primário (destaque positivo)
Botões que executam a ação principal ou positiva da página.
**Exemplos:** Pesquisar, Salvar, Salvar no banco, Exportar PDF, Adicionar / Atualizar, Confirmar, Buscar.

**Estilo:**
- Preenchido com `var(--brand)` (tema claro) e `var(--brand-d)` (tema escuro)
- Texto branco (`#fff`)
- Borda na mesma cor do fundo
- Hover: `var(--brand-hover)` / `var(--brand-hover-d)`

```css
/* Botão primário */
.btn-primary {
  background: var(--brand, #7c3aed);
  border-color: var(--brand, #7c3aed);
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}
.btn-primary:hover {
  background: var(--brand-hover, #6d28d9);
  border-color: var(--brand-hover, #6d28d9);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.22);
}
html[data-theme="dark"] .btn-primary {
  background: var(--brand-d, #7c3aed);
  border-color: var(--brand-d, #7c3aed);
}
html[data-theme="dark"] .btn-primary:hover {
  background: var(--brand-hover-d, #6d28d9);
  border-color: var(--brand-hover-d, #6d28d9);
}
```

#### Categoria 2 — Secundário (auxílio, neutro)
Botões que auxiliam a função principal ou redirecionam para outra parte do sistema.
**Exemplos:** Atualizar, Adicionar série, Editar (na tabela), botão que abre outra página no body, Novo cadastro, Ver detalhes.

**Estilo:**
- Fundo transparente (`transparent`)
- Borda média (`1.5px`) na cor `var(--brand)` / `var(--brand-d)`
- Texto na cor `var(--brand)` / `var(--brand-d)`
- Hover: fundo suave `var(--brand-faded)` / `var(--brand-faded-d)`

```css
/* Botão secundário */
.btn.btn-secondary,
button.btn-secondary,
button.btn.btn-secondary {
  background: transparent;
  border: 1.5px solid var(--brand, #7c3aed);
  color: var(--brand, #7c3aed);
}
.btn.btn-secondary:hover,
button.btn-secondary:hover,
button.btn.btn-secondary:hover {
  background: var(--brand-faded, #f5f3ff);
}
html[data-theme="dark"] .btn.btn-secondary,
html[data-theme="dark"] button.btn-secondary,
html[data-theme="dark"] button.btn.btn-secondary {
  border-color: var(--brand-d, #7c3aed);
  color: var(--brand-d, #7c3aed);
}
html[data-theme="dark"] .btn.btn-secondary:hover,
html[data-theme="dark"] button.btn-secondary:hover {
  background: var(--brand-faded-d, rgba(124, 58, 237, 0.2));
}
```

#### Categoria 3 — Atenção (destaque negativo)

Dividida em dois níveis:

**3a — Alta atenção** (ação destrutiva irreversível):
Botões que deletam, apagam ou confirmam exclusão permanente.
**Exemplos:** Excluir, Apagar, Deletar, Confirmar exclusão, Remover turma.

**Estilo:**
- Preenchido com vermelho fixo (`#b91c1c`)
- Texto branco
- Hover mais escuro (`#991b1b`)

```css
/* Botão de alta atenção */
.btn.btn-danger,
button.btn-danger,
button.btn.btn-danger {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #fff;
}
.btn.btn-danger:hover,
button.btn-danger:hover,
button.btn.btn-danger:hover {
  background: #991b1b;
  border-color: #991b1b;
}
```

**3b — Baixa atenção** (ação reversível ou de limpeza):
Botões que limpam campos, removem séries ou desfazem algo recuperável.
**Exemplos:** Limpar campos, Remover série, Cancelar, Desfazer.

**Estilo:**
- Fundo transparente
- Borda vermelha (`1.5px solid #b91c1c`)
- Texto vermelho (`#b91c1c`)
- Hover: fundo vermelho muito suave (`rgba(185, 28, 28, 0.08)`)

```css
/* Botão de baixa atenção */
.btn.btn-danger-outline,
button.btn-danger-outline,
button.btn.btn-danger-outline {
  background: transparent;
  border: 1.5px solid #b91c1c;
  color: #b91c1c;
}
.btn.btn-danger-outline:hover,
button.btn-danger-outline:hover,
button.btn.btn-danger-outline:hover {
  background: rgba(185, 28, 28, 0.08);
}
html[data-theme="dark"] .btn.btn-danger-outline,
html[data-theme="dark"] button.btn-danger-outline,
html[data-theme="dark"] button.btn.btn-danger-outline {
  color: #fca5a5;
  border-color: #fca5a5;
}
html[data-theme="dark"] .btn.btn-danger-outline:hover,
html[data-theme="dark"] button.btn-danger-outline:hover {
  background: rgba(252, 165, 165, 0.08);
}
```

---

### B.2 — Aplicar as classes nos elementos HTML

Após classificar cada botão, aplique a classe correspondente no elemento HTML do body:

| Categoria | Classe a adicionar |
|---|---|
| Primário | `btn-primary` |
| Secundário | `btn-secondary` |
| Alta atenção | `btn-danger` |
| Baixa atenção | `btn-danger-outline` |

**Regras de aplicação:**

1. Se o botão já tem uma classe base como `btn` ou `btn-serie` ou `btn-edit`, **adicione** a nova classe (não substitua):
   ```html
   <!-- antes -->
   <button class="btn btn-primary" onclick="salvarNoBanco()">Salvar no banco</button>
   <!-- se já está classificado como primário, não muda -->

   <!-- antes -->
   <button class="btn btn-serie btn-mini" onclick="adicionarSelectSerieTurma()">+ Adicionar série</button>
   <!-- depois (secundário) -->
   <button class="btn btn-secondary btn-mini" onclick="adicionarSelectSerieTurma()">+ Adicionar série</button>
   ```

2. Se o botão usa classes antigas como `btn-gray`, `btn-edit`, `btn-serie` para definir cor/borda, **substitua** essas classes pela nova categoria correspondente. Mantenha apenas classes que controlam tamanho ou layout (ex: `btn-mini`).

3. Se os estilos dessas classes antigas (`.btn-gray`, `.btn-edit`, `.btn-serie`, etc.) agora estão completamente cobertos pelas novas classes, **remova-as do `<style>` local** para evitar conflito. Se ainda houver propriedades de layout (padding, font-size) nessas classes que não são cobertas pelas novas, mantenha apenas essas propriedades e remova as de cor/borda.

---

### B.3 — Adicionar o CSS dos botões no `<style>` local

Se as classes `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-danger-outline` ainda não existem no `<style>` local, adicione os blocos CSS do Passo B.1 na seção de botões do `<style>`.

⚠️ Se a página já possui um `.btn-primary` com estilo compatível (fundo `var(--brand)`, hover `var(--brand-hover)`), não duplique — apenas verifique se está correto e ajuste se necessário.

⚠️ Mantenha a classe `.btn` base intacta se ela existir, pois pode controlar layout compartilhado (padding, border-radius, font-family, etc.).

⚠️ **ESPECIFICIDADE OBRIGATÓRIA:** As páginas do sistema possuem uma classe `.btn` base que define `border` e `background`. Se as novas classes de categoria (`.btn-secondary`, `.btn-danger`, etc.) forem escritas com especificidade simples (`.btn-secondary { ... }`), a classe base `.btn` pode sobrescrever borda e cor quando ambas estiverem no mesmo elemento (ex: `class="btn btn-secondary"`). Por isso, **sempre use os seletores com especificidade reforçada** exatamente como mostrado nos blocos CSS acima — com variantes `button.btn-secondary`, `.btn.btn-secondary`, `button.btn.btn-secondary`.

---

## PASSO C — Bordas dos cards

### C.1 — Localizar os cards do body

Procure no HTML os elementos com classe `.card` (ou equivalentes como `.section-card`, `.form-card`, `.result-card`, etc.) que envolvem seções do conteúdo da página.

### C.2 — Verificar a variável de borda do card

No `<style>` local, localize a regra `.card { ... }` e verifique o valor de `border`.

**Padrão esperado:**
```css
.card {
  border: 1px solid var(--brand-border, #ddd6fe);
  /* demais propriedades intactas */
}
html[data-theme="dark"] .card {
  border-color: var(--brand-border-d, #7c3aed);
}
```

Se a borda do card já usa `var(--brand-border, ...)`, pule este passo.

Se a borda usa uma variável genérica como `var(--line)` ou `var(--border)` ou um valor fixo como `#e5e7eb`:

1. No bloco `:root`, **adicione ou atualize**:
   ```css
   --card-border: var(--brand-border, #ddd6fe);
   ```
2. No bloco `html[data-theme="dark"]`, **adicione ou atualize**:
   ```css
   --card-border: var(--brand-border-d, #7c3aed);
   ```
3. Na regra `.card`, substitua o valor de `border`:
   ```css
   .card {
     border: 1px solid var(--card-border);
   }
   ```

⚠️ Se a página usa `--line` ou `--border` também em outros elementos (tabelas, divisórias, etc.) e você **não quer** que eles mudem de cor, não altere essas variáveis globais — crie `--card-border` separado como acima.

---

## PASSO D — Corrigir cor do nome do usuário no chip (dark mode)

### D.1 — Identificar o problema

No `<style>` local da página, localize o bloco `html[data-theme="dark"]` e procure pela variável `--chip-name`. Ela pode estar definida assim:

```css
html[data-theme="dark"] {
  --chip-name: var(--brand-text-d); /* ❌ errado — usa cor vibrante da marca */
}
```

Quando `--chip-name` usa `var(--brand-text-d)`, o nome do usuário no chip do header fica na cor da marca (roxo, verde, etc.) em vez de um tom neutro legível — o que é incorreto. O `.name` do chip deve ter contraste neutro; apenas o `.sub` (e-mail/cargo) usa a cor da marca como destaque.

### D.2 — Corrigir

Se `--chip-name` no dark estiver usando qualquer variante de `var(--brand-*)`, substitua por `var(--ink)`:

```css
html[data-theme="dark"] {
  --chip-name: var(--ink); /* ✅ correto — texto neutro, legível */
}
```

⚠️ Não altere `--sub-color` — ele deve continuar usando `var(--brand-text-d)`, pois o subtítulo do chip (e-mail ou cargo) usa cor de destaque intencionalmente.

⚠️ Se `--chip-name` já for `var(--ink)` ou um valor neutro claro (ex: `#e2e8f0`, `#cbd5e1`), pule este passo.

---

## PASSO E — Verificação final

Após aplicar os passos A, B, C e D, confirme:

- [ ] Todos os `input` e `select` do body têm borda com cor herdada do tema dinâmico
- [ ] O `:focus` dos campos usa `var(--brand)`
- [ ] Cada botão do body tem exatamente uma classe de categoria (primário, secundário, danger ou danger-outline)
- [ ] O CSS de cada categoria usa especificidade reforçada (`.btn.btn-secondary`, `button.btn-secondary`, etc.)
- [ ] Nenhum botão do `<header>` foi alterado
- [ ] Os cards têm borda com cor herdada do tema dinâmico
- [ ] `--chip-name` no dark mode usa `var(--ink)` (tom neutro)
- [ ] Nenhuma lógica de script foi alterada
- [ ] Nenhum atributo `id`, `onclick`, `href` ou `type` foi alterado

---

## O QUE NÃO FAZER

- Não altere botões dentro do `<header>`
- Não altere nenhum script (JS)
- Não renomeie IDs, classes funcionais ou atributos
- Não altere cores de texto do body (apenas bordas e fundos dos elementos indicados)
- Não altere tabelas, modais ou componentes que não sejam inputs, selects, botões e cards
- Não adicione novas variáveis CSS que não sejam as indicadas neste prompt

---

## ENTREGA ESPERADA

Retorne o arquivo HTML completo com:
- Inputs e selects do body com borda herdada do tema dinâmico
- Botões do body classificados e estilizados nas três categorias
- Cards com borda herdada do tema dinâmico
- Tudo mais intacto
