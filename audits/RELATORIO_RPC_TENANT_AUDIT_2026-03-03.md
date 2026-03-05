# Relatório de Auditoria RPC Tenant (Lote 4)

Data: 2026-03-03

## Escopo

- Funções `public.rpc_*` definidas nas migrations.
- Verificação heurística no último `CREATE OR REPLACE FUNCTION` por nome:
  - presença de `auth.uid()`
  - uso de helper de tenant (`my_company_id()`/`fn_ops_my_company_id()`)
  - presença de mensagem de bloqueio (`Access denied`/`Acesso negado`)

Arquivo base: `audits/rpc_tenant_inventory_20260303.csv`.

## Resultado executivo

- Total de RPCs auditadas: **30**.
- RPCs sem qualquer indício de validação (`auth` + helper ausentes): **0**.
- RPCs com `p_company_id` sem indício de validação: **0**.
- Situação geral: **sem gap crítico novo de cross-tenant** no inventário atual.

## Observações de risco residual (não crítico)

1. Parte das RPCs antigas valida via `auth.uid()` mas não necessariamente exige `app_users.active = true` em todos os fluxos.
2. RPCs `ops_*` dependem fortemente de `fn_ops_my_company_id()` para isolamento — o helper já foi hardenizado, mas qualquer regressão nele impacta várias funções.
3. O hardening de permissões agora está padronizado para `rpc_*`; manter revisão periódica após novas migrations.

## Ações já aplicadas antes deste lote

- Hardening de `my_company_id()` + políticas RLS de `app_users`.
- Hardening de permissões e `search_path` em RPCs críticas.
- Hardening global de `search_path` para `SECURITY DEFINER`.
- Padronização de grants para `public.rpc_*`.

## Recomendação próxima (opcional)

- Criar teste SQL automatizado (CI) que falhe se surgir `public.rpc_*` sem:
  - `REVOKE PUBLIC`,
  - `search_path` seguro,
  - e validação tenant/auth mínima.
