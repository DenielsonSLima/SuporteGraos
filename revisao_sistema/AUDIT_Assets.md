# 📊 Auditoria de Módulo: Assets (Patrimônio e Ativos)

**Status:** 🟡 AMARELO (Funcional, mas com Cálculos no Frontend)

## 🎯 Resumo Executivo
O módulo de Patrimônio está bem organizado visualmente e segue o padrão de persistência modular. No entanto, ele ainda carrega uma carga pesada de processamento de dados no navegador. Os indicadores financeiros (KPIs) são calculados em tempo real através de hooks, o que contraria o padrão de "Single Source of Truth" no banco de dados.

## ✅ O que está de acordo (Standards)
- **Persistência Centralizada:** O uso da classe `Persistence` e o mapeamento claro entre DB e Frontend facilitam a manutenção.
- **Auditoria de Ação:** O `assetService.ts` registra logs detalhados de criação, venda e baixa patrimonial, garantindo rastreabilidade.
- **Comunicação Atômica para Deleção:** O uso do RPC `rpc_ops_asset_delete_v1` garante que a exclusão de um ativo siga as regras do banco.

## ⚠️ Resíduos Identificados (A Mudar)
- **KPIs Baseados em Hooks:** O hook `useAssetKPIs.ts` realiza diversos `.reduce()` para calcular o valor total do patrimônio e o saldo a receber. 
    - *Risco:* Se a lista de ativos crescer, a interface pode apresentar lentidão. Além disso, os cálculos dependem de carregar todos os `standaloneRecords` na memória.
- **Processamento de P&L no JS:** O cálculo de progresso de recebimento da venda de um ativo (`useAssetDetailStats`) é feito no cliente.
- **Inconsistência de Transação:** Atualmente, a venda de um ativo faz um `upsert` direto na tabela. O ideal seria um RPC que realizasse a venda e já criasse o título a receber no financeiro de forma atômica.

## 🛠️ Plano de Ação Recomendado
1. **Migração para RPCs de Dashboard:** Implementar o `rpc_asset_kpis(company_id)` conforme sugerido nos comentários do próprio código (TODO na linha 15 do hook).
2. **View Enriquecida:** Criar uma view `vw_assets_enriched` que já traga o `total_paid` e `balance_pending` de cada ativo, eliminando a necessidade de cruzar dados com `standaloneRecords` no frontend.
3. **Trigger de Logística/Financeiro:** Mover a lógica de transição de status (Ativo -> Vendido) para o banco de dados.

---
*Auditoria realizada por: Senior Architect & Xerifão*
