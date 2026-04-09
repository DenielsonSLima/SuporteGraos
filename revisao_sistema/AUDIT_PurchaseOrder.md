# 📊 Auditoria de Módulo: PurchaseOrder (Ordens de Compra)

**Status:** 🟡 AMARELO (Em Transição)

## 🎯 Resumo Executivo
O módulo de Ordens de Compra está em um estado híbrido avançado. Ele já consome uma View SQL enriquecida (`vw_purchase_orders_enriched`), mas ainda mantém uma dependência forte do campo `metadata` (JSONB) para regras de negócio e possui cálculos redundantes no TypeScript.

## ✅ O que está de acordo (Standards)
- **Data Enrichment:** O `loader.ts` já utiliza a view `vw_purchase_orders_enriched`, que traz campos calculados como `total_kg`, `total_sc`, e `total_purchase_val_calc` diretamente do banco.
- **Mapeamento Robusto:** O `mapOrderFromOpsRow` está bem estruturado para converter os dados do banco para o domínio do sistema.
- **Manual Control:** A lógica de fechamento de ordens foi recentemente protegida com travas que impedem a finalização com saldo devedor.

## ⚠️ Resíduos Identificados (A Mudar)
- **Cálculos Redundantes:** O `kpiService.ts` (função `calculateOrderStats`) ainda realiza subtrações manuais para encontrar o saldo (`balancePartner`), mesmo quando o banco já fornece o `balance_value`. Isso gera risco de "drift" (divergência) entre a UI e o Banco.
- **Dependência de JSONB:** Campos como `consultantName`, `harvest`, e `loadingCity` ainda são lidos exclusivamente do `metadata`. Isso impede que relatórios SQL puros acessem essas informações de forma performática.
- **Granularidade de Status:** No mapeamento para o banco, os estados 'draft', 'pending' e 'approved' são todos salvos como 'pending'. Isso apaga o histórico de aprovação no nível do banco de dados.

## 🛠️ Plano de Ação Recomendado
1. **Unificação de Cálculos:** Refatorar o `kpiService.ts` para usar estritamente os campos `totalPurchaseValCalc`, `paidValue` e `balanceValue` vindos da view, eliminando as operações aritméticas no JavaScript.
2. **Promoção de Colunas:** Mover campos críticos de dentro do `metadata` para colunas reais na tabela `ops_purchase_orders` (especialmente `harvest` e `consultant_id`).
3. **Refino de Status:** Ajustar o `statusToDb` para persistir o estado `approved` de forma distinta, permitindo auditorias de conformidade mais precisas.

---
*Auditoria realizada por: Frontend Pro & Senior Architect*
