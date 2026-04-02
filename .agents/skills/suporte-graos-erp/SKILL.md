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

## 📂 Módulos e Documentação (Consulte via RAG)
O detalhamento de cada módulo e as regras de negócio foram movidos para a memória evolutiva. Use o **Protocolo de Recuperação** acima para acessar:
- `overview.md`: Visão geral e fluxo central do negócio.
- `logistics.md`: Regras de frete, carregamentos e romaneios.
- `finance.md`: Gestão financeira, adiantamentos e baixas.
- `supabase_ui.md`: Estrutura do banco de dados e padrões de interface (ModalPortal).
- `known_bugs.md`: Histórico de correções e armadilhas a evitar.
- `performance_caixa.md`: KPIs, fórmulas e visão patrimonial.
