# Skill — Ajuste Financeiro de Carregamentos (Compra/Venda)

## Contexto observado
- Ao adicionar mais de um carregamento em um Pedido de Compra, o Financeiro (`Contas a Pagar`) mostrava a quantidade de cargas, mas o valor total do título não refletia a soma correta das cargas.
- Em Pedido de Venda, cargas sem `peso de descarregamento` (apenas em trânsito) estavam aparecendo no financeiro como `Contas a Receber`, o que viola a regra operacional.

## Regra de negócio validada
- **Compra (`purchase_order`)**: o valor a pagar deve ser a **soma das cargas ativas** vinculadas ao pedido.
- **Venda (`sales_order`)**: só existe conta a receber quando há **entrega efetiva** (`unload_weight_kg > 0`).
- Carga sem descarga continua em **mercadoria em trânsito** e **não gera recebível**.

## Ajustes implementados

### 1) Camada SQL canônica (fonte da verdade)
Arquivo: `supabase/migrations/20260304_fix_loading_financial_rules.sql`

- Reescrita de `rpc_ops_purchase_rebuild_financial_v1`:
  - Passa a calcular `total_amount` por soma de `ops_loadings.total_purchase_value` (cargas não canceladas).
  - Fallback para `ops_purchase_orders.total_value` quando não há carga ativa.

- Novo trigger em `ops_loadings` (compra):
  - `trg_ops_loadings_sync_purchase_payable_v1` (AFTER INSERT/UPDATE/DELETE).
  - Recalcula automaticamente o payable de compra quando qualquer carga muda.

- Reescrita de `rpc_ops_sales_rebuild_financial_v1`:
  - Recebível considera apenas cargas com `unload_weight_kg > 0` e não canceladas.
  - Quando total entregue é zero:
    - remove o `financial_entry` se não houver recebimento;
    - evita manter título aberto indevido.

- Novo trigger em `ops_loadings` (venda):
  - `trg_ops_loadings_sync_sales_receivable_v1` (AFTER INSERT/UPDATE/DELETE).
  - Recalcula automaticamente o receivable de venda quando qualquer carga muda.
  - Garante que ao adicionar/editar/remover um peso de descarregamento, o recebível
    seja criado, atualizado ou removido em tempo real.

- Recriação da view `vw_receivables_enriched` (DROP + CREATE):
  - **Corrige duplicação**: a view anterior fazia LEFT JOIN 1:N com `ops_loadings`,
    gerando uma linha por carga em vez de uma linha consolidada por pedido de venda.
  - Agora usa `LEFT JOIN LATERAL` com agregação (SUM), retornando **1 linha por pedido**.
  - Usa peso de **descarregamento** para peso/valor entregues.
  - JOIN com `ops_sales_orders` compatível com `canonical_id` e `legacy_id`.

- Data cleanup (idempotente):
  - Remove receivables com `total_amount = 0` e sem recebimento.
  - Remove duplicatas: se existem múltiplas entries para o mesmo `origin_id`, mantém apenas a mais recente.

### 2) Camada TypeScript (fallback/legado)
- `services/loading/loadingPayableSync.ts`
  - Consolidação de payable de compra ignora cargas `canceled/cancelled`.

- `services/loading/loadingReceivableSync.ts`
  - Sincronização roda por `salesOrderId` e remove recebível quando não há descarga e não há valor recebido.

- `services/loadingService.ts`
  - Em modo não-canônico, passa a sincronizar recebível sempre que houver vínculo com venda (permitindo limpeza correta de recebível indevido).

## Resultado esperado
- Em `Contas a Pagar` de compra, o título acompanha a soma real das cargas ativas.
- Cargas sem descarregamento não geram `Contas a Receber`.
- Essas cargas permanecem somente em `Mercadoria em Trânsito`.

## Observação de implantação
- Para produção, aplicar a migration SQL:
  - `supabase/migrations/20260304_fix_loading_financial_rules.sql`
- Após aplicar, recarregar dados financeiros/realtime no app para refletir o novo comportamento.
