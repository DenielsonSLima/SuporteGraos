# 📊 Auditoria de Módulo: SalesOrder (Ordens de Venda)

**Status:** 🔴 VERMELHO (Crítico - Cálculos no Frontend)

## 🎯 Resumo Executivo
Diferente do módulo de compras, o módulo de Vendas ainda depende fortemente de cálculos aritméticos complexos realizados no navegador. Embora utilize uma view enriquecida, a inteligência de custo e receita real está dispersa em `reduce` functions dentro do JavaScript.

## ✅ O que está de acordo (Standards)
- **View Enriquecida:** O sistema já utiliza a `vw_sales_orders_enriched` como base, o que facilita a transição.
- **Cache de Infra:** O `salesLoader` possui um sistema eficiente de cache de endereços para evitar overfetching de tabelas de cidades/estados.

## ⚠️ Resíduos Identificados (A Mudar)
- **Cálculos de P&L no Frontend:** O arquivo `kpiService.ts` está calculando `totalGrainCost`, `totalFreightCost` e `totalRevenueRealized` iterando sobre a lista de `loadings`. 
    - *Risco:* Se um carregamento não for carregado no frontend por filtros de paginação, o cálculo do lucro bruto estará errado.
- **Lógica de Faturamento Manual:** A regra de que "somente faturamos o que foi descarregado" está codificada no JS (linha 65 do `kpiService`). Isso deveria ser uma regra de negócio do Banco de Dados.
- **Fallback Inconsistente:** O uso de `|| activeLoadings.reduce(...)` como fallback para colunas do banco indica falta de confiança nos dados persistidos ou desatualização dos gatilhos SQL.

## 🛠️ Plano de Ação Recomendado
1. **Centralização de Margem:** Mover o cálculo de Lucro Bruto e Margem para a View SQL ou para Triggers que atualizam a tabela `sales_orders` sempre que um `loading` é confirmado.
2. **Desativação de Reducers:** Eliminar os `reduce` do `kpiService.ts`. O componente deve apenas ler `order.revenueRealized` e `order.totalCost` vindos do banco.
3. **Data Integrity Audit:** Verificar por que as colunas calculadas do banco precisam de fallback no frontend e corrigir os gatilhos (triggers) que as alimentam.

---
*Auditoria realizada por: Frontend Pro & Senior Architect*
