# Análise e Mapeamento de Migração de Dados (AppSheet Excel → Supabase PostgreSQL)

Este documento apresenta uma análise técnica completa e detalhada das planilhas contidas no arquivo **`Banco de Dados Suporte Grãos.xlsx`** (legado do AppSheet) e mapeia cada uma delas para a estrutura de tabelas relacional do novo sistema no **Supabase**.

---

## 1. Visão Geral da Origem (Excel AppSheet)
O banco de dados legado é composto por **31 abas**, onde a lógica de negócios era distribuída por fórmulas do Excel (como `=SUMIFS`, `=TEXT` e `=CONCATENATE`). 
No novo sistema, todas as somas de saldos, fluxos de caixa e faturamentos são calculados de forma segura e atômica diretamente no banco de dados através de **Triggers e RPCs (Stored Procedures)**, garantindo que não existam erros de arredondamento ou inconsistência multiusuário.

---

## 2. Dicionário de Mapeamento (De/Para)

Abaixo está o mapeamento detalhado de cada aba relevante do Excel para a sua respectiva tabela no Supabase.

### 2.1 Cadastros Básicos (Entidades e Parceiros)

No sistema anterior, clientes, produtores, motoristas e transportadoras ficavam em abas separadas. No Supabase, eles são consolidados em uma estrutura unificada sob a tabela `public.parceiros_parceiros` e diferenciados por suas categorias.

| Planilha Origem (Excel) | Tabela Destino (Supabase) | Tipo/Categoria de Parceiro | Observações |
| :--- | :--- | :--- | :--- |
| **Cliente** | `public.parceiros_parceiros` | Categoria `'5'` (Cliente) | Campos de saldo (`Valor Pago`, `Pendente`) serão calculados via RPC no Supabase. O CPF/CNPJ e Cidade/UF serão extraídos e higienizados. |
| **Produtor** | `public.parceiros_parceiros` | Categoria `'1'` (Produtor Rural) | Consolida os produtores de grãos. |
| **Transportadora** | `public.parceiros_parceiros` | Categoria `'3'` (Transportadora) | Consolida as empresas de logística de frete. |
| **Motorista** | `public.parceiros_motoristas` | Subtabela de motoristas | Os motoristas no Supabase são vinculados a um parceiro transportador responsável ou cadastrados como autônomos. |
| **Cidades** | `public.cities` e `public.states` | N/A | Tabela auxiliar de municípios e estados (já populada no Supabase via migração `007`). Usada para validar o endereço dos parceiros. |
| **Contas** | `public.bank_accounts` e `public.accounts` | N/A | Cadastro das contas bancárias (ex: Sicredi, BTG, Bradesco, Banco C6, Terceiros). |

---

### 2.2 Operações Comerciais e Contratos

As compras e vendas de grãos controlam as quantidades contratadas, preços e status.

| Planilha Origem (Excel) | Tabela Destino (Supabase) | Descrição e Lógica de Mapeamento |
| :--- | :--- | :--- |
| **PedidodeCompra** | `public.ops_purchase_orders` | **Contratos de Compra:** O campo `Produtor` no Excel será mapeado via nome para encontrar o `partner_id` correspondente. O número do contrato (`NPedidoCompra`) será gravado. |
| **PedComCarrinho** | `public.ops_purchase_order_items` | **Itens de Compra:** Armazena os produtos comprados (ex: Milho em Grãos), quantidade em KG e SC, e preço unitário. Vincula-se à ordem de compra via `purchase_order_id`. |
| **PedidodeVenda** | `public.ops_sales_orders` | **Contratos de Venda:** Armazena as vendas feitas para indústrias/compradores finais. O campo `Cliente` será mapeado para o `partner_id` de categoria Cliente. |

---

### 2.3 Logística e Carregamentos

A logística é o elo que conecta as compras (origem) com as vendas (destino), registrando os fretes e pesos.

| Planilha Origem (Excel) | Tabela Destino (Supabase) | Descrição e Lógica de Mapeamento |
| :--- | :--- | :--- |
| **CarrinhoFretes** | `public.ops_loadings` | **Cargas/Carregamentos:** Esta é a tabela central de logística do sistema. Ela conecta:<br>1. O contrato de compra (`PedidodeCompra` → `purchase_order_id`).<br>2. O contrato de venda (`PedidodeVenda` → `sales_order_id`).<br>3. O motorista (`Motorista` → texto no cadastro da carga).<br>4. Pesos de carga (`Quantidade Kg`) e descarga (`Peso Descarrego`). |
| **PedFretes** | `public.ops_loading_freight_components` | **Controle Geral de Fretes:** Custos de frete totalizados e vinculados a cada carregamento ou transportadora. |
| **DesExtFrete** | `public.ops_loading_freight_components` | **Despesas Extras de Logística:** Custos extras como balança, estadias ou manifesto em aberto, com flag de dedutibilidade (se desconta do motorista ou do produtor). |

---

### 2.4 Financeiro e Fluxo de Caixa

O financeiro consolida todos os pagamentos e recebimentos reais, que alteram o saldo das contas bancárias.

| Planilha Origem (Excel) | Tabela Destino (Supabase) | Descrição e Lógica de Mapeamento |
| :--- | :--- | :--- |
| **RecebimentoVenda** | `public.financial_entries` (Receita) | **Recebimentos de Clientes:** Registros de dinheiro entrando nas contas bancárias da empresa, associados a um `PedidoVenda`. Mapeia para tipo `'credit'`. |
| **PagProdutor** | `public.financial_entries` (Despesa) | **Pagamentos a Produtores:** Dinheiro saindo das contas para pagar os grãos comprados, associado a um `PedidodeCompra`. Mapeia para tipo `'debit'`. |
| **DespesasMensais** | `public.financial_entries` (Despesa) | **Despesas Administrativas:** Contas de luz, internet, pró-labore, materiais de escritório. Mapeia para despesas do tipo operacional/administrativa. |
| **PagComisao** | `public.financial_entries` (Despesa) | **Pagamentos de Comissões:** Comissões pagas aos corretores/intermediários vinculadas a contratos. Mapeia para despesas de comissão. |
| **PagFreteIndividal** | `public.financial_entries` (Despesa) | **Pagamentos a Motoristas:** Adiantamentos, saldos de frete e descontos aplicados diretamente ao motorista. |
| **Transferencia** | `public.transfers` | **Transferências entre Contas:** Movimentações internas de saldo entre as contas bancárias da empresa (ex: Sicredi para BTG). |
| **SaldoInicial** | `public.initial_balances` ou saldo de conta | **Saldos Iniciais:** O ponto de partida de cada conta bancária no início do período operacional (ex: 01/01/2025). |
| **Implantacao** e **CarImplantacao** | `public.financial_entries` | Lançamentos de ajuste ou aporte inicial para conciliação das contas. |
| **OutrasDespesas** / **CarOutras** | `public.loans` e `public.financial_entries` | **Empréstimos e Operações Especiais:** Mapeamento de contratos de empréstimo tomados/concedidos e seus respectivos fluxos de amortização. |

---

## 3. Lógica de Fórmulas: Excel vs Supabase

O antigo sistema no Excel usava fórmulas que recalculavam os valores a cada abertura da planilha. No Supabase, essas fórmulas são substituídas por tabelas relacionadas e cálculos automáticos no banco de dados. Veja abaixo a correspondência:

| Fórmula no Excel Legado | Lógica no Supabase (Novo Sistema) |
| :--- | :--- |
| `=SUMIFS(RecebimentoVenda!E:E, RecebimentoVenda!C:C, C:C)` | **Soma de Recebimentos da Venda:** Calculada pela View `v_financial_entries_enriched` ou RPCs agregadores, buscando todas as entradas financeiras atreladas ao ID do contrato de venda. |
| `=SUMIFS(PedidodeCompra!F:F, PedidodeCompra!D:D, B:B)` | **Soma de Compras por Produtor:** Resolvido pela View de Balanço de Parceiros (`v_partner_balances` ou RPC `get_partner_balances`), somando os saldos pendentes dos contratos onde o parceiro é fornecedor. |
| `=TEXT(Data, "MM/YYYY")` | Tratado dinamicamente no Frontend (React) usando formatação de data local, sem necessidade de armazenar uma coluna de texto duplicada no banco de dados. |
| `=CONCATENATE("CXG-", TEXT(B3, "MMYY"))` | **Código do Período de Caixa:** Gerado dinamicamente pelo ERP ao filtrar o período de caixa mensal. |

---

## 4. Desafios e Cuidados Críticos na Migração

Para garantir que a migração de dados ocorra de forma perfeita e sem corromper o sistema atual, os seguintes pontos precisam de atenção:

1. **Higienização de CPFs e CNPJs:**
   * O Excel possui registros com CPFs/CNPJs em branco ou formatados incorretamente (ex: com pontos e traços misturados com números limpos).
   * **Solução:** O script de migração deve remover pontuações e formatar como string numérica limpa antes de salvar no Supabase.
2. **Resolução de Cidades e Estados (UF):**
   * O Excel possui strings como `"São Bento da Una/PE"` ou `"Carira/SE"`.
   * **Solução:** O script quebrará a string pela barra `/` para obter a cidade e a UF, buscará o UUID correspondente na tabela `public.cities` e salvará a chave estrangeira `city_id` correta.
3. **Mapeamento de Nomes para UUIDs (Chaves Estrangeiras):**
   * No Excel, as tabelas ligam-se por texto (ex: `Produtor` = `"Adalberto Gloria"`). Se houver erros de digitação (ex: `"Adalberto Glória"` com acento em um lugar e sem acento em outro), a ligação falhará.
   * **Solução:** Criaremos um dicionário de mapeamento inteligente que remove acentos e normaliza os nomes para garantir que as transações fiquem atreladas ao parceiro correto.
4. **Preservação de IDs de Auditoria (`legacy_id`):**
   * Guardaremos o ID original do AppSheet (ex: `"a5d4b2e7"`) na coluna `legacy_id` de todas as tabelas destino. Isso permitirá cruzar as informações entre o Excel e o novo sistema para verificação de saldo pós-migração.
5. **Prevenção de Duplicação em Execuções Repetidas:**
   * Usaremos cláusulas `ON CONFLICT (company_id, legacy_id) DO UPDATE` para permitir que o script possa ser rodado várias vezes sem duplicar nenhum registro.

---

## 5. Cronograma Recomendado de Importação (Ordem de Dependência)

Como o banco de dados é relacional, os dados devem ser importados em uma ordem estrita para não violar as restrições de chaves estrangeiras:

1. **Fase 1: Infraestrutura e Contas** (Importação de `Contas` e `SaldoInicial` para `public.bank_accounts` e `public.initial_balances`).
2. **Fase 2: Parceiros** (Higienização de `Cliente`, `Produtor`, `Transportadora` e `Motorista` em `public.parceiros_parceiros` e `public.parceiros_motoristas`).
3. **Fase 3: Contratos** (Importação de `PedidodeCompra` e `PedidodeVenda` para `public.ops_purchase_orders` and `public.ops_sales_orders`).
4. **Fase 4: Itens e Cargas** (Importação de `PedComCarrinho` e `CarrinhoFretes` para itens e carregamentos `public.ops_loadings`).
5. **Fase 5: Caixa e Transações Financeiras** (Importação de todos os fluxos de pagamento/recebimento para `public.financial_entries`).

---

## Próximo Passo
Se você concordar com a estrutura deste mapeamento, o próximo passo será a criação de um **Script de Pré-Validação (Dry-Run)**, que lerá o Excel e listará na tela todos os eventuais erros de consistência (nomes de parceiros incorretos, CPFs inválidos ou cidades não encontradas) antes de fazermos qualquer inserção real no Supabase.
