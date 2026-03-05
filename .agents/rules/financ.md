---
trigger: always_on
description: Regras do motor financeiro, gestão de obrigações (entries) e movimentações (transactions).
---

BASE CONTINUA A MESMA
Nada muda na base.
Continuamos com:
financial_entries → obrigações
financial_transactions → dinheiro real
accounts → onde o dinheiro está
Tudo novo que você adicionou será modelado como variações controladas de entry, nunca como tabela solta.
🏢 1️⃣ PATRIMÔNIO COM OPÇÃO DE VENDA
📌 Compra de Patrimônio
Exemplo: comprou um trator por 200.000
Fluxo:
Cria registro em assets
Cria financial_entry
type = payable
origin = asset_purchase
total_amount = 200.000
Pagamento segue fluxo padrão.
📌 Venda de Patrimônio
Exemplo: vendeu o trator por 150.000
Fluxo:
Atualiza asset:
status = sold
sold_value = 150.000
sold_date = hoje
Cria financial_entry
type = receivable
origin = asset_sale
total_amount = 150.000
Quando receber:
→ gera financial_transaction (in)
→ atualiza saldo
⚠️ Nunca mover dinheiro direto da venda.
Venda gera obrigação.
Recebimento gera movimentação.
🌾 2️⃣ PEDIDO DE COMPRA COM CORRETOR (COMISSÃO)
Exemplo:
Compra de soja do produtor por 100.000
Corretor ganha 2% = 2.000
Fluxo correto:
🔵 1. Criar Pedido de Compra
Cria:
financial_entry
type = payable
origin = purchase_order
total_amount = 100.000
🟣 2. Criar Comissão do Corretor
Não misture na mesma entry.
Cria outra financial_entry:
type = payable
origin = broker_commission
related_id = purchase_order_id
total_amount = 2.000
Por quê?
Porque:
Pode pagar produtor antes
Pode pagar corretor depois
Pode atrasar comissão
Pode parcelar
Separar evita caos.
💰 3️⃣ DESPESAS DENTRO DO PEDIDO DE COMPRA
Agora entra a parte mais delicada.
Exemplo:
Compra do produtor: 100.000
Frete: 3.000
Secagem: 2.000
Algumas despesas podem:
🔹 Ser pagas pela empresa
🔹 Ser abatidas do valor do produtor
🎯 CASO A — DESPESA NÃO ABATE PRODUTOR
Empresa paga frete.
Fluxo:
Cria entry principal (100.000)
Cria entry de despesa:
type = payable
origin = purchase_expense
total_amount = 3.000
São obrigações independentes.
🎯 CASO B — DESPESA ABATE DO PRODUTOR
Compra: 100.000
Frete: 3.000 (abatido)
Produtor receberá 97.000
Fluxo correto:
1️⃣ Entry original
total_amount = 100.000
2️⃣ Registrar despesa como entry separada
type = payable
origin = purchase_expense
total_amount = 3.000
3️⃣ Atualizar valor líquido da entry principal
Não alterar total original.
Adicionar campo:
deductions_amount = 3.000
net_amount = 97.000
OU
Gerar movimento interno de compensação.
🔴 Importante
Não altere o valor original da compra.
Sempre preserve:
Valor bruto
Valor líquido
Despesas vinculadas
Isso é essencial para auditoria.
💳 PAGAMENTO DO PRODUTOR
Quando pagar:
Função calcula:
valor_a_pagar = total_amount - deductions_amount - adiantamentos
A função faz isso.
Nunca o frontend.
🔁 4️⃣ FLUXO COMPLETO DO PEDIDO DE COMPRA COM TUDO JUNTO
Exemplo complexo:
Compra: 100.000
Frete: 3.000 (deduz)
Secagem: 2.000 (não deduz)
Corretor: 2.000
Sistema gera:
Entry 1 → Produtor 100.000
Entry 2 → Frete 3.000
Entry 3 → Secagem 2.000
Entry 4 → Comissão 2.000
Entry 1 terá deduction_amount = 3.000
Pagamento do produtor será 97.000
Frete pode ser pago depois.
Comissão pode ser paga depois.
Tudo independente.
🧠 POR QUE NÃO MISTURAR TUDO EM UMA TABELA?
Porque você perde:
Controle de pagamento individual
Parcelamento
Histórico claro
Auditoria
Controle de atraso
Separação é controle.
🏗 5️⃣ RESUMO FINAL DO MOTOR FINANCEIRO
Tudo vira:
Uma obrigação (entry)
Uma movimentação real (transaction)
Nada move saldo sem transaction.
Nada altera status fora de função transacional.
⚠️ O QUE NÃO FAZER
❌ Diminuir saldo manualmente
❌ Alterar valor original da compra
❌ Somar despesas no frontend
❌ Misturar comissão dentro do mesmo registro
❌ Atualizar 3 tabelas separadas sem transação
🧠 VISÃO FINAL DO FLUXO COMPLETO
Pedido Compra
   ├── Entry Produtor
   ├── Entry Despesa
   ├── Entry Comissão
        ↓
Pagamento → transaction → saldo
Patrimônio Compra → entry → payment → transaction
Patrimônio Venda → entry → receive → transaction