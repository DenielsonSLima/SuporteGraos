# 📊 Auditoria de Módulo: Logistics (Carregamentos e Fretes)

**Status:** 🟡 AMARELO (Sólido, mas com dependência de Input)

## 🎯 Resumo Executivo
O módulo de Logística está bem posicionado para a Fase 3. O uso de RPCs para salvar e buscar KPIs indica uma mentalidade de "Database-First". No entanto, a base de cálculo dos valores do carregamento (especialmente o valor do frete e da compra) ainda é "confiada" ao que o frontend envia durante o persistir.

## ✅ O que está de acordo (Standards)
- **KPIs Atômicos:** O `logisticsKpiService.ts` é um modelo de perfeição arquitetônica, delegando toda a agregação (SUM/COUNT) para o PostgreSQL via RPC.
- **Segurança de Exclusão:** O "Xerifão" em `loadingService.ts` impede a deleção de fretes com pagamentos ativos, protegendo a integridade financeira.
- **RPC-First Persistence:** O serviço tenta usar o `rpc_ops_loading_upsert_v2` antes de recorrer ao fallback, mostrando que a infraestrutura SQL já está pronta.

## ⚠️ Resíduos Identificados (A Mudar)
- **Cálculo de Linha no Frontend:** O `persistLoading` recebe os totais (`total_freight_value`, etc.) já calculados. O ideal seria enviar apenas o `peso` e o `id_da_ordem`, deixando o banco consultar o `preco_unitario` e realizar a multiplicação.
- **Egress Ineficiente:** O `loadFromSupabase` baixa a lista completa de carregamentos (`from('ops_loadings')`). Em uma operação real com 1000+ fretes, isso causará lentidão e custos desnecessários.
- **Filtros no JS:** Os métodos `getByPurchaseOrder` e `getBySalesOrder` filtram no cliente usando `db.getAll().filter()`. Isso deve ser movido para filtros de query SQL (`.eq('purchase_order_id', id)`).

## 🛠️ Plano de Ação Recomendado
1. **Multiplicação In-DB:** Ajustar o RPC de persistência para calcular os valores financeiros no servidor com base nos contratos vinculados.
2. **Paginação Server-Side:** Implementar limites e paginação no `loadingPersistence.ts`.
3. **Filtros Nativos:** Refatorar as buscas por pedido para usar o `.select().eq()` do Supabase, evitando carregar dados de outros pedidos na memória.

---
*Auditoria realizada por: Backend Expert & Xerifão*
