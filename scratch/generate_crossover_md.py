import json

with open("scratch/crossover_math_results.json") as f:
    data = json.load(f)

md = []
md.append("# Relatório Técnico: Análise Detalhada dos Contratos Crossover Pendentes")
md.append("\nEste relatório apresenta uma análise detalhada dos **17 contratos crossover** (15 de Venda e 2 de Compra) identificados no arquivo legacy do AppSheet (`Banco de Dados Suporte Grãos.xlsx`) que possuem **carregamentos (logística) e movimentações financeiras a partir de 1º de Fevereiro de 2026**.")
md.append("\n## 1. O que são os Pedidos Crossover com Carregamento Posterior?")
md.append("Diferente dos pedidos em aberto que tiveram **apenas pagamentos em fevereiro** (que você já resolveu lançando como empréstimos de implantação e efetuando a baixa), estes **17 contratos** continuaram ativos operacionalmente. Ou seja, caminhões continuaram carregando milho em fevereiro ou março de 2026 para cumprir esses contratos criados em janeiro de 2026 ou em 2025.")
md.append("\n**Por que eles não podem ser tratados como empréstimos simples?**")
md.append("1. **Logística Real**: Houve carregamentos reais pós-janeiro com placas, pesos, motoristas e transportadoras. Se lançarmos apenas como empréstimo, o sistema de fretes e romaneios pós-fevereiro ficará orfão (não terá contrato ou carga correspondente).")
md.append("2. **Estoque e Movimentação de Grãos**: As cargas pós-janeiro afetam as quantidades movimentadas de grãos (SC e KG) no estoque e no balanço físico dos clientes/produtores.")
md.append("3. **Custos Operacionais**: Esses carregamentos envolvem custos de frete e despesas extras que precisam estar atrelados a um contrato de venda/compra real para cálculo correto da margem de lucro.")
md.append("\n---")
md.append("\n## 2. Resumo Geral dos Contratos Crossover")
md.append("\n### 2.1 Pedidos de Venda (Clientes)")
md.append("| Código do Pedido | Cliente | Data Pedido | Valor Contrato | Carregado Pré-Fev | Recebido Pré-Fev | Saldo Devedor 31/01 | Carregado Pós-Fev | Recebido Pós-Fev | Saldo Final |")
md.append("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")

for s in data['sales']:
    md.append(f"| **{s['order_id']}** | {s['client']} | {s['date']} | R$ {s['contract_val']:,.2f} | R$ {s['pre_load_val']:,.2f} | R$ {s['pre_rec_val']:,.2f} | **R$ {s['net_pre_balance']:,.2f}** | R$ {s['post_load_val']:,.2f} | R$ {s['post_rec_val']:,.2f} | R$ {s['final_balance']:,.2f} |")

md.append("\n### 2.2 Pedidos de Compra (Produtores)")
md.append("| Código do Pedido | Produtor | Data Pedido | Valor Contrato | Carregado Pré-Fev | Pago Pré-Fev | Saldo Credor 31/01 | Carregado Pós-Fev | Pago Pós-Fev | Saldo Final |")
md.append("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |")

for p in data['purchase']:
    # Note: for purchase, net_pre_balance = pre_load_val - pre_pay_val.
    # If positive, we owed the producer. If negative, we advanced money to him.
    md.append(f"| **{p['order_id']}** | {p['producer']} | {p['date']} | R$ {p['contract_val']:,.2f} | R$ {p['pre_load_val']:,.2f} | R$ {p['pre_pay_val']:,.2f} | **R$ {p['net_pre_balance']:,.2f}** | R$ {p['post_load_val']:,.2f} | R$ {p['post_pay_val']:,.2f} | R$ {p['final_balance']:,.2f} |")

md.append("\n---")
md.append("\n## 3. Análise Detalhada Pedido a Pedido")

# We will read detailed logs or listings of loads/receipts to enrich the breakdown
# Let's group sales and purchase
md.append("\n### 3.1 Pedidos de Venda (Crossover)")
for s in data['sales']:
    md.append(f"\n#### 📑 Pedido {s['order_id']} — {s['client']}")
    md.append(f"- **Data de Criação:** {s['date']}")
    md.append(f"- **Volume do Contrato:** {s['contract_qty']:,.2f} SC (Valor total: R$ {s['contract_val']:,.2f})")
    md.append(f"- **Fase Legada (Até 31/01/2026):**")
    md.append(f"  - Carregado: {s['pre_load_qty']:,.2f} SC (R$ {s['pre_load_val']:,.2f})")
    md.append(f"  - Recebido: R$ {s['pre_rec_val']:,.2f}")
    md.append(f"  - **Saldo Devedor de Transição (CVA): R$ {s['net_pre_balance']:,.2f}**")
    md.append(f"- **Fase Nova (A partir de 01/02/2026):**")
    md.append(f"  - Carregado Real: {s['post_load_qty']:,.2f} SC (R$ {s['post_load_val']:,.2f})")
    md.append(f"  - Recebido Real: R$ {s['post_rec_val']:,.2f}")
    md.append(f"- **Reconciliação Final:** Total Carregado R$ {s['total_load_val']:,.2f} vs Total Recebido R$ {s['total_rec_val']:,.2f} (Saldo: **R$ {s['final_balance']:,.2f}**)")

md.append("\n### 3.2 Pedidos de Compra (Crossover)")
for p in data['purchase']:
    md.append(f"\n#### 📑 Pedido {p['order_id']} — {p['producer']}")
    md.append(f"- **Data de Criação:** {p['date']}")
    md.append(f"- **Valor do Contrato:** R$ {p['contract_val']:,.2f}")
    md.append(f"- **Fase Legada (Até 31/01/2026):**")
    md.append(f"  - Carregado: {p['pre_load_qty']:,.2f} SC (R$ {p['pre_load_val']:,.2f})")
    md.append(f"  - Pago: R$ {p['pre_pay_val']:,.2f}")
    md.append(f"  - **Saldo de Transição (CVA): R$ {p['net_pre_balance']:,.2f}** (positivo = a pagar ao produtor; negativo = adiantamento realizado)")
    md.append(f"- **Fase Nova (A partir de 01/02/2026):**")
    md.append(f"  - Carregado Real: {p['post_load_qty']:,.2f} SC (R$ {p['post_load_val']:,.2f})")
    md.append(f"  - Pago Real: R$ {p['post_pay_val']:,.2f}")
    md.append(f"- **Reconciliação Final:** Total Carregado R$ {p['total_load_val']:,.2f} vs Total Pago R$ {p['total_pay_val']:,.2f} (Saldo: **R$ {p['final_balance']:,.2f}**)")

md.append("\n---")
md.append("\n## 4. Estratégia Recomendada para Importação (Crossover Virtual Adjustment - CVA)")
md.append("Quando decidirmos importar estes dados, o script executará os seguintes passos para manter a base 100% correta:")
md.append("\n1. **Importação dos Pedidos Originais**: Criaremos o pedido (`ops_sales_orders` / `ops_purchase_orders`) no Supabase com suas datas reais de janeiro ou anterior (ex: 2025 ou 2026-01).")
md.append("2. **Criação da Carga Virtual de Ajuste (CVA)**: Para cada pedido, lançaremos uma carga virtual em `ops_loadings` com data **31/01/2026** representando o volume e valor carregados na fase antiga. Isso gera o saldo devedor correto.")
md.append("3. **Criação do Pagamento Virtual de Ajuste (CVA)**: Lançaremos uma transação financeira em `financial_transactions` com data **30/01/2026** no valor correspondente aos pagamentos antigos recebidos.")
md.append("4. **Importação dos Carregamentos Reais**: Importaremos as cargas reais ocorridas em fevereiro e março de 2026. O sistema calculará automaticamente os faturamentos.")
md.append("5. **Importação dos Recebimentos/Pagamentos Reais**: Vincularemos as transações financeiras reais de fevereiro/março de 2026 aos contratos.")
md.append("\n**Por que essa estratégia de datas (30/01 e 31/01) funciona perfeitamente no Supabase?**")
md.append("- Os saldos das contas bancárias começam a ser calculados a partir do saldo inicial implantado em **31/01/2026**. Qualquer transação datada em **30/01/2026** é ignorada pelo cálculo de saldo bancário, impedindo que os saldos de caixa sejam distorcidos.")
md.append("- No entanto, a trigger do Supabase que calcula o valor pago do contrato soma todos os pagamentos atrelados ao pedido, independentemente da data. O contrato de Jan/2026 fica perfeitamente quitado e o balanço do cliente zera!")

with open("scratch/analise_detalhada_crossover.md", "w") as f:
    f.write("\n".join(md))

print("Markdown report written to scratch/analise_detalhada_crossover.md")
