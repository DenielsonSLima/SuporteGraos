# 🧠 Aprendizado: Beto Backend

## 📅 30/03/2026 - Configuração Inicial
- **O que aprendi:** Organização de scripts de migração por "batch" ajuda o Xerifão a validar mais rápido.
- **Dica DB:** Sempre verificar RLS ao criar novas tabelas de equipe.

### 📅 30/03/2026 - Integração Front-RPC (Datas)
- **Desafio:** Validar se a RPC de KPIs suportava filtros vazios para visão histórica total.
- **Lição:** A função `rpc_logistics_kpi_totals` está preparada para lidar com parâmetros nulos/vazios, tratando-os como "sem limite". Isso permitiu que o Vini implementasse o "Limpar Filtros" no frontend apenas limpando as strings de data, sem precisar de lógica extra no backend.
- **Arquivo:** `services/logisticsKpiService.ts` e RPC PostgreSQL.
- **Próximo Passo:** Revisar os RPCs de recalculo de frete.
