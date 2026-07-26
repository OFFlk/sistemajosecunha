📦 PATCH NOTES – SISTEMA (v2 — pronto para desenvolvimento)

> Versão revisada com escopo, contexto técnico e observações de risco, para uso direto por IA de código ou equipe de dev.

---

## 🐞 Correções (Bugs & Inconsistências)

### 📚 Cadastro de Turmas

- **Campo "ano ativo"** estava como select com anos fixos
  → Trocar pelo mesmo seletor dinâmico usado no cadastro de aluno.

- **ID da turma inconsistente**
  - Em alguns lugares aparece fora de badge
  - Na pesquisa aparece dentro de badge cinza
  → Padronizar exibição em badge em todos os locais.

- **Botões editar e excluir** com a mesma cor (problema agravado no tema vermelho)
  → Diferenciação visual clara: ação destrutiva ≠ ação neutra.

- **Filtro de ano ativo** iniciando em "todos os anos" (padrão incorreto)
  → Deve iniciar com o ano ativo atual selecionado.
  → **Escopo confirmado:** afeta apenas a listagem desta página. Não impacta exports/relatórios.

---

### 🔍 Pesquisa de Atas

- Turmas do módulo "ano ativo" aparecendo indevidamente em atas finais.
- **Causa provável:** conflito entre `turmaID` e `turmaIDativo` (possível match por radical/substring em vez de igualdade exata).
- **Efeito:** turmas válidas aparecendo como "corrompidas".

**Correção esperada:**
- Pesquisa deve considerar apenas `turmaID` válido.
- Isolar completamente `turmaIDativo` desse contexto.

> ⚠️ **Nota para análise via IA:** causa técnica ainda não confirmada — investigação será feita por IA de código. Antes de repassar a tarefa, reunir **exemplos reais de reprodução**: um `turmaID` e um `turmaIDativo` que estão colidindo, e o resultado incorreto gerado. Sem dado real de reprodução, a IA pode propor uma causa plausível mas errada.

> 🔴 **Prioridade alta** — bug de confiabilidade de dados. Testar em conjunto com o item "Importação de atas (v2)" da seção de testes, já que ambos mexem na mesma área.

---

### 🧾 Histórico Automático (`historico_auto`)

#### 🎨 CSS / Layout
- Cards com mesma cor do background → baixa visibilidade.
  → Correção: contraste adequado conforme design system.

#### 🌍 Cidade / UF
- Sintoma: Cidade vem como "cidade/UF" e o campo UF vem vazio.
- **Diagnóstico confirmado:** o dado no banco está correto (cidade e UF salvos em campos separados). O problema é local a esta página — a query/lógica de exibição desta tela concatena os campos incorretamente. Outras páginas que consomem o mesmo dado exibem corretamente.
  → **Correção:** comparar a query desta página com a de uma página que exibe corretamente, e ajustar apenas o ponto de concatenação/exibição aqui. Não é necessário script de correção retroativa no banco (dado já está íntegro).
- Exibição final esperada: `Cidade - UF`

#### 🔤 Formatação de Texto (CRÍTICO)
> Contexto confirmado: **não é bug de UI**, é a especificação de preenchimento dos placeholders no documento final gerado (atas/documentos exportados).

Padronização obrigatória:

**Tabela:**
- Labels → MAIÚSCULO
- Nomes → Nome Sobrenome
- Siglas → MAIÚSCULO

**Texto final (documento):**
- Nome do aluno → MAIÚSCULO COMPLETO
- Série → ordinal + tipo em MAIÚSCULO (ex: `3º ANO`)
- Data:
  - Dia: 01, 02…
  - Mês: por extenso
  - Ano: 2026

**Recomendação de implementação:** centralizar essas regras em funções/template reutilizáveis de geração de documento (ex: `formatarNomeAluno()`, `formatarSerie()`, `formatarData()`), em vez de aplicar manualmente em cada exportação. Garante que qualquer documento gerado no sistema (atas, atestados, fichas) siga o mesmo padrão sem depender de implementação repetida.

---

## ⚙️ Melhorias / Novas Funcionalidades

### 👨‍🎓 Cadastro de Aluno Ativo

- Novo campo: indicar participação em Atendimento Educacional Especializado (AEE).
  → Sugestão: checkbox ou seletor binário (Sim/Não).

**Escopo de integração confirmado (3 pontos):**
1. Ficha individual do aluno (já existe — adicionar o campo aqui).
2. Viewer da página de pesquisa (exibir quando implementado).
3. Export das fichas individuais dos alunos.

---

### 🔄 Portabilização em Massa (ANO ATIVO) 🚀

**🎯 Objetivo:** permitir migração de dados entre anos letivos.

**👥 Inclui:** Alunos, Funcionários.

**📌 Cenários:**
- Continuidade para o próximo ano.
- Encerramento + reaproveitamento de dados.

**⚙️ Funcionalidades:**
- Ação em lote.
- Seleção de origem/destino.
- Controle de duplicidade.
- Preservação de vínculos relevantes.

**Detalhamento após esclarecimentos:**

- **Comportamento de falha:** o ano novo nasce em branco; o ano antigo nunca é alterado. Isso torna o "rollback" trivial — se algo der errado e nenhuma barreira segurar o erro, basta apagar o ano novo para retornar ao estado inicial. Não há risco de corromper dados existentes.
  → ⚠️ **Ponto de atenção para a IA de código:** mapear **todas as tabelas/vínculos** criados durante a portabilização (matrículas, histórico, relações entre aluno/turma/funcionário, IDs novos etc.), para garantir que "apagar o ano novo" realmente limpa tudo e não deixa registros órfãos em tabelas relacionadas.

- **Preview / seleção:** tela ou aba dedicada com elementos visuais para selecionar alunos/funcionários que vão para o próximo ano, com ferramentas de seleção em massa (marcar todos, selecionar por turma, etc.). Escopo já considerado suficientemente claro para desenvolvimento.
  → Sugestão adicional: uma confirmação final ("tem certeza?") antes de gravar o lote, já que a seleção prévia substitui a necessidade de backup.

- **Duplicidade:** no modelo atual do sistema, duplicidade não deveria ser possível. Ainda assim, aplicar uma barreira de verificação; se detectada, a decisão final é humana (não automática).

- **Backup:** não necessário. Nenhum dado do ano antigo é apagado ou modificado; o ano novo começa vazio. Em caso de falha sem barreira suficiente, a recuperação é apagar o ano novo recém-criado.

---

## 🧪 Testes Necessários

- **Importação de atas (v2)**
  - Validar compatibilidade.
  - Verificar integridade dos dados.
  - Atenção especial ao vínculo com IDs.
  - ⚠️ Executar **depois** da correção do bug de Pesquisa de Atas (`turmaID` / `turmaIDativo`), pois ambos atuam na mesma área do sistema.

---

## 📋 Logs + Auditoria

**Escopo confirmado:** foco não é importação/portabilização (já possuem rede de segurança própria via "ano em branco"). Foco principal:

- **Edição de dados sensíveis do sistema.**

👉 Registrar:
- Quem fez
- Quando
- O que foi alterado

> 🔲 **Em aberto:** ainda não definido quais campos entram como "sensíveis" (ex: dados pessoais, notas, dados financeiros, endereço). Essa lista deve ser definida antes da implementação, pois influencia o formato do log — registrar valor anterior/novo diretamente é simples, mas se houver decisão de mascarar/anonimizar dados sensíveis em relatórios de auditoria, isso é uma decisão de design à parte.

---

## 🔢 Sugestão de Prioridade

1. 🔴 Bug de Pesquisa de Atas (`turmaID` / `turmaIDativo`) — reunir casos reais de reprodução antes de repassar para IA.
2. 🔴 Bug de Histórico Automático (Cidade/UF) — comparar query com página funcional equivalente.
3. 🟡 Portabilização em Massa — mapear tabelas/vínculos afetados antes de codar.
4. 🟡 Correções visuais/UX (turmas, cards, botões) — baixo risco, pode ir em paralelo.
5. 🟡 Formatação de texto para documentos — centralizar em funções reutilizáveis.
6. 🟢 Campo AEE — escopo simples e já definido (3 pontos de integração).
7. 🟢 Logs de auditoria — definir lista de campos sensíveis antes de implementar.
