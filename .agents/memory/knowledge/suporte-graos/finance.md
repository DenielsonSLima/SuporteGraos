# Gestão Financeira — Suporte Grãos ERP

## Contas a Pagar
- **Origens**: Produtor, Frete, Comissão, Despesa manual.
- **Vínculo**: Sempre verificar `id_referencia` e `tipo_origem` para evitar duplicatas.

## Contas a Receber
- **Origem**: Exclusivamente `sales_order`.
- **Prevenção Ghost Credits**: Filtrar por `origin_id = 'sales_order'` e ocultar `cancelled/reversed`.

## Adiantamentos e Saldo
- **Parent ID**: Todo adiantamento que abate saldo deve estar vinculado via `p_parent_id`.
- **Saldos**: `saldo_a_pagar = valor_total - pagamentos - adiantamentos`.

## Módulo Sócios
- **Pró-labore**: Fica como saldo do sócio para retirada futura.
- **Patrimônio Líquido**: `Total Ativos - Total Passivos`.
- **Caixa**: Conceito de mês aberto/fechado (snapshots imutáveis).
