# Relatório Técnico: Análise Detalhada dos Contratos Crossover Pendentes

Este relatório apresenta uma análise detalhada dos **17 contratos crossover** (15 de Venda e 2 de Compra) identificados no arquivo legacy do AppSheet (`Banco de Dados Suporte Grãos.xlsx`) que possuem **carregamentos (logística) e movimentações financeiras a partir de 1º de Fevereiro de 2026**.

## 1. O que são os Pedidos Crossover com Carregamento Posterior?
Diferente dos pedidos em aberto que tiveram **apenas pagamentos em fevereiro** (que você já resolveu lançando como empréstimos de implantação e efetuando a baixa), estes **17 contratos** continuaram ativos operacionalmente. Ou seja, caminhões continuaram carregando milho em fevereiro ou março de 2026 para cumprir esses contratos criados em janeiro de 2026 ou em 2025.

**Por que eles não podem ser tratados como empréstimos simples?**
1. **Logística Real**: Houve carregamentos reais pós-janeiro com placas, pesos, motoristas e transportadoras. Se lançarmos apenas como empréstimo, o sistema de fretes e romaneios pós-fevereiro ficará orfão (não terá contrato ou carga correspondente).
2. **Estoque e Movimentação de Grãos**: As cargas pós-janeiro afetam as quantidades movimentadas de grãos (SC e KG) no estoque e no balanço físico dos clientes/produtores.
3. **Custos Operacionais**: Esses carregamentos envolvem custos de frete e despesas extras que precisam estar atrelados a um contrato de venda/compra real para cálculo correto da margem de lucro.

---

## 2. Resumo Geral dos Contratos Crossover

### 2.1 Pedidos de Venda (Clientes)
| Código do Pedido | Cliente | Data Pedido | Valor Contrato | Carregado Pré-Fev | Recebido Pré-Fev | Saldo Devedor 31/01 | Carregado Pós-Fev | Recebido Pós-Fev | Saldo Final |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **P0525NEW93100** | Thiago Garanhuns | 2025-05-05 | R$ 93,000.00 | R$ 208,826.92 | R$ 210,674.00 | **R$ -1,847.08** | R$ 89,046.92 | R$ 87,199.84 | R$ 0.00 |
| **P0625NEW79120** | Frango da Roça | 2025-06-22 | R$ 79,000.00 | R$ 223,780.93 | R$ 223,780.93 | **R$ 0.00** | R$ 106,320.00 | R$ 106,320.00 | R$ 0.00 |
| **P0725NEW76128** | Granja Canaa | 2025-07-14 | R$ 76,000.00 | R$ 715,895.43 | R$ 715,895.43 | **R$ -0.00** | R$ 512,392.00 | R$ 512,392.00 | R$ -0.00 |
| **P0925RON82143** | Sr. Pedro Vitoria | 2025-09-01 | R$ 82,000.00 | R$ 271,957.60 | R$ 271,957.60 | **R$ 0.00** | R$ 158,892.44 | R$ 158,892.44 | R$ 0.00 |
| **P1125RON76167** | Clodoaldo Corretor | 2025-11-10 | R$ 76,500.00 | R$ 1,087,653.28 | R$ 458,774.10 | **R$ 628,879.18** | R$ 1,385,187.62 | R$ 2,014,066.80 | R$ 0.00 |
| **P0126NEW82192** | Ilario Campina Grande | 2026-01-06 | R$ 82,000.00 | R$ 211,478.00 | R$ 173,300.00 | **R$ 38,178.00** | R$ 183,756.77 | R$ 221,934.77 | R$ 0.00 |
| **P0126NEW76193** | Frei Damião | 2026-01-07 | R$ 76,000.00 | R$ 184,755.24 | R$ 94,822.16 | **R$ 89,933.08** | R$ 193,242.92 | R$ 283,176.00 | R$ -0.00 |
| **P0126NEW84195** | Diego Atacadao Racao | 2026-01-09 | R$ 84,000.00 | R$ 417,316.83 | R$ 122,529.72 | **R$ 294,787.11** | R$ 208,358.22 | R$ 503,145.33 | R$ -0.00 |
| **P0126RON81198** | Pedro Falcão | 2026-01-13 | R$ 81,000.00 | R$ 186,022.50 | R$ 94,041.00 | **R$ 91,981.50** | R$ 203,851.13 | R$ 295,832.63 | R$ 0.00 |
| **P0126NEW80200** | São Braz S/A Industria E Comercio De Alimentos | 2026-01-16 | R$ 1,600,000.00 | R$ 1,080,865.60 | R$ 805,717.58 | **R$ 275,148.02** | R$ 148,266.40 | R$ 423,414.42 | R$ 0.00 |
| **P0126NEW83201** | André Macaíbas | 2026-01-16 | R$ 83,000.00 | R$ 104,563.94 | R$ 104,563.94 | **R$ 0.00** | R$ 66,580.11 | R$ 66,580.11 | R$ 0.00 |
| **P0126NEW77202** | Granja Cajueiro | 2026-01-19 | R$ 77,000.00 | R$ 97,083.91 | R$ 0.00 | **R$ 97,083.91** | R$ 492,492.72 | R$ 589,576.63 | R$ 0.00 |
| **P0126NEW77203** | Nutrane | 2026-01-19 | R$ 385,000.00 | R$ 288,018.50 | R$ 288,031.09 | **R$ -12.59** | R$ 93,144.59 | R$ 93,132.00 | R$ 0.00 |
| **P0126RON80205** | Ovos Sao Tome | 2026-01-20 | R$ 80,500.00 | R$ 206,733.60 | R$ 0.00 | **R$ 206,733.60** | R$ 293,868.00 | R$ 500,601.60 | R$ 0.00 |
| **P0126NEW82207** | Santa Cruz - RN | 2026-01-23 | R$ 82,000.00 | R$ 102,459.00 | R$ 0.00 | **R$ 102,459.00** | R$ 511,589.06 | R$ 614,048.06 | R$ 0.00 |

### 2.2 Pedidos de Compra (Produtores)
| Código do Pedido | Produtor | Data Pedido | Valor Contrato | Carregado Pré-Fev | Pago Pré-Fev | Saldo Credor 31/01 | Carregado Pós-Fev | Pago Pós-Fev | Saldo Final |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **19122515132** | Mateus Pereira | 2025-12-19 | R$ 751,819.88 | R$ 338,560.76 | R$ 284,411.20 | **R$ 54,149.56** | R$ 413,259.12 | R$ 467,408.68 | R$ 0.00 |
| **2901261747** | Ramon | 2026-01-29 | R$ 469,879.32 | R$ 0.00 | R$ 105,302.03 | **R$ -105,302.03** | R$ 469,879.32 | R$ 364,577.29 | R$ -0.00 |

---

## 3. Análise Detalhada Pedido a Pedido

### 3.1 Pedidos de Venda (Crossover)

#### 📑 Pedido P0525NEW93100 — Thiago Garanhuns
- **Data de Criação:** 2025-05-05
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 93,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 2,474.33 SC (R$ 208,826.92)
  - Recebido: R$ 210,674.00
  - **Saldo Devedor de Transição (CVA): R$ -1,847.08**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 1,171.67 SC (R$ 89,046.92)
  - Recebido Real: R$ 87,199.84
- **Reconciliação Final:** Total Carregado R$ 297,873.84 vs Total Recebido R$ 297,873.84 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0625NEW79120 — Frango da Roça
- **Data de Criação:** 2025-06-22
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 79,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 2,832.67 SC (R$ 223,780.93)
  - Recebido: R$ 223,780.93
  - **Saldo Devedor de Transição (CVA): R$ 0.00**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 1,329.00 SC (R$ 106,320.00)
  - Recebido Real: R$ 106,320.00
- **Reconciliação Final:** Total Carregado R$ 330,100.93 vs Total Recebido R$ 330,100.93 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0725NEW76128 — Granja Canaa
- **Data de Criação:** 2025-07-14
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 76,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 9,424.50 SC (R$ 715,895.43)
  - Recebido: R$ 715,895.43
  - **Saldo Devedor de Transição (CVA): R$ -0.00**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 6,745.66 SC (R$ 512,392.00)
  - Recebido Real: R$ 512,392.00
- **Reconciliação Final:** Total Carregado R$ 1,228,287.43 vs Total Recebido R$ 1,228,287.43 (Saldo: **R$ -0.00**)

#### 📑 Pedido P0925RON82143 — Sr. Pedro Vitoria
- **Data de Criação:** 2025-09-01
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 82,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 3,454.50 SC (R$ 271,957.60)
  - Recebido: R$ 271,957.60
  - **Saldo Devedor de Transição (CVA): R$ 0.00**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 1,989.67 SC (R$ 158,892.44)
  - Recebido Real: R$ 158,892.44
- **Reconciliação Final:** Total Carregado R$ 430,850.04 vs Total Recebido R$ 430,850.04 (Saldo: **R$ 0.00**)

#### 📑 Pedido P1125RON76167 — Clodoaldo Corretor
- **Data de Criação:** 2025-11-10
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 76,500.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 14,369.83 SC (R$ 1,087,653.28)
  - Recebido: R$ 458,774.10
  - **Saldo Devedor de Transição (CVA): R$ 628,879.18**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 17,574.66 SC (R$ 1,385,187.62)
  - Recebido Real: R$ 2,014,066.80
- **Reconciliação Final:** Total Carregado R$ 2,472,840.90 vs Total Recebido R$ 2,472,840.90 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126NEW82192 — Ilario Campina Grande
- **Data de Criação:** 2026-01-06
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 82,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 2,579.00 SC (R$ 211,478.00)
  - Recebido: R$ 173,300.00
  - **Saldo Devedor de Transição (CVA): R$ 38,178.00**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 2,225.66 SC (R$ 183,756.77)
  - Recebido Real: R$ 221,934.77
- **Reconciliação Final:** Total Carregado R$ 395,234.77 vs Total Recebido R$ 395,234.77 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126NEW76193 — Frei Damião
- **Data de Criação:** 2026-01-07
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 76,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 2,426.66 SC (R$ 184,755.24)
  - Recebido: R$ 94,822.16
  - **Saldo Devedor de Transição (CVA): R$ 89,933.08**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 2,538.34 SC (R$ 193,242.92)
  - Recebido Real: R$ 283,176.00
- **Reconciliação Final:** Total Carregado R$ 377,998.16 vs Total Recebido R$ 377,998.16 (Saldo: **R$ -0.00**)

#### 📑 Pedido P0126NEW84195 — Diego Atacadao Racao
- **Data de Criação:** 2026-01-09
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 84,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 4,997.00 SC (R$ 417,316.83)
  - Recebido: R$ 122,529.72
  - **Saldo Devedor de Transição (CVA): R$ 294,787.11**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 2,510.34 SC (R$ 208,358.22)
  - Recebido Real: R$ 503,145.33
- **Reconciliação Final:** Total Carregado R$ 625,675.05 vs Total Recebido R$ 625,675.05 (Saldo: **R$ -0.00**)

#### 📑 Pedido P0126RON81198 — Pedro Falcão
- **Data de Criação:** 2026-01-13
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 81,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 2,318.00 SC (R$ 186,022.50)
  - Recebido: R$ 94,041.00
  - **Saldo Devedor de Transição (CVA): R$ 91,981.50**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 2,508.66 SC (R$ 203,851.13)
  - Recebido Real: R$ 295,832.63
- **Reconciliação Final:** Total Carregado R$ 389,873.63 vs Total Recebido R$ 389,873.63 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126NEW80200 — São Braz S/A Industria E Comercio De Alimentos
- **Data de Criação:** 2026-01-16
- **Volume do Contrato:** 20,000.00 SC (Valor total: R$ 1,600,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 13,496.99 SC (R$ 1,080,865.60)
  - Recebido: R$ 805,717.58
  - **Saldo Devedor de Transição (CVA): R$ 275,148.02**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 1,848.67 SC (R$ 148,266.40)
  - Recebido Real: R$ 423,414.42
- **Reconciliação Final:** Total Carregado R$ 1,229,132.00 vs Total Recebido R$ 1,229,132.00 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126NEW83201 — André Macaíbas
- **Data de Criação:** 2026-01-16
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 83,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 1,273.50 SC (R$ 104,563.94)
  - Recebido: R$ 104,563.94
  - **Saldo Devedor de Transição (CVA): R$ 0.00**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 802.00 SC (R$ 66,580.11)
  - Recebido Real: R$ 66,580.11
- **Reconciliação Final:** Total Carregado R$ 171,144.05 vs Total Recebido R$ 171,144.05 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126NEW77202 — Granja Cajueiro
- **Data de Criação:** 2026-01-19
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 77,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 1,274.67 SC (R$ 97,083.91)
  - Recebido: R$ 0.00
  - **Saldo Devedor de Transição (CVA): R$ 97,083.91**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 6,199.67 SC (R$ 492,492.72)
  - Recebido Real: R$ 589,576.63
- **Reconciliação Final:** Total Carregado R$ 589,576.63 vs Total Recebido R$ 589,576.63 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126NEW77203 — Nutrane
- **Data de Criação:** 2026-01-19
- **Volume do Contrato:** 5,000.00 SC (Valor total: R$ 385,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 3,735.50 SC (R$ 288,018.50)
  - Recebido: R$ 288,031.09
  - **Saldo Devedor de Transição (CVA): R$ -12.59**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 1,208.67 SC (R$ 93,144.59)
  - Recebido Real: R$ 93,132.00
- **Reconciliação Final:** Total Carregado R$ 381,163.09 vs Total Recebido R$ 381,163.09 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126RON80205 — Ovos Sao Tome
- **Data de Criação:** 2026-01-20
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 80,500.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 2,584.17 SC (R$ 206,733.60)
  - Recebido: R$ 0.00
  - **Saldo Devedor de Transição (CVA): R$ 206,733.60**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 3,628.00 SC (R$ 293,868.00)
  - Recebido Real: R$ 500,601.60
- **Reconciliação Final:** Total Carregado R$ 500,601.60 vs Total Recebido R$ 500,601.60 (Saldo: **R$ 0.00**)

#### 📑 Pedido P0126NEW82207 — Santa Cruz - RN
- **Data de Criação:** 2026-01-23
- **Volume do Contrato:** 1,000.00 SC (Valor total: R$ 82,000.00)
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 1,249.33 SC (R$ 102,459.00)
  - Recebido: R$ 0.00
  - **Saldo Devedor de Transição (CVA): R$ 102,459.00**
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 6,170.67 SC (R$ 511,589.06)
  - Recebido Real: R$ 614,048.06
- **Reconciliação Final:** Total Carregado R$ 614,048.06 vs Total Recebido R$ 614,048.06 (Saldo: **R$ 0.00**)

### 3.2 Pedidos de Compra (Crossover)

#### 📑 Pedido 19122515132 — Mateus Pereira
- **Data de Criação:** 2025-12-19
- **Valor do Contrato:** R$ 751,819.88
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 4,903.83 SC (R$ 338,560.76)
  - Pago: R$ 284,411.20
  - **Saldo de Transição (CVA): R$ 54,149.56** (positivo = a pagar ao produtor; negativo = adiantamento realizado)
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 6,077.34 SC (R$ 413,259.12)
  - Pago Real: R$ 467,408.68
- **Reconciliação Final:** Total Carregado R$ 751,819.88 vs Total Pago R$ 751,819.88 (Saldo: **R$ 0.00**)

#### 📑 Pedido 2901261747 — Ramon
- **Data de Criação:** 2026-01-29
- **Valor do Contrato:** R$ 469,879.32
- **Fase Legada (Até 31/01/2026):**
  - Carregado: 0.00 SC (R$ 0.00)
  - Pago: R$ 105,302.03
  - **Saldo de Transição (CVA): R$ -105,302.03** (positivo = a pagar ao produtor; negativo = adiantamento realizado)
- **Fase Nova (A partir de 01/02/2026):**
  - Carregado Real: 6,909.99 SC (R$ 469,879.32)
  - Pago Real: R$ 364,577.29
- **Reconciliação Final:** Total Carregado R$ 469,879.32 vs Total Pago R$ 469,879.32 (Saldo: **R$ -0.00**)

---

## 4. Estratégia Recomendada para Importação (Crossover Virtual Adjustment - CVA)
Quando decidirmos importar estes dados, o script executará os seguintes passos para manter a base 100% correta:

1. **Importação dos Pedidos Originais**: Criaremos o pedido (`ops_sales_orders` / `ops_purchase_orders`) no Supabase com suas datas reais de janeiro ou anterior (ex: 2025 ou 2026-01).
2. **Criação da Carga Virtual de Ajuste (CVA)**: Para cada pedido, lançaremos uma carga virtual em `ops_loadings` com data **31/01/2026** representando o volume e valor carregados na fase antiga. Isso gera o saldo devedor correto.
3. **Criação do Pagamento Virtual de Ajuste (CVA)**: Lançaremos uma transação financeira em `financial_transactions` com data **30/01/2026** no valor correspondente aos pagamentos antigos recebidos.
4. **Importação dos Carregamentos Reais**: Importaremos as cargas reais ocorridas em fevereiro e março de 2026. O sistema calculará automaticamente os faturamentos.
5. **Importação dos Recebimentos/Pagamentos Reais**: Vincularemos as transações financeiras reais de fevereiro/março de 2026 aos contratos.

**Por que essa estratégia de datas (30/01 e 31/01) funciona perfeitamente no Supabase?**
- Os saldos das contas bancárias começam a ser calculados a partir do saldo inicial implantado em **31/01/2026**. Qualquer transação datada em **30/01/2026** é ignorada pelo cálculo de saldo bancário, impedindo que os saldos de caixa sejam distorcidos.
- No entanto, a trigger do Supabase que calcula o valor pago do contrato soma todos os pagamentos atrelados ao pedido, independentemente da data. O contrato de Jan/2026 fica perfeitamente quitado e o balanço do cliente zera!