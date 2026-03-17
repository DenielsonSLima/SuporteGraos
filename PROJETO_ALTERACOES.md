# Histórico de Alterações do Projeto

> Arquivo mantido automaticamente pelo Claude.
> Cada entrada registra o que foi feito, o contexto e o impacto.

---

## 2026-03-13 — UI: Ajuste de Tamanho de Fonte dos KPIs (Dashboard)

**O que foi feito:**
- Reduzido o tamanho da fonte dos valores nos cards de KPI do módulo Início (Dashboard).
- `FinancialSummary.tsx`: `text-2xl` → `text-xl`.
- `OperationalSummary.tsx`: `text-xl` → `text-lg`.

**Por quê:**
- Prevenir quebra de layout quando os valores atingirem a casa dos milhões (R$ 1.000.000,00+).

**Arquivos afetados:**
- `modules/Dashboard/components/FinancialSummary.tsx`
- `modules/Dashboard/components/OperationalSummary.tsx`

---

## 2026-03-13 — Feature: Adição de Combustíveis e Petróleo ao Mercado ao Vivo

**O que foi feito:**
- Adicionados os itens "Diesel S10", "Gasolina Comum" e "Petróleo (Brent)" à lista de commodities do card "Mercado ao Vivo" no Dashboard.
- Definidos valores base médios para simulação de variação diária.

**Por quê:**
- Solicitação do usuário para acompanhar preços de combustíveis e petróleo diretamente na tela inicial do ERP.

**Arquivos afetados:**
- `services/marketService.ts`

---

## [2026-03-13] Correção e Padronização de Adiantamentos e Baixas
- **O que foi feito**: Corrigido o fluxo de adiantamentos e baixas, permitindo o vínculo entre eles via `parent_id`.
- **Motivo**: O frontend esperava um `p_parent_id` que não existia no banco/RPC, impedindo o abatimento automático do saldo.
- **Arquivos modificados**:
  - `supabase/migrations/20260313_add_parent_id_to_advances.sql`: Nova migração adicionando coluna e atualizando RPC.
  - `modules/Financial/Advances/components/AdvanceForm.tsx`: Redesign completo para o padrão premium e simplificação de termos.
  - `modules/Financial/Advances/components/SettleAdvanceModal.tsx`: [NOVO] Modal dedicado para baixas com visual premium.
  - `modules/Financial/Advances/AdvancesTab.tsx`: Integração dos novos componentes e simplificação de abas (Entrada/Saída).

---

## 2026-03-13 — Fix: Tela Branca no Módulo Financeiro (Dependência Circular)


**O que foi feito:**
- Identificada e corrigida uma dependência circular entre os serviços: `financialEntriesService` → `authService` → `auditService` → `supabaseInitService` → `financialEntriesService`.
- Implementado uso de **dynamic imports** para o `authService` nos serviços `financialEntriesService.ts`, `standaloneRecordsService.ts`, `loadingService.ts` e `auditService.ts`.
- Atualizadas funções internas para `async` onde necessário para suportar o carregamento dinâmico.
- Reparada estrutura danificada no arquivo `standaloneRecordsService.ts` após tentativa de edição malsucedida.

**Por quê:**
- O loop de dependências impedia que os módulos terminassem de carregar, resultando em um erro de `ReferenceError` (Cannot access before initialization) que derrubava a renderização do React (tela branca).

**Arquivos afetados:**
- `services/financialEntriesService.ts`
- `services/standaloneRecordsService.ts`
- `services/loadingService.ts`
- `services/auditService.ts`

---

## 2026-03-13 — Fix: Ghost Credits em Recebíveis e Restrição de Vendas


**O que foi feito:**
- Atualizada a view `vw_receivables_enriched` para filtrar apenas origens do tipo `sales_order` e ocultar registros com status `cancelled` ou `reversed`.
- Atualizada a view `vw_payables_enriched` para ocultar registros cancelados/estornados.
- Corrigida a função de trigger `fn_update_entry_paid_amount` para suportar tipos de transação `IN` e `OUT`, garantindo recálculo correto do saldo pago.
- Corrigido o serviço `financialTransactionService.ts` para incluir o `entry_id` nos estornos automáticos, permitindo que o gatilho do banco identifique a conta pai.
- Expandido o tipo `FinancialStatus` e `EntryStatus` no sistema para suportar oficialmente o estado `reversed`.

**Por quê:**
- Créditos "Outros Créditos" estavam vazando para o módulo de "Contas a Receber" mesmo após cancelados.
- O sistema de estorno não estava abatendo o saldo pago da conta original porque os tipos `IN/OUT` não eram processados pelo gatilho de soma, e o link com a conta original era perdido no estorno.

**Arquivos afetados:**
- `services/financialEntriesService.ts`
- `services/financial/financialTransactionService.ts`
- `modules/Financial/types.ts`
- `modules/Financial/Receivables/ReceivablesTab.tsx`
- Migração SQL: `fix_receivables_payables_views_v2_drop_first`

---

## 2026-03-13 — Comprehensive Modal Refactoring with `ModalPortal`

**O que foi feito:**
- Refatoração em massa de modais nos módulos Financeiro, Logística, Pedido de Compra, Carregamentos, Caixa e Relatórios para utilizar o padrão `ModalPortal`.
- Modais afetados:
  - **Financeiro**: `AdvanceListPdfModal`, `InstallmentExpenseForm`, `LoanTransactionModal`, `LoanPdfModal`, `LoanListPdfModal`, `LoanFormModal`, `FinancialPaymentModal`, `AdminExpenseQuickView`.
  - **Logística**: `FreightPaymentModal`, `FreightSelectionModal`.
  - **Carregamentos**: `ExpenseModal`, `LoadingForm`.
  - **Pedido de Compra**: `PdfPreviewModal`, `PurchasePaymentModal`, `OrderDeleteModal`, `NoteModal`, `PurchaseAdvanceModal`, `ExpenseFormModal`.
  - **Caixa**: `SnapshotModal`.
  - **Relatórios**: `ReportPdfPreviewModal`, `ReportGeneratorModal`.
- Correção de erros de sintaxe (duplicação de caracteres de fechamento `})`) em diversos arquivos após a aplicação do padrão.
- Padronização do `z-index` e estilos de overlay para garantir consistência visual.

**Por quê:**
- Consolidar o padrão `ModalPortal` em todo o sistema para evitar problemas de contexto de empilhamento (stacking context) e garantir que os modais sempre sobreponham o cabeçalho e a barra lateral, prevenindo interações indevidas no fundo.

**Arquivos afetados:**
- Diversos arquivos em `modules/Financial/`, `modules/Logistics/`, `modules/PurchaseOrder/`, `modules/Loadings/`, `modules/Cashier/` e `modules/Reports/`.
- `PROJETO_CONTEXTO.md` (reforço da regra).

---

## 2026-03-13 — Global Fix: Padronização de Modais com React Portals

**O que foi feito:**
- Criado componente base `ModalPortal` (`components/ui/ModalPortal.tsx`).
- Refatorados TODOS os modais do sub-módulo Sócios para utilizar Portals:
  - `ShareholderBulkCreditModal`
  - `ShareholderCreditModal`
  - `ShareholderPdfModal`
  - `ShareholderRecurringModal`
  - `ShareholderStatementModal`
- Atualizado `PROJETO_CONTEXTO.md` com o padrão **Modal Portal Pattern** para evitar regressões.

**Por quê:**
- Devido às transições de entrada no componente `<main>`, os modais internos criavam um novo contexto de empilhamento (stacking context). Isso impedia que modais (mesmo com `z-index` alto) cobrissem o cabeçalho e bloqueassem a busca global do sistema. O uso de Portals resolve isso renderizando o modal diretamente no `document.body`.

**Arquivos afetados:**
- `components/ui/ModalPortal.tsx`
- `modules/Financial/Shareholders/components/*.tsx`
- `PROJETO_CONTEXTO.md`

---


## 2026-03-12 — Fix: RPC `rpc_create_admin_expense` não criava `financial_entries` para despesas diretas

**O que foi feito:**
- Corrigida a RPC `rpc_create_admin_expense` que condicionava a criação de `financial_entries` a `payee_id IS NOT NULL`.
- Despesas diretas (sem parceiro, só com `payee_name`) não geravam entry, causando erro "Entrada financeira não encontrada" na baixa imediata.
- Criada entry faltante para despesa órfã "Lazaro" (R$ 3.000,00) que já existia no banco.

**Por quê:**
- Baixa imediata falhava para toda despesa sem `payee_id`, pois `payExpense` buscava a entry por `origin_id` e não encontrava.

**Arquivos afetados:**
- Migration SQL: `fix_rpc_create_admin_expense_always_create_entry`

---

## 2026-03-12 — Feature: Reversão de pagamentos no QuickView de despesas

**O que foi feito:**
- Criada RPC `rpc_reverse_admin_expense_payment` que deleta a transação e os triggers recalculam saldo da conta e status da entry/despesa.
- Adicionado `reversePayment` no hook `useAdminExpenseOperations.ts`.
- Botão de excluir pagamento no `AdminExpenseQuickView` (aparece ao hover na linha do pagamento).
- Modal de confirmação (`ActionConfirmationModal`) antes de reverter, mostrando valor e conta.

**Por quê:**
- Não havia forma de reverter um pagamento feito incorretamente em despesas administrativas.

**Arquivos afetados:**
- `modules/Financial/AdminExpenses/hooks/useAdminExpenseOperations.ts`
- `modules/Financial/AdminExpenses/components/AdminExpenseQuickView.tsx`
- `modules/Financial/AdminExpenses/AdminExpensesTab.tsx`
- Migration SQL: `create_rpc_reverse_admin_expense_payment`

---

## 2026-03-12 — Fix: Modal de pagamento exibia valor R$ 0,00 para despesas administrativas

**O que foi feito:**
- Adicionado campo `remainingValue` no adapter `toFinancialRecord` em `AdminExpensesTab.tsx`.

**Por quê:**
- O `FinancialPaymentModal` usa `record.remainingValue` para exibir o "Saldo Devedor Atual". O adapter não populava esse campo, resultando em `undefined || 0` = R$ 0,00.

**Arquivos afetados:**
- `modules/Financial/AdminExpenses/AdminExpensesTab.tsx`

---

## 2026-03-12 — Upgrade no Módulo de Despesas Administrativas

**O que foi feito:**
- **Nova Visualização em Cards**: Refatoração total da lista de despesas para um layout de cards modernos, mais intuitivos e com indicadores visuais de status (Aberto, Pago, Vencido).
- **Quick View (Drawer)**: Implementação de um painel lateral de consulta rápida com detalhes completos, histórico real de pagamentos e botões de ação direta.
- **Correção da Baixa Imediata**: Resolvido bug onde a opção "Já está pago?" no formulário não registrava a saída do banco. Agora, o sistema detecta a baixa e gera a transação automaticamente.
- **CRUD Completo**: Restaurada a funcionalidade dos botões de Editar e Excluir despesas, com tratamento de integridade para despesas já quitadas.
- **Refatoração para Padrões Sênior**: Centralização de toda lógica de dados em `adminExpensesService.ts`, `financialEntriesService.ts` e `financialTransactionsService.ts`, eliminando chamadas diretas à API nos componentes (Regra 1).
- **Ordenação Inteligente**: As despesas agora aparecem ordenadas pela data de lançamento (mais recentes primeiro), com limite de segurança de 100 registros (Regra 7).

**Componentes Criados/Refatorados:**
- `AdminExpenseCardList.tsx`: Novo layout de cards.
- `AdminExpenseQuickView.tsx`: Gaveta lateral de detalhes.
- `useAdminExpenseOperations.ts`: Refatorado para suportar Delete, Update e Pagamentos sem entradas financeiras vinculadas (fallback).

---

## 2026-03-12 — Correção de Erro de Tela Branca (Render Crash)

**O que foi feito:**
- Corrigido erro de "Element type is invalid" que causava tela branca no módulo de despesas.
- Implementada exportação de ícones válidos em `getCategoryIcon` no `expenseCategoryService.ts`.
- Refatorado `AdminExpenseGroupedList.tsx` para usar dados de categorias reais em vez de um array vazio legado, corrigindo também a categorização Visual das despesas.
- Adicionada renderização segura de ícones `{Icon && <Icon ... />}` para prevenir quebras futuras caso algum mapeamento falhe.

**Por quê:**
- O sistema tentava renderizar um ícone que estava retornando `null`, o que não é permitido para componentes React, derrubando toda a árvore de renderização.

**Arquivos afetados:**
- `services/expenseCategoryService.ts`
- `modules/Financial/AdminExpenses/components/AdminExpenseGroupedList.tsx`
- `modules/Financial/AdminExpenses/AdminExpensesTab.tsx`

---

## 2026-03-12 — Correção Crítica de Foreign Key e Erro de Lançamento
- Corrigido erro de "violates foreign key constraint admin_expenses_category_id_fkey" no lançamento de despesas.
- Implementado mapeamento automático entre Subcategorias (ex: "Internet") e Categorias Pai (ex: "Despesa Fixa") no frontend.
- Implementada técnica de preservação de granularidade via descrição para contornar limitações do schema do banco sem necessidade de migração SQL (visto que a tabela `admin_expenses` não possuía coluna de subcategoria).

**Por quê:**
- O banco de dados exige que o `category_id` seja um UUID da tabela `expense_categories`. O frontend estava enviando IDs da `expense_subcategories`, causando falha na restrição de chave estrangeira.
- Como o schema atual não permite salvar o ID da subcategoria de forma estruturada, a solução sênior foi concatenar o nome da subcategoria na descrição para persistência e recuperá-lo no carregamento dos dados para manter a experiência do usuário idêntica.

**Arquivos afetados:**
- `modules/Financial/AdminExpenses/AdminExpensesTab.tsx`

---

## 2026-03-12 — Ordenação Alfabética e Correção de Erro de UUID (Banco)
- Implementada ordenação alfabética (usando `localeCompare`) nas categorias de despesa nos modais de lançamento.
- Corrigido erro de "invalid input syntax for type uuid" no lançamento de despesas com baixa imediata.

**Por quê:**
- O usuário precisava das categorias organizadas para facilitar a busca manual.
- O formulário estava enviando o nome da conta bancária (`account_name`) em vez do seu ID (`uuid`) para o backend, causando erro no banco de dados.

**Arquivos afetados:**
- `modules/Financial/AdminExpenses/components/InstallmentExpenseForm.tsx`
- `modules/PurchaseOrder/components/details/Expenses/ExpenseFormModal.tsx`

**Observações:**
- A correção do UUID foi feita garantindo que o `accountId` original do hook de contas seja passado adiante no payload de criação.

---
