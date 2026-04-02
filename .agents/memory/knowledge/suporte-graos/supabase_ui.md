# Banco de Dados e Regras Críticas — Suporte Grãos ERP

## Convenções Supabase
- PostgreSQL com RLS habilitado.
- Valores em `numeric/decimal`, NUNCA `float`.
- Datas em `timestamptz`.

## Gatilhos Críticos (Triggers)
- **INSERT carregamentos**: Cria `contas_pagar` (produtor/frete).
- **UPDATE peso_descarga**: Cria/atualiza `contas_receber`.
- **DELETE carregamentos**: Deve reverter finanças.

## Padrões UI (Premium)
- **ModalPortal**: Regra absoluta para todos os modais.
- **Quick View (Drawer)**: Para detalhes rápidos sem trocar de tela.
- **Dynamic Imports**: Em serviços para evitar dependências circulares.
