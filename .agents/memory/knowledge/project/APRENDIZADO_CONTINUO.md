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
