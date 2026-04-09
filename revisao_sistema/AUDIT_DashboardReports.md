# 📊 Auditoria de Módulo: Dashboard & Reports

**Status:** 🟡 AMARELO (Dashboard Ouro / Reports Legado)

## 🎯 Resumo Executivo
Existe um contraste claro entre o Dashboard (extremamente otimizado) e o módulo de Relatórios. Enquanto o Dashboard funciona 100% no banco de dados via RPCs, o módulo de Relatórios ainda segue a estratégia "baixa tudo e filtra no JS", o que compromete a escalabilidade do sistema conforme o volume de dados cresce.

## ✅ O que está de acordo (Standards)
- **Dashboard SQL-First:** O `dashboardService.ts` utiliza o `rpc_dashboard_data`, que é a implementação ideal para a Fase 3. Ele traz indicadores operacionais, financeiros e histórico de patrimônio líquido em um único roundtrip.
- **Realtime Otimizado:** O uso de um Singleton Channel para ouvir mudanças em múltiplas tabelas com debounce de 500ms é uma solução de engenharia de alto nível.
- **Resiliência:** Tratamento de erros de rede e timeouts integrados à busca de indicadores críticos.

## ⚠️ Resíduos Identificados (A Mudar)
- **Egress Elevado em Relatórios:** O `reportsCache.ts` carrega listas completas (ex: `purchaseService.loadFromSupabase()`) para gerar relatórios. 
    - *Risco:* Um cliente com 2 anos de dados terá que baixar milhares de linhas de pedidos apenas para ver um gráfico de "Vendas por Mês".
- **Filtros no Navegador:** Grande parte da inteligência de filtragem por período ou categoria de relatório ainda ocorre no cliente, baseada em dados cacheados na memória.
- **Inconsistência de Cache:** O `reportsCache` tem um TTL fixo de 45s, mas não possui uma invalidação inteligente baseada no que foi realmente alterado, podendo exibir dados obsoletos por quase um minuto.

## 🛠️ Plano de Ação Recomendado
1. **Padronização via RPC:** Migrar cada tipo de relatório (Vendas por Parceiro, Compras por Safra, etc.) para RPCs específicas, seguindo o modelo do `rpc_cashier_report`.
2. **Filtros Server-Side:** Enviar parâmetros de data e categoria diretamente na query/RPC para que o Supabase retorne apenas o conjunto de dados necessário.
3. **Desativação do ReportsCache:** Uma vez que os relatórios sejam migrados para SQL, o cache pesado em memória poderá ser removido, economizando RAM no navegador do usuário.

---
*Auditoria realizada por: Senior Architect & Frontend Pro*
