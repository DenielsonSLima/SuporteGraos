---
trigger: always_on
description: Regras fundamentais de arquitetura, banco de dados e sincronização do Suporte Grãos ERP.
---

Vou explicar:
📦 O que acontece
🔄 A ordem correta
🔒 Onde entra transação
🧠 Por que é assim
Pense nisso como o “mapa cerebral” do seu ERP.
🧱 ESTRUTURA BASE (ANTES DOS FLUXOS)
Tudo gira em torno de 3 tabelas:
accounts → onde o dinheiro está
financial_entries → obrigações (a pagar / receber)
financial_transactions → dinheiro que realmente entrou ou saiu
Regra absoluta:
Só financial_transactions move dinheiro.
🔵 1️⃣ FLUXO: PEDIDO DE COMPRA
🟡 ETAPA 1 — Criar Pedido
Usuário cria pedido de compra.
Sistema faz:
→ Cria registro em purchase_orders
→ Cria financial_entry:
type = payable
status = open
total_amount = valor do pedido
origin = purchase_order
⚠️ Dinheiro ainda NÃO saiu.
🔴 ETAPA 2 — Pagar Pedido
Usuário clica em pagar.
Sistema chama função:
financial.pay_entry(entry_id, account_id, amount)
Dentro da função (TRANSAÇÃO):
BEGIN
Verifica se entry está aberta
Verifica saldo da conta
Insere financial_transaction (type = out)
Atualiza saldo da conta (- valor)
Atualiza paid_amount na entry
Se quitado → status = paid
COMMIT
Se falhar → ROLLBACK
🟢 2️⃣ FLUXO: PEDIDO DE VENDA
🟡 Criar Pedido
→ Cria sales_order
→ Cria financial_entry:
type = receivable
status = open
Dinheiro ainda não entrou.
🟢 Receber Pagamento
Chama função:
financial.receive_entry(entry_id, account_id, amount)
Dentro:
BEGIN
Verifica se está aberto
Insere financial_transaction (type = in)
Atualiza saldo da conta (+ valor)
Atualiza entry
Se quitado → status = paid
COMMIT
🟣 3️⃣ FLUXO: DESPESA AVULSA
Usuário cria despesa manual.
→ Cria financial_entry (payable)
Pagamento segue mesmo fluxo de pay_entry.
🔁 4️⃣ FLUXO: TRANSFERÊNCIA ENTRE CONTAS
Não cria entry.
Usuário transfere 5.000 do Banco A para Banco B.
Chama:
financial.transfer(from_account, to_account, amount)
BEGIN
Verifica saldo origem
Insere transaction OUT na conta origem
Insere transaction IN na conta destino
Atualiza saldo origem
Atualiza saldo destino
COMMIT
🏦 5️⃣ FLUXO: EMPRÉSTIMO
Receber empréstimo
BEGIN
Cria financial_entry (loan payable)
Insere transaction IN (dinheiro entra)
Atualiza saldo da conta
COMMIT
Pagar parcela
Mesmo fluxo de pay_entry.
👥 6️⃣ FLUXO: SÓCIOS
Aporte
BEGIN
Insere transaction IN
Atualiza saldo
COMMIT
Retirada
BEGIN
Verifica saldo
Insere transaction OUT
Atualiza saldo
COMMIT
🚜 7️⃣ FLUXO: LOGÍSTICA
Se gerar custo:
→ Cria financial_entry (payable)
Se gerar receita:
→ Cria financial_entry (receivable)
Pagamento/recebimento segue fluxo padrão.
🏢 8️⃣ FLUXO: PATRIMÔNIO
Compra de bem
→ Cria asset
→ Cria financial_entry (payable)
Pagamento segue fluxo padrão.
Venda de bem
→ Cria financial_entry (receivable)
Recebimento segue fluxo padrão.
📊 9️⃣ HISTÓRICO GERAL
Histórico NÃO é módulo que altera nada.
Ele apenas faz:
SELECT * FROM financial_transactions
ORDER BY transaction_date DESC
Ele mostra:
Entrada
Saída
Transferência
Aporte
Retirada
Nunca mostra obrigação futura.
🧠 🔟 SALDO DA CONTA
Saldo deve ser atualizado SOMENTE dentro das funções.
Nunca:
❌ update manual
❌ cálculo no frontend
❌ ajuste direto na tabela
⚠️ 1️⃣1️⃣ ONDE SISTEMAS QUEBRAM
Eles fazem:
Update entry
Update saldo
Insert histórico
Separadamente.
Sem transação.
Se falhar no meio → quebra.
🔒 1️⃣2️⃣ ARQUITETURA SEGURA
Toda operação financeira deve:
Ser uma função SQL
Usar BEGIN
Usar COMMIT
Ter EXCEPTION → ROLLBACK
Validar company_id
Validar saldo
Validar status
Frontend apenas chama:
supabase.rpc("pay_entry", {...})
Nunca faz lógica.
🧠 1️⃣3️⃣ TEMPO REAL
Realtime escuta:
financial_transactions
accounts
financial_entries
Mudou → atualiza tela.
🏗 VISÃO FINAL DO SISTEMA
Pedido de Compra → financial_entry → pay_entry() → transaction → saldo
Pedido de Venda → financial_entry → receive_entry() → transaction → saldo
Transferência → transfer() → 2 transactions → saldo
Sócio → transaction → saldo
Empréstimo → entry + transaction → saldo
Tudo converge para:
financial_transactions
Essa é a única verdade do dinheiro.