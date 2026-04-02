# Log de Testes e Correções — ERP Grãos

Este arquivo registra o detalhamento técnico de cada teste realizado, incluindo logs de sucesso e erro.

---

## 📅 18/03/2026

### Início da Revisão Pós-Reset
- **Objetivo**: Validar a integridade de todos os módulos após a limpeza da base de dados.
- **Estado Inicial**: Banco de dados zerado (exceto parceiros e configs).

### ❌ Módulo 1: Parceiros — Erro no Cadastro
- **Erro**: "Não foi possível salvar os dados do parceiro" ao tentar cadastrar novo parceiro.
- **Causa Raiz**: A RPC `save_partner_complete` realizava um `ON CONFLICT` na tabela `parceiros_enderecos` exigindo um índice único parcial que não existia no banco.
- **Correção**: Criado o índice único `idx_parceiros_enderecos_partner_primary` (filtrado por `is_primary = true`).
- **Módulo**: Pedido de Venda / Financeiro
  - **Erro**: Pedido de venda inflando Patrimônio e aparecendo no Financeiro sem ter carga descarregada.
  - **Causa**: Fallback na RPC `rpc_ops_sales_rebuild_financial_v1` que usava o valor contratual total.
  - **Correção**: Removido fallback e adicionada regra para deletar entry financeira se saldo e pagamentos forem zero.
### ✅ Módulo 1: Parceiros — Atualização Automática
- **Problema**: A listagem de parceiros não atualizava sozinha após o cadastro (exigia F5).
- **Causa Raiz**: O componente `PartnersPage` tentava acessar o `queryClient` de forma incorreta (via `window`), o que falhava silenciosamente e impedia a invalidação do cache do TanStack Query.
- **Correção**: Refatorado o componente para utilizar o hook padrão `useQueryClient` e a constante centralizada `QUERY_KEYS.PARTNERS`.
- **Status**: Corrigido.

---
