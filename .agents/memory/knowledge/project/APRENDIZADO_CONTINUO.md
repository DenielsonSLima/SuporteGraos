# 🧠 APRENDIZADO CONTÍNUO (MULTI-AGENT LOOP)

Este documento registra o conhecimento evolutivo do time de agentes. Cada lição aprendida evita a repetição de erros passados.

## 🏁 Ciclo de Aprendizado (Exemplo)
1. **Erro detectado** (Sheriff/Usuário)
2. **Correção aplicada** (Backend/Frontend)
3. **Análise de Causa Raiz** (Paulo Senior)
4. **Registro aqui para memória futura** (Time)

## ⚖️ LEIS DO TIME (MANDATÓRIO)

1.  **Cálculo é no Banco**: O Frontend é burro para matemática. RPCs e Triggers são os cérebros.
2.  **TanStack + Realtime**: Toda tela deve ser reativa. Mudou no banco, muda na tela sem F5.
3.  **Trava de Botão**: Nenhuma submissão sem `isSubmitting`.
4.  **Cuidado Financeiro**: Mexer no financeiro é cirúrgico. O Xerifão audita tudo.

---

## 🛡️ Checklist de Regressão (Xerifão)
- [ ] **Interface**: Adicionar `isSubmitting` em TODA submissão de formulário.
- [ ] **TanStack Query**: `await refreshData()` antes de fechar modais.
- [ ] **Database**: Cálculos complexos via RPC.
- [ ] **Auth**: Sempre usar o ID interno `app_users.id`.

## 📖 Lições Aprendidas

### 2026-03-26 — Sincronização e Concorrência
- **Contexto**: Cliques múltiplos geravam duplicidade e o "Stale Data" causava a percepção de erro.
- **Lição**: Invalidação de cache deve ser ASSÍNCRONA (`await`). Botões de submissão DEVEM ter estado de carregamento.
- **Impacto**: Redução de 100% em duplicidade de transações financeiras.

### 2026-03-26 — IDs de Usuário (Auth vs App)
- **Contexto**: Erros de Chave Estrangeira em `financial_transactions`.
- **Lição**: A tabela de usuários tem ID próprio. O ID do Supabase Auth deve ser convertido via `authService` antes de gravar no banco.

---
*Assinado: Time Multi-Agente (Paulo, Backend, Frontend, Xerifão)*

### 2026-05-20 — Financial Realtime Hub (Multi-Computador)
- **Contexto**: Ao apagar transferência no PC A, PC B não atualizava sem F5.
- **Causa Raiz**: Cada submódulo financeiro (transfers, accounts, caixa, etc.) abria seu próprio canal WebSocket escutando APENAS sua tabela. Eventos cross-table (ex: trigger atualiza accounts.balance após deletar transfer) eram perdidos por throttle do Supabase.
- **Solução**: `financialRealtimeHub.ts` — 1 canal WebSocket escutando 9 tabelas financeiras + `useFinancialRealtime()` hook que invalida ~19 query keys. Substituiu ~25 canais fragmentados.
- **Lição**: NUNCA criar canais individuais por submódulo. Usar o hub centralizado.
- **Arquivos-Chave**: `services/financialRealtimeHub.ts`, `hooks/useFinancialRealtime.ts`

### 2026-05-20 — Isolamento de Submódulos Financeiros (Créditos vs Despesas)
- **Contexto**: Crédito lançado aparecia na tela de Despesas + exclusão exigia 3 cliques.
- **Causa Raiz 1**: Filtro PostgREST com sintaxe errada: `.not('status', 'in', '("cancelled", "reversed")')` — aspas duplas dentro dos parênteses quebravam o filtro. Formato correto: `'(cancelled,reversed)'`.
- **Causa Raiz 2**: `creditService.remove()` retornava `false` quando estorno de transações falhava, impedindo limpeza do cache local. Usuário precisava clicar 3x.
- **Solução**: Corrigir sintaxe do filtro + sempre limpar cache local independente do estorno + `isLoaded = false` para forçar reload.
- **Lição**: SEMPRE validar a sintaxe de filtros PostgREST. O `.not('col', 'in', '(val1,val2)')` não aceita aspas ou espaços internos.
- **Regra de Isolamento**: Créditos = `financial_entries` com `origin_type='credit'`. Despesas = `admin_expenses` (tabela separada). Contas a Pagar/Receber = `financial_entries` com `origin_type` de pedido/logística. NUNCA misturar.

