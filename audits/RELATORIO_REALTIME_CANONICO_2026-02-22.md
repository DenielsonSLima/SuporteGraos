# Relatório de Auditoria — Realtime x Canônico

Data: 2026-02-22

## 1) Objetivo

Validar aderência entre:
- Regras das skills (arquitetura, SQL-first, realtime e transferências)
- Tabelas existentes no Supabase (schema `public`)
- Publicação `supabase_realtime`
- Tabelas assinadas no código (`postgres_changes`)

## 2) Skills revisadas

Arquivos revisados:
- `.agents/skills/dois/SKILL.md`
- `.agents/skills/money/SKILL.md`
- `.agents/skills/realtime/SKILL.md`
- `.agents/skills/regra/SKILL.md`
- `.agents/skills/transferencias/SKILL.md`

Diretrizes-chave aplicadas:
- SQL-first/canônico como fonte de verdade
- Realtime somente onde necessário
- Filtro por empresa (`company_id`) quando aplicável
- Evitar dependência de tabelas legadas inexistentes

## 3) Inventário coletado

Arquivos gerados:
- `audits/realtime_status_public_tables.txt` (status realtime de tabelas públicas)
- `audits/realtime_tables_in_code.txt` (tabelas referenciadas em subscriptions no código)
- `audits/realtime_code_crosscheck.txt` (cruzamento código x banco)
- `audits/realtime_missing_tables.txt` (tabelas referenciadas no código mas ausentes no banco)
- `audits/realtime_missing_refs.txt` (referências por arquivo/linha)

## 4) Resultado da auditoria (antes da ativação)

- Tabelas públicas encontradas: 35
- Ativas em realtime: 30
- Inativas em realtime: 5

Inativas detectadas inicialmente:
- `ops_loading_freight_components`
- `ops_purchase_order_commissions`
- `ops_purchase_order_expenses`
- `ops_purchase_order_items`
- `ops_sales_order_unloads`

## 5) Ação executada

Foi executado SQL para adicionar ao `supabase_realtime`:
- As 5 tabelas `ops_*` inativas
- E também tentativa para tabelas faltantes citadas no código

Resultado do comando:
- `ALREADY_ACTIVE` para as 5 `ops_*` (ou seja, já estavam no publication no momento da execução final)
- `SKIPPED_NOT_FOUND` para tabelas que não existem no `public` deste banco (nomes legados)

Tabelas retornadas como `SKIPPED_NOT_FOUND`:
- `assets`
- `audit_logs`
- `cashier_monthly_snapshots`
- `credits`
- `drivers`
- `financial_transactions_v2`
- `login_history`
- `login_rotation_config`
- `login_screens`
- `logistics_loadings`
- `partner_addresses`
- `partners`
- `payables`
- `purchase_orders`
- `receivables`
- `report_access_logs`
- `sales_orders`
- `standalone_receipts`
- `standalone_records`
- `transporters`
- `user_sessions`
- `vehicles`

## 6) Estado final (após ativação)

- Tabelas públicas: 35
- Ativas em realtime: 35
- Inativas em realtime: 0

Conclusão técnica:
- Não existe mais tabela pública do banco sem realtime ativo.
- As divergências restantes estão no código (referências legadas para tabelas inexistentes neste schema), não na publicação do Supabase.

## 7) Interpretação canônica

As tabelas ausentes no banco, mas referenciadas no código, pertencem majoritariamente ao modelo legado pré-canônico.
No modo canônico, essas referências devem ser removidas/isoladas para evitar ruído e caminhos mortos.

## 8) Próximos passos recomendados

1. Limpar referências de realtime para tabelas legadas ausentes (`audits/realtime_missing_refs.txt`).
2. Manter subscriptions apenas em tabelas canônicas existentes.
3. Revisar serviços legados sem guarda canônica para evitar chamadas de tabela inexistente.
4. Manter este relatório como baseline para validações futuras.

## 9) Evidências

- Ver status final por tabela: `audits/realtime_status_public_tables.txt`
- Ver cruzamento código x banco: `audits/realtime_code_crosscheck.txt`
- Ver mapeamento de referências legadas por arquivo: `audits/realtime_missing_refs.txt`

## 10) Limpeza aplicada no código (2026-02-22)

Objetivo: impedir chamadas/realtime para tabelas legadas inexistentes quando modo canônico está ativo.

Arquivo novo:
- `services/realtimeTableAvailability.ts`
	- Lista oficial local de tabelas legadas ausentes no schema atual.
	- Função `shouldSkipLegacyTableOps(table)` para bloquear operações legadas no modo canônico.

Arquivos ajustados:
- `services/financial/payablesService.ts`
	- Guardas em `fetchPage`, `loadFromSupabase`, `startRealtime`, `persistUpsert`, `persistDelete`.
- `services/financial/receivablesService.ts`
	- Guardas em `fetchPage`, `loadFromSupabase`, `startRealtime`, `persistUpsert`, `persistDelete`.
- `services/financial/creditService.ts`
	- Guardas em `startRealtime`, `loadFromSupabase`, `create`, `update`, `remove`, `subscribe`.
- `services/financial/receiptService.ts`
	- Guardas em `initialize`, `loadFromSupabase`, `setupRealtime`, `add`, `update`, `delete`.

Resultado esperado da limpeza:
- Redução de erros 404/400 e tentativas de subscribe em tabelas inexistentes.
- Preservação do fluxo canônico como caminho principal.

## 11) Plano de teste ponta a ponta (manual)

### 11.1 Smoke (inicialização)
1. Login em empresa com dados reais.
2. Abrir Console e validar ausência de erros de tabela inexistente (partners/purchase_orders/sales_orders/payables/receivables/user_sessions etc).
3. Navegar por módulos principais e confirmar carregamento sem erros bloqueantes.

### 11.2 Financeiro canônico
1. Criar transferência entre contas.
2. Validar atualização automática em:
	 - Caixa (mês atual)
	 - Histórico Geral
	 - Saldos de contas
3. Editar transferência e repetir validação.
4. Excluir transferência e validar reversão correta em Caixa e Histórico.

### 11.3 Compras/Vendas
1. Criar pedido de compra.
2. Criar pedido de venda.
3. Confirmar ausência de chamadas para tabelas legadas inexistentes no Console.
4. Validar atualização de telas via eventos/realtime nas tabelas canônicas.

### 11.4 Parceiros/Logística
1. Abrir módulo Parceiros e Logística.
2. Verificar que não há erro de websocket de tabelas antigas.
3. Validar que listagens continuam carregando dados canônicos.

### 11.5 Realtime no banco
1. Confirmar inventário final em `audits/realtime_status_public_tables.txt`.
2. Confirmar que `inactive=0`.

