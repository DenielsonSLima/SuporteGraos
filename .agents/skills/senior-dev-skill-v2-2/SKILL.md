---
name: senior-dev-standards-v3-rag
description: >
  REGRA DE OURO DA EMPRESA (V3). Este skill define os padrões absolutos de engenharia.
  Opera via RAG buscando padrões técnicos, ADRs e exemplos em `.agents/memory/knowledge/senior-dev/`.
---

# 📘 Padrões de Engenharia Sênior — RAG Advanced (V3)

> **ESTE SKILL É LEI.** Nenhum código entra em produção sem respeitar estas regras.

---

## 🔍 PROTOCOLO DE RECUPERAÇÃO (RAG Search)

Sempre que a tarefa envolver criação, revisão ou refatoração de código, execute:
1. **Busca RAG**: Pesquise termos técnicos em `.agents/memory/knowledge/senior-dev/`.
2. **Contexto**: Leia os capítulos relevantes.
3. **ADRs**: Busque em `senior-dev/adr/` para entender decisões arquiteturais passadas.
4. **Exemplos**: Busque em `senior-dev/examples/` para ver implementações de referência (Hooks, Services, Components).
5. **Checklist**: Antes de entregar, SEMPRE execute o KI `15-checklist-final.md`.

---

## ⚡ As 10 Regras de Ouro (Ground Truth)

| Regra | Descrição |
|---|---|
| 1 | Componentes NUNCA fazem chamadas de API diretas — use Services. |
| 2 | `service_role` key NUNCA no frontend — apenas em Edge Functions. |
| 3 | Toda tabela de dados de cliente TEM `organization_id`. |
| 4 | RLS SEMPRE habilitada em tabelas multi-empresa. |
| 5 | Lógica financeira crítica SEMPRE no banco (RPCs/Triggers). |
| 6 | Validação com Zod SEMPRE na entrada de Edge Functions. |
| 7 | Paginação SEMPRE — nunca retornar listas sem limite. |
| 8 | Erros SEMPRE tratados com mensagem amigável ao usuário. |
| 9 | Realtime APENAS onde a UX exige — não em todas as tabelas. |
| 10 | DRY — se repetiu 2x, extraia para função/hook/service. |
| 11 | Segurança Financeira — Features de cálculo crítico exigem auditoria de QA (Xerifão). |
| 12 | SQL-First Financial Integrity — Lógica de baixa, saldo e estorno SEMPRE via RPC atômico. No-Redux/No-Local-Sync. |

---

## 🏦 ARQUITETURA SQL-FIRST (Mandato Financeiro)

Para evitar inconsistências de saldo e condições de corrida entre módulos (Caixa, Pedidos, Logística), seguimos o padrão **SQL-First**:

### ✅ O QUE FAZER (The Right Way)
1. **Intenção no Frontend**: O React apenas envia os IDs e valores para um RPC (ex: `rpc_ops_financial_process_action`).
2. **Atomicidade no Banco**: O Postgres cuida de atualizar Pedido, Financeiro, Histórico e Saldo Bancário em uma única transação (`BEGIN...COMMIT`).
3. **Reatividade via Triggers**: Status de títulos (Pago, Parcial, Pendente) são calculados por Triggers no banco, nunca no frontend.
4. **Interface como View**: O frontend apenas exibe os dados que o banco retorna. Se precisar atualizar a tela, use a invalidação de cache do TanStack Query.

### ❌ O QUE NÃO FAZER (Anti-Patterns)
1. **Saldos via .reduce()**: Nunca calcule o "Valor Total Pago" somando transações no frontend. Use o campo `paid_amount` da tabela `financial_entries`.
2. **Orquestração Manual**: Nunca faça `await serviceA.update(); await serviceB.update();` para operações que deveriam ser síncronas entre tabelas.
3. **Sincronização de 'Cola'**: Evite services que apenas 'copiam' dados de um módulo para outro no React. Use Views SQL para consolidar dados.

## 🏎️ PROTOCOLO DE EXECUÇÃO (Economia de Tokens)

Para otimizar o consumo e a velocidade, siga esta lógica de decisão:

1. **Ajustes de UI / Bugs Simples / Typos**: Execução direta sem Multi-Agente (MAS).
2. **Features Novas**: Use apenas a Skill/Agente mais relevante para o contexto.
3. **Cálculos Financeiros (Mesmo em Features Novas)**: Requer auditoria do "Xerifão" (QA).
4. **Refatorações Estruturais / Mudanças de Dados**: MAS Completo (Arquitetura + Backend + Frontend + QA).

---

## 📂 Ativos Disponíveis (Consulte via RAG)
- **Capítulos**: Fundamentos de arquitetura, frontend, backend e SQL.
- **ADRs**: Registros de decisões (ex: Supabase vs Firebase, Multitenancy).
- **Examples**: Implementações reais de `ClienteCard`, `ClienteService`, etc.
