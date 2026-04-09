---
name: suporte-graos-erp-rag
description: >
  Skill especializada para o sistema ERP Grãos (suportegraoserp.vercel.app).
  Opera via RAG buscando contexto em `.agents/memory/knowledge/suporte-graos/`.
---

# Suporte Grãos ERP — Skill de Desenvolvimento RAG

## 🔍 PROTOCOLO DE RECUPERAÇÃO (RAG Search)

Sempre que a tarefa envolver o ERP Grãos, execute:
1. **Busca**: Pesquise termos da tarefa em `.agents/memory/knowledge/suporte-graos/`.
2. **Contexto**: Leia os KIs relevantes encontrados (ex: `finance`, `logistics`, `overview`).
3. **Execução**: Aplique as regras de negócio recuperadas.

## 🚀 Proatividade com Ferramentas
- O agente tem acesso total ao `supabase-mcp-server`.
- **PROATIVIDADE OBRIGATÓRIA:** Realize consultas SQL e migrações via MCP sem pedir permissão.

---

## 💎 PADRÃO FINANCEIRO MODULAR (SQL-First)

Para mantermos o ERP Grãos livre de erros de saldo, siga estritamente este fluxo:

1. **Baixas de Títulos**: Use sempre o RPC `rpc_ops_financial_process_action`. NUNCA atualize o campo `paid_value` manualmente no frontend.
2. **Estornos**: Use `rpc_ops_financial_void_transaction` para deletar transações bancárias. Isso ativará os triggers de banco que restauram o saldo e o status do título original automaticamente.
3. **Logística**: Despesas de motorista (extras/abatimentos) devem ser enviadas via `rpc_ops_loading_manage_expense`.
4. **Sincronização de Histórico**: O frontend deve injetar apenas o histórico leve via `registerFinancialRecords`, marcando a transação como canônica para evitar duplicidade no ledger bancário.
5. **Estado Global**: Após qualquer operação financeira, invalide os caches do TanStack Query (`LOADINGS`, `FINANCIAL_TRANSACTIONS`, `ACCOUNTS`).

---

## 📂 Módulos e Documentação (Consulte via RAG)
O detalhamento de cada módulo e as regras de negócio foram movidos para a memória evolutiva. Use o **Protocolo de Recuperação** acima para acessar:
- `overview.md`: Visão geral e fluxo central do negócio.
- `logistics.md`: Regras de frete, carregamentos e romaneios.
- `finance.md`: Gestão financeira, adiantamentos e baixas.
- `supabase_ui.md`: Estrutura do banco de dados e padrões de interface (ModalPortal).
- `known_bugs.md`: Histórico de correções e armadilhas a evitar.
- `performance_caixa.md`: KPIs, fórmulas e visão patrimonial.
