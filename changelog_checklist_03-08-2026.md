# 📦 CHANGELOG --- Atualização da Checklist (03/08/2026)

## ✅ Implementado

### 👨‍🎓 Cadastro de Alunos

-   Adicionado campo **Profissional de Apoio** integrado ao cadastro de
    funcionários.
-   Campo **Sala do AEE** reformulado.
-   Campo passa a aparecer apenas quando existir alguma NEE.
-   Sincronização correta do Modelo de Ensino com a matrícula ativa.

### 🔍 Pesquisa de Alunos

-   Inclusão de Turma, Professor(a), Profissional de Apoio, Sala do AEE,
    Pesquisa Avançada, filtros por deficiência/transtornos, badge de
    filtros ativos.
-   Nova tabela interativa.
-   Correção da exibição das datas.
-   Correção do PDF das fichas.
-   Correção da sincronização do Modelo de Ensino.

### 👨‍🏫 Cadastro de Funcionários

-   Novo campo **É profissional de apoio?**

### 📄 Exportação / Documentos

-   Datas em padrão brasileiro.
-   Correções de quebra de linha em PDFs.
-   Ajustes gerais de formatação das fichas.

### 📚 Cadastro de Turmas

-   Correções de UX e padronização visual.
-   Ajustes de filtros.
-   Melhorias na consistência da interface.

### 📝 Pesquisa de Atas

-   Corrigido conflito entre `turmaID` e `turmaIDativo`.

### 🗂️ Histórico Automático

-   Ajustado contraste dos cards.
-   Corrigida exibição de Cidade/UF.

------------------------------------------------------------------------

# 🚧 Pendências

## 🟡 Melhorias

### Portabilização em Massa (Ano Ativo)

-   Migração de alunos.
-   Migração de funcionários.
-   Tela de seleção.
-   Controle de duplicidade.
-   Preservação de vínculos.
-   Limpeza segura em caso de rollback.

## 🧪 Testes

-   Validar Importação de Atas v2.
-   Testar integridade dos IDs.
-   Validar funcionamento após correção da Pesquisa de Atas.

## 📋 Logs de Auditoria

Implementar registro de: - Quem alterou. - Quando alterou. - O que foi
alterado.

**Em aberto** - Definir quais campos serão considerados sensíveis para
auditoria.
