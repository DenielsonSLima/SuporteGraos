# Common Errors and Pitfalls — Suporte Grãos ERP

## Financeiro
- **UUID vs Name**: Não enviar nome onde se espera UUID (ex: `account_id`).
- **Category vs Subcategory**: Mapear sempre para o ID da categoria pai ao salvar despesas.
- **RPC Admin Expense**: Sempre criar `financial_entries` mesmo sem parceiro.
- **Adapter remainingValue**: O modal de pagamento depende do `remainingValue` populado pelo adapter.
- **Status `reversed`**: Estornos devem referenciar o `entry_id` pai.

## UI/UX
- **Modal sem Portal**: Nunca renderizar modais fora do `ModalPortal`.

## Infraestrutura
- **Acesso ao Supabase**: Use o MCP, nunca peça ao usuário para rodar SQL.
- **Race Conditions**: Operações críticas de estorno devem ser `await` e ter feedback visual.
