# Checklist de Testes — Sistema Escolar (pré-auditoria) — v3

> v1 tinha o levantamento inicial. v2 corrigiu escopo/contagem/RBAC/localStorage.
> Esta v3 já reflete a primeira rodada real de testes — só ficou o que tem
> **bug**, **decisão tomada** ou **ainda não foi testado**. Tudo que passou
> limpo na v2 foi removido daqui (login, hubs, busca de atas/ano-ativo,
> export historico-aluno, Cloud Functions, etc. — todos ✅ confirmados).

---

## 🐛 Bugs encontrados (a corrigir)

### `cadastro_usuario.html`
1. **Sem header padrão.** Essa página é um caso especial: como ninguém está
   logado ainda, não deve ter chip nenhum — só **tema** e **voltar**. Precisa
   de uma variante reduzida do header, não o completo.
2. **Select de escola mostra "ADMIN" como opção.** `ADMIN` é o ID especial
   que referencia o administrador global do sistema, não uma escola de
   verdade — não deveria aparecer nesse `<select>`.
3. **Select de escola mostra `nome (ID)` em vez de só `displayName`.** Mesmo
   problema que o `prompt-padronizacao.md` (passo 3c) já resolve em outras
   páginas — essa aqui parece nunca ter passado por aquele prompt.
   > Ao corrigir: aplicar a padronização completa (não só o texto do select)
   > e adicionar o filtro do item 2 (ignorar `ADMIN`), que é regra nova, não
   > estava em nenhum guia ainda.

### `perfil.html`
4. **Sem header padrão.** Diferente do `cadastro_usuario.html`, aqui o
   usuário já está logado — deve ter o **header completo normal** (chip de
   usuário, chip de escola, tudo).
5. **Troca de email não chega no email antigo.** Ao trocar o email, a
   confirmação diz que o novo email será validado antes da troca no banco —
   mas o código de confirmação não chegou no primeiro email testado.
   Testando com um segundo email, chegou normalmente. Pode ser
   caso isolado do primeiro endereço — testar de novo com mais 1-2 emails
   diferentes antes de tratar como bug de código.
6. **Código de confirmação sempre cai no spam** — provável configuração de
   remetente (SPF/DKIM/domínio), não bug de página. Investigar depois, à
   parte, se decidir que vale a pena.

### `cadastro_admin.html`
7. **Email do usuário não atualiza na tela após troca.** Nome atualiza
   normalmente, mas o email continua mostrando o valor antigo mesmo após o
   usuário já conseguir logar com o novo. Suspeita: mesma raiz do problema
   de cache local (localStorage) da seção de achados — tela pode estar lendo
   de uma lista em cache não invalidada, em vez do Firestore ao vivo.

### `cadastro-aluno-ativo.html`
8. **Todos os campos ficam em MAIÚSCULO, exceto "Naturalidade".** Inconsistência
   de transformação de texto — provavelmente falta o mesmo `text-transform`/
   `.toUpperCase()` nesse campo específico.
9. **NEE — especificidade não vem marcada ao editar.** Aluno cadastrado com
   "Deficiência Física" mostra o badge certo na busca. Ao abrir editar, o
   toggle principal de NEE aparece "SIM", mas nenhuma deficiência específica
   fica selecionada. Clicando em "Atualizar" sem tocar em nada, dá erro de
   validação nesse campo (a tela não deixa salvar porque acha que falta
   escolher a especificidade — que na verdade já existe salva, só não foi
   pré-marcada na renderização).

---

## ✅ Decisões já tomadas (não são mais perguntas em aberto)

- **`admin_backup.html` gerar backup a partir do cache local é inadmissível.**
  Decidido: precisa reescrever para ler direto do Firestore no momento do
  export. O teste de comparação backup-vs-Firestore-ao-vivo da v2 fica
  redundante — vou aguardar o fix pra reescrever a função de export.
- **`oldcadastro-funcionario.html` confirmado sem uso** — órfã, pode ser
  removida quando fizer sentido (não é urgente).

---

## 🆕 Achado novo nesta rodada

- **`config.html` (hub de Configurações) parece órfã/sem uso** — você marcou
  como tal ao preencher a lista. Antes de remover, vale confirmar: nenhuma
  outra página linka pra ela? Ela deveria estar acessível a partir de algum
  lugar (`index.html`?) e simplesmente não está, ou o módulo inteiro ficou
  obsoleto?

---

## ⏳ Pendências (ainda não testado)

- **Módulo Admin inteiro** (`admin.html`, `admin_escolas.html`,
  `cadastro_admin.html`, `admin_backup.html`, `idaluno.html`,
  `schema_ata.html`) — combinado: vai ganhar um **guia à parte, bem
  detalhado**, pra testar tim-tim por tim-tim quando você tiver mais tempo.
  Me avisa quando quiser montar esse guia.
- **`historico_auto.html`** e **`schema_ch.html`** — aguardando os fixes que
  você já está desenvolvendo (mencionado antes de começar os testes).
- **Firestore Security Rules** — ainda não escritas/revisadas. Você vai me
  pedir pra fazer as regras adaptadas ao RBAC do sistema — combinado,
  fica pra quando você tiver o próximo token do GitHub.
- **Levantamento completo de localStorage por página** — vou refazer a
  varredura (mais a fundo dessa vez, já mirando os bugs de cache que
  apareceram no teste, como o do email em `cadastro_admin.html`) assim que
  tiver acesso ao repo de novo.
- **Checagem de erros no console** no fluxo crítico (login → cadastro →
  pesquisa → exportação) — não testado ainda.

---

## Testes pulados intencionalmente (sem necessidade de repetir)

- `pesquisa-ano-ativo.html` e `readmitir-aluno.html` — já testados logo após
  os fixes anteriores; cobertura considerada suficiente por você.
