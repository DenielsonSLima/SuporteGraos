# Bugs Conhecidos — Suporte Grãos ERP

## Como usar este arquivo
Sempre que um bug for resolvido, registrar aqui para evitar regressão futura.
Formato: Data | Módulo | Descrição | Causa Raiz | Solução

---

## Registro de Bugs

## 08/03/2026 — Pedido de Compra — Pagamento não listado

**Sintoma:** Pagamentos realizados no módulo financeiro ou via modal de pedido salvavam no core, mas sumiam da lista do pedido após refresh.
**Causa Raiz:** O componente lia apenas o array `metadata.transactions` do JSONB da tabela `ops_purchase_orders`. Pagamentos no financeiro atualizam apenas `financial_transactions`, causando desincronização (Padrão 3).
**Tabelas Afetadas:** `ops_purchase_orders` (metadata), `financial_entries`, `financial_transactions`.
**Solução Aplicada:** Criado hook `usePurchaseOrderTransactions` para buscar dados em tempo real do módulo financeiro (entry_id via ops_purchase_orders.id). Integrado ao `usePurchaseOrderLogic` para merge automático de metadados com transações vivas do banco.
**Risco de Regressão:** Baixo. Melhora a integridade visual do saldo.
**Testes Necessários:** 1. Fazer pagamento no financeiro e ver se aparece no pedido; 2. Fazer pagamento no pedido e ver se duplicados são tratados pelo merge por ID.

---

## 08/03/2026 — Pedido de Venda — Erro ao adicionar recebimento

**Sintoma:** Ao tentar registrar um recebimento dentro do Pedido de Venda, o sistema retornava erro ou não processava.
**Causa Raiz:** O handler `handleSalesOrderReceipt` recebia o `recordId` (muitas vezes o "number" do pedido, ex: PV-2026-452) e tentava passá-lo diretamente para RPCs que exigem o tipo `UUID`. A falta de conversão do "number" para o "id" real causava falha na busca da `financial_entry`.
**Tabelas Afetadas:** `ops_sales_orders`, `financial_entries`.
**Solução Aplicada:** Implementada resolução robusta de UUID no `salesOrderHandler.ts`. Agora, se o `recordId` não for um UUID válido, o sistema busca o UUID correspondente na tabela `ops_sales_orders` pelo campo `number` antes de prosseguir com as operações financeiras.
**Risco de Regressão:** Nulo. Apenas torna o handler mais tolerante a diferentes formatos de ID vindos do frontend.
**Testes Necessários:** Registrar um recebimento em uma venda usando o modal interno e verificar se a transação é criada e o saldo atualizado.

---

## 07/03/2026 — Logística — Inconsistência no Frete Líquido

**Sintoma:** O valor a pagar para o motorista ignorava adições (frete extra) e deduções (quebra, pedágio).
**Causa Raiz:** O RPC de reconstrução financeira de frete não somava os itens da tabela `ops_loading_freight_components`.
**Tabelas Afetadas:** `ops_loadings`, `ops_loading_freight_components`, `financial_entries`.
**Solução Aplicada:** Refatorado `rpc_ops_loading_rebuild_freight_financial_v1` para agregar todos os componentes de frete no `net_amount`.
**Risco de Regressão:** Baixo.
**Testes Necessários:** Adicionar uma despesa de quebra no carregamento e verificar se o valor no Contas a Pagar diminui.

---

## 07/03/2026 — Financeiro — Falta de Sincronização de Ledger (Sócios/Empréstimos)

**Sintoma:** Movimentações de sócios e novos empréstimos criavam registros nos módulos, mas o saldo bancário da empresa não mudava.
**Causa Raiz:** Os serviços realizavam apenas o `insert` nas tabelas de domínio, sem chamar o orquestrador financeiro para gerar o `debit`/`credit` no ledger bancário.
**Tabelas Afetadas:** `shareholders`, `loans`, `financial_transactions`.
**Solução Aplicada:** Criados handlers específicos (`shareholderHandler.ts`, `loanHandler.ts`) e integrados aos serviços core para garantir atomicidade via Ledger Sync.
**Risco de Regressão:** Médio. Afeta o fluxo de caixa centralizado.
**Testes Necessários:** Lançar uma retirada de sócio e verificar se o extrato bancário reflete a saída.

---

## 07/03/2026 — Financeiro — Status de Liquidação de Adiantamentos

**Sintoma:** Liquidar um adiantamento criava o registro de compensação, mas o original continuava "Aberto". Além disso, o caixa às vezes registrava débitos em vez de créditos.
**Causa Raiz:** O `rpc_create_advance` não suportava vínculo com registro pai e tinha lógica de débito/crédito fixa, ignorando o tipo de destinatário e se era uma quitação.
**Tabelas Afetadas:** `advances`, `financial_entries`, `financial_transactions`.
**Solução Aplicada:** Adicionada coluna `parent_id`, refatorado RPC para atualizar o pai automaticamente e corrigida a polaridade das transações bancárias.
**Risco de Regressão:** Baixo.
**Testes Necessários:** Liquidar um adiantamento para fornecedor e ver se ele muda para "Liquidado".

---

### Template de Registro

```
## [DATA] — [MÓDULO] — [TÍTULO CURTO]

**Sintoma:** O que o usuário viu de errado
**Causa Raiz:** Por que aconteceu
**Tabelas Afetadas:** quais tabelas do Supabase
**Solução Aplicada:** O que foi feito para corrigir
**Risco de Regressão:** Que outras funcionalidades podem ser afetadas se mexer aqui
**Testes Necessários:** Lista de cenários para validar após mudanças
```

---

## Padrões de Bug Recorrentes

### Padrão 1: Cascade sem controle
Alterar uma tabela sem considerar os triggers associados.
**Prevenção:** Sempre rodar `SELECT * FROM information_schema.triggers WHERE event_object_table = 'nome_tabela'` antes de alterar.

### Padrão 2: Cálculo em dois lugares
Lógica de cálculo duplicada no frontend e em function SQL.
**Prevenção:** Centralizar cálculos em Supabase Functions/Views.

### Padrão 3: Status desincronizado
Pagar em módulo A mas status em módulo B não atualiza.
**Prevenção:** Usar `id_referencia` + `tipo_origem` em contas_pagar/receber para single source of truth.
