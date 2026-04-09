# 🏛️ Auditoria Geral de Arquitetura: Suporte Grãos ERP

Este documento consolida a análise de integridade sistêmica e maturidade arquitetônica (Fase 3) realizada em Abril de 2026.

## 📈 Scorecard de Maturidade por Módulo

| Módulo | Status | Maturity Level | Observação Principal |
| :--- | :---: | :---: | :--- |
| **Financial (Core)** | ✅ | 5/5 | 100% RPC-Driven e Atômico. |
| **Cashier (Caixa)** | ✅ | 5/5 | Padrão Ouro de deleção de complexidade para SQL. |
| **Logistics** | 🟡 | 4/5 | KPIs excelentes, mas persistência ainda confia em input JS. |
| **Dashboard** | ✅ | 5/5 | Perfeita integração com TanStack Query e RPCs. |
| **PurchaseOrder** | 🟡 | 3/5 | Resíduos de cálculo manual no KPI Service. |
| **Partners** | 🟡 | 3/5 | Falta de atomicidade no salvamento de endereços. |
| **Assets** | 🟡 | 3/5 | KPIs calculados em Hooks (Frontend-heavy). |
| **Reports** | 🟡 | 2/5 | Modelo de cache "baixa tudo" insustentável a longo prazo. |
| **Settings & Auth** | 🟡 | 3/5 | Dependência excessiva de localStorage para preferências. |
| **SalesOrder** | 🔴 | 1/5 | Cálculos críticos de P&L ainda ocorrem via .reduce() no JS. |

---

## 🎯 Conclusão Executiva

O sistema **Suporte Grãos ERP** evoluiu drasticamente para um modelo "SQL-First" nos módulos centrais (Financeiro e Caixa), o que garante a estabilidade dos saldos bancários e a integridade dos títulos. 

No entanto, o módulo de **Vendas (SalesOrder)** e os **Relatórios** ainda apresentam comportamento de "Fase 1/2", onde o navegador carrega grandes volumes de dados para realizar cálculos aritméticos. Isso gera dois problemas imediatos:
1. **Risco de Divergência:** Os valores vistos pelo usuário no Dashboard (SQL) podem ser diferentes dos vistos na listagem de Vendas (JS).
2. **Custo de Infra:** O custo de saída de dados (Egress) do Supabase será proporcionalmente opressivo conforme a empresa crescer.

## 🛠️ Próximos Passos Prioritários

1. **Blindagem de Vendas:** Migrar a lógica de `totalGrainCost` e `totalRevenue` do `kpiService.ts` para Triggers ou Views enriquecidas no PostgreSQL.
2. **Atomicidade de Parceiros:** Criar RPC única para salvamento de endereços, eliminando os múltiplos roundtrips atuais.
3. **Desativação de Fallbacks:** Remover os blocos `if (!isSqlCanonicalEnabled)` e consolidar os serviços no modo Canônico (SQL).

---
*Relatório finalizado pela equipe de Agentes Pro - 09/04/2026*
