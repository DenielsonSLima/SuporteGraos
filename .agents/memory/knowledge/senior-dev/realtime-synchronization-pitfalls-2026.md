# 🧠 Memória Arquitetural: Sincronização e Realtime (Purchase Order)

## 📌 Contexto
Durante a migração para a arquitetura modular em Abril de 2026, identificamos um erro crítico de **Recurso de Stack (Infinite Recursion)** e falhas de sincronização entre o Dashboard e o módulo de Pedido de Compra.

## ⚠️ PITFALLS (Armadilhas Identificadas)

### 1. Loop Circular no Cleanup de Realtime
Em `services/[modulo]/realtime.ts`, a função `stopRealtime` **NÃO DEVE** ser chamada recursivamente ou referenciada dentro de callbacks que ela mesma tenta limpar sem controle de estado.
**Solução:** Usar um array `activeChannels` para rastrear conexões abertas e limpá-las iterativamente, limpando as referências globais logo em seguida.

### 2. Sincronização via Tabela de Vínculos (`financial_links`)
Apenas ouvir a tabela principal (`ops_purchase_orders`) **NÃO É SUFICIENTE** se o que muda é um pagamento. 
**Regra:** Sempre adicione um listener para a tabela `financial_links` filtrando pelo `purchase_order_id` (ou id equivalente) para garantir que a UI reflita novos pagamentos instantaneamente.

### 3. Fallback de KPIs (List vs. Details)
A listagem (Dashboard/List View) geralmente traz metadados leves (sem o array completo de transações). O `kpiService` deve ser resiliente a isso.
**Regra:** Se o array de transações injetado no objeto for vazio (como ocorre no `mapOrderFromDb`), o sistema **deve obrigatoriamente** realizar o fallback para as colunas de valor calculado do banco (`paid_value`, `total_value`).

## 🛠️ Padrão de Invalidação TanStack Query
Sempre invalidar os seguintes Query Keys em cascata para qualquer alteração financeira no Pedido de Compra:
- `PURCHASE_ORDERS` (Lista principal)
- `FINANCIAL_TRANSACTIONS` (Fluxo de caixa)
- `purchase_order_transactions` (Lista de pagamentos no detalhe)
- `['totals']` (Cards do dashboard)

---
*Assinado pelos Agentes: Paulo (Arquiteto), Backend Expert, Frontend React Pro e Xerifão (QA).*
