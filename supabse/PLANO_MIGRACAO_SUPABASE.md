# Plano de Ação: Migração para Supabase - Análise de Módulos e Dependências

**Data:** 24 de janeiro de 2026  
**Status:** Em Planejamento  
**Fase Atual:** Configurações ✅ | **Próxima:** Parceiros

---

## 1. Visão Geral da Arquitetura

O sistema ERP é composto por 8 módulos principais que se interconectam através de fluxos de dados financeiros e operacionais. A ordem de criação das tabelas no Supabase deve respeitar as dependências entre módulos.

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFIGURAÇÕES (BASE)                      │
│  [Empresas] [UFs/Cidades] [Tipos/Categorias] [Contas]      │
└──────────────────────────────────────────────────────────────┘
              ↓                    ↓                    ↓
        ┌─────────────┐    ┌──────────────┐    ┌────────────────┐
        │  PARCEIROS  │    │   PATRIMÔNIO │    │   FINANCEIRO   │
        │  (Fase 2)   │    │   (Fase 6)   │    │    (Fase 8)    │
        └─────────────┘    └──────────────┘    └────────────────┘
              ↓                                          ↑
        ┌─────────────────────────────┐                │
        │  COMPRA e LOGÍSTICA         │                │
        │  ├─ Pedido de Compra        │──────────────┬─┤
        │  ├─ Carregamento (Fase 3)   │              │ │
        │  ├─ Logística (Fase 4)      │              │ │
        │  └─ Contas a Pagar ─────────┼──────────────┘ │
        └─────────────────────────────┘                │
                                                        │
        ┌─────────────────────────────┐                │
        │  VENDA                      │                │
        │  ├─ Pedido de Venda (F5)    │──────────────┬─┤
        │  ├─ Contas a Receber ───────┼──────────────┘ │
        │  └─ Relatórios ─────────────→─────────────┬──┤
        └─────────────────────────────┘                │
                                                        │
        ┌─────────────────────────────────────────────┐│
        │        FINANCEIRO (AGREGADOR)              ││
        │  Consolida: Compra + Venda + Patrimônio    ││
        │  Gera: Fluxo de Caixa, DRE, Balancete    ││
        └─────────────────────────────────────────────┘│
```

---

## 2. Módulos e Submódulos Detalhados

### **FASE 1: CONFIGURAÇÕES** ✅ (Concluída)
**Status:** Tabelas criadas, RLS ativo, Realtime ativo

#### Tabelas:
- `companies` → Dados da empresa
- `ufs` → Estados
- `cities` → Cidades
- `partner_types` → Tipos de parceiros (PF, PJ, etc)
- `product_types` → Tipos de produtos
- `contas_bancarias` → Contas bancárias
- `expense_types` / `expense_categories` → Plano de contas
- `initial_balances` → Saldos iniciais
- `watermarks` → Marcas d'água para PDFs
- `shareholders` / `shareholder_transactions` → Sócios e transações

#### Chaves Estrangeiras:
- `cities.uf_id → ufs.id`
- `contas_bancarias.company_id → companies.id`
- `initial_balances.account_id → contas_bancarias.id`
- `expense_categories.expense_type_id → expense_types.id`

#### Regras de Integridade:
- Contas bancárias só podem ser deletadas se sem movimentação
- Saldos iniciais únicos por conta
- Categorias de despesa únicas por tipo

---

### **FASE 2: PARCEIROS** (A Fazer)
**Responsabilidade:** Centralizar dados de quem compra e vende

#### Módulo Completo: `Parceiros`
**Submódulos:**
- Cadastro de Parceiros
- Classificação (PF/PJ)
- Contatos
- Endereços

#### Tabelas:
1. **`partners`**
   - id (UUID)
   - name (texto)
   - document (CPF/CNPJ)
   - type (PF/PJ)
   - email
   - phone
   - address_id (FK → addresses)
   - partner_type_id (FK → partner_types)
   - company_id (FK → companies)
   - active (boolean)
   - created_at / updated_at

2. **`partner_addresses`**
   - id (UUID)
   - partner_id (FK → partners)
   - street / number / city_id (FK → cities) / state_id (FK → ufs)
   - zip_code
   - address_type (billing/shipping/main)

3. **`partner_contacts`**
   - id (UUID)
   - partner_id (FK → partners)
   - name / email / phone
   - contact_type (commercial/financial/operational)

#### Chaves Estrangeiras:
- `partners.partner_type_id → partner_types.id`
- `partners.company_id → companies.id`
- `partners.address_id → partner_addresses.id` (principal)
- `partner_addresses.city_id → cities.id`
- `partner_addresses.partner_id → partners.id (cascade delete)`
- `partner_contacts.partner_id → partners.id (cascade delete)`

#### Regras de Integridade:
- Documento (CPF/CNPJ) único por empresa
- Pelo menos um endereço obrigatório por parceiro
- Address_type deve ser um dos valores permitidos
- Parceiro ativo deve ter pelo menos um contato

#### Ligações Externas:
- **← Compra:** Fornecedor (parceiro tipo fornecedor)
- **← Venda:** Cliente (parceiro tipo cliente)
- **← Logística:** Localização de endereço do parceiro

---

### **FASE 3: PEDIDO DE COMPRA** (A Fazer)
**Responsabilidade:** Controlar entrada de mercadorias e gerar contas a pagar

#### Módulo Completo: `Pedido de Compra`
**Submódulos:**
- Emissão de Pedido
- Itens do Pedido
- Recebimento/Conferência
- Histórico

#### Tabelas:
1. **`purchase_orders`**
   - id (UUID)
   - number (texto, único)
   - partner_id (FK → partners) [Fornecedor]
   - date (data do pedido)
   - expected_date (data esperada)
   - status (pending/approved/received/cancelled)
   - total_value (decimal)
   - received_value (decimal)
   - notes (texto)
   - company_id (FK → companies)
   - created_by (FK → auth.users)
   - created_at / updated_at

2. **`purchase_order_items`**
   - id (UUID)
   - purchase_order_id (FK → purchase_orders)
   - product_type_id (FK → product_types) [O que vai chegar]
   - quantity (decimal)
   - unit_price (decimal)
   - subtotal (decimal)
   - received_quantity (decimal)
   - notes

3. **`purchase_receipts`** [Conferência de entrada]
   - id (UUID)
   - purchase_order_id (FK → purchase_orders)
   - receipt_date (data)
   - received_quantity (decimal)
   - notes
   - received_by (usuario)

#### Chaves Estrangeiras:
- `purchase_orders.partner_id → partners.id`
- `purchase_orders.company_id → companies.id`
- `purchase_order_items.purchase_order_id → purchase_orders.id (cascade delete)`
- `purchase_order_items.product_type_id → product_types.id`
- `purchase_receipts.purchase_order_id → purchase_orders.id`

#### Regras de Integridade:
- Number do pedido único por empresa
- Status válidos: pending, approved, received, cancelled
- Total_value = SUM(items.subtotal)
- Received_value ≤ total_value
- Quantity_received ≤ quantity_ordered (por item)
- Não pode receber após cancelamento

#### Ligações Externas:
- **→ Financeiro:** Cria "Conta a Pagar" quando pedido aprovado
- **→ Logística:** Envia itens para "Carregamento/Armazenagem"
- **→ Patrimônio:** Atualiza estoque ao receber

---

### **FASE 4: CARREGAMENTO** (A Fazer)
**Responsabilidade:** Acompanhar transporte de mercadorias (inbound/outbound)

#### Módulo Completo: `Logística`
**Submódulos:**
- Carregamentos (entrada/saída)
- Veículos
- Motoristas
- Rotas

#### Tabelas:
1. **`loadings`**
   - id (UUID)
   - loading_number (texto, único)
   - type (inbound/outbound) [Entrada de compra ou saída de venda]
   - purchase_order_id (FK → purchase_orders, nullable)
   - sales_order_id (FK → sales_orders, nullable)
   - date (data do carregamento)
   - vehicle_id (FK → vehicles)
   - driver_id (FK → drivers)
   - origin_address_id (FK → partner_addresses)
   - destination_address_id (FK → partner_addresses)
   - weight_kg (decimal)
   - weight_unload_kg (decimal)
   - status (pending/in_transit/unloading/completed/cancelled)
   - temperature_min / temperature_max (se refrigerado)
   - notes
   - company_id (FK → companies)

2. **`vehicles`**
   - id (UUID)
   - plate (texto, único)
   - type (truck/container/etc)
   - capacity_kg (decimal)
   - owner_type (own/third-party)
   - owner_partner_id (FK → partners, nullable)
   - active (boolean)

3. **`drivers`**
   - id (UUID)
   - name (texto)
   - document (CPF)
   - license_number (texto, único)
   - phone
   - active (boolean)

#### Chaves Estrangeiras:
- `loadings.purchase_order_id → purchase_orders.id` (pode ser null)
- `loadings.sales_order_id → sales_orders.id` (pode ser null)
- `loadings.vehicle_id → vehicles.id`
- `loadings.driver_id → drivers.id`
- `loadings.origin_address_id → partner_addresses.id`
- `loadings.destination_address_id → partner_addresses.id`
- `loadings.company_id → companies.id`
- `vehicles.owner_partner_id → partners.id` (nullable)

#### Regras de Integridade:
- Um carregamento deve ter OU purchase_order_id OU sales_order_id (não ambos null)
- Status válidos: pending, in_transit, unloading, completed, cancelled
- Weight_unload_kg ≤ weight_kg
- Veículo ativo obrigatório
- Motorista ativo obrigatório
- Type deve estar em lista pré-definida

#### Ligações Externas:
- **← Compra:** Recebe carregamento inbound de `purchase_orders`
- **← Venda:** Recebe carregamento outbound de `sales_orders`
- **→ Patrimônio:** Atualiza estoque ao unload completar

---

### **FASE 5: PEDIDO DE VENDA** (A Fazer)
**Responsabilidade:** Controlar saída de mercadorias e gerar contas a receber

#### Módulo Completo: `Venda`
**Submódulos:**
- Emissão de Pedido
- Itens do Pedido
- Confirmação de Entrega
- Histórico

#### Tabelas:
1. **`sales_orders`**
   - id (UUID)
   - number (texto, único)
   - partner_id (FK → partners) [Cliente]
   - date (data do pedido)
   - expected_delivery_date
   - status (pending/approved/shipped/delivered/cancelled)
   - total_value (decimal)
   - shipped_value (decimal)
   - discount (decimal, nullable)
   - notes
   - company_id (FK → companies)
   - created_by (FK → auth.users)
   - created_at / updated_at

2. **`sales_order_items`**
   - id (UUID)
   - sales_order_id (FK → sales_orders)
   - product_type_id (FK → product_types)
   - quantity (decimal)
   - unit_price (decimal)
   - subtotal (decimal)
   - shipped_quantity (decimal)
   - notes

3. **`sales_deliveries`** [Confirmação de entrega]
   - id (UUID)
   - sales_order_id (FK → sales_orders)
   - delivery_date (data)
   - shipped_quantity (decimal)
   - notes
   - delivered_by (usuario)

#### Chaves Estrangeiras:
- `sales_orders.partner_id → partners.id`
- `sales_orders.company_id → companies.id`
- `sales_order_items.sales_order_id → sales_orders.id (cascade delete)`
- `sales_order_items.product_type_id → product_types.id`
- `sales_deliveries.sales_order_id → sales_orders.id`

#### Regras de Integridade:
- Number único por empresa
- Status válidos: pending, approved, shipped, delivered, cancelled
- Total_value = SUM(items.subtotal) - discount
- Shipped_value ≤ total_value
- Shipped_quantity ≤ quantity_ordered (por item)
- Não pode entregar após cancelamento

#### Ligações Externas:
- **→ Financeiro:** Cria "Conta a Receber" quando pedido aprovado
- **→ Logística:** Envia itens para "Carregamento"
- **→ Patrimônio:** Reduz estoque ao confirmar entrega

---

### **FASE 6: PATRIMÔNIO** (A Fazer)
**Responsabilidade:** Controlar movimentação e saldo de estoque

#### Módulo Completo: `Patrimônio`
**Submódulos:**
- Catálogo de Produtos
- Estoque (entrada/saída)
- Localização
- Histórico de Movimentação

#### Tabelas:
1. **`inventory`** [Saldo de estoque por localização]
   - id (UUID)
   - product_type_id (FK → product_types)
   - location_id (FK → warehouse_locations)
   - quantity_on_hand (decimal)
   - quantity_reserved (decimal) [Pedidos não entregues]
   - quantity_available (decimal) = on_hand - reserved
   - last_movement_date
   - updated_at

2. **`warehouse_locations`**
   - id (UUID)
   - name (texto)
   - zone (A/B/C - ABC inventory)
   - address_id (FK → partner_addresses, nullable) [Se 3PL]
   - capacity_kg
   - temperature_controlled (boolean)
   - company_id (FK → companies)

3. **`inventory_movements`** [Auditoria de movimentação]
   - id (UUID)
   - product_type_id (FK → product_types)
   - from_location_id (FK → warehouse_locations, nullable)
   - to_location_id (FK → warehouse_locations, nullable)
   - quantity (decimal)
   - movement_type (inbound/outbound/adjustment/transfer)
   - reference_type (purchase_order/sales_order/adjustment)
   - reference_id (UUID do pedido/ajuste)
   - movement_date
   - notes

#### Chaves Estrangeiras:
- `inventory.product_type_id → product_types.id`
- `inventory.location_id → warehouse_locations.id`
- `warehouse_locations.address_id → partner_addresses.id` (nullable)
- `warehouse_locations.company_id → companies.id`
- `inventory_movements.product_type_id → product_types.id`
- `inventory_movements.from_location_id → warehouse_locations.id` (nullable)
- `inventory_movements.to_location_id → warehouse_locations.id` (nullable)

#### Regras de Integridade:
- Quantity_available = quantity_on_hand - quantity_reserved (sempre calculado)
- Quantity_on_hand nunca negativo
- Movement_type em lista pré-definida
- From_location obrigatório em outbound/transfer
- To_location obrigatório em inbound/transfer
- Não pode reservar mais que on_hand

#### Ligações Externas:
- **← Compra:** Atualiza estoque ao receber item
- **← Venda:** Reduz estoque (e cria reserva) ao confirmar pedido
- **← Logística:** Consulta availability para confirmar carregamento

---

### **FASE 7: RELACIONAMENTOS CRUZADOS - FINANCEIRO**
**Responsabilidade:** Consolidar movimentos de Compra, Venda e Patrimônio

#### Tabelas Consolidadas:

1. **`payables`** [Contas a Pagar - gerada por Compra]
   - id (UUID)
   - purchase_order_id (FK → purchase_orders)
   - partner_id (FK → partners)
   - due_date (data)
   - amount (decimal)
   - paid_amount (decimal)
   - status (pending/partially_paid/paid/overdue/cancelled)
   - payment_method (bank_transfer/check/cash/credit_card)
   - bank_account_id (FK → contas_bancarias) [Débito]
   - notes
   - company_id (FK → companies)

2. **`receivables`** [Contas a Receber - gerada por Venda]
   - id (UUID)
   - sales_order_id (FK → sales_orders)
   - partner_id (FK → partners)
   - due_date (data)
   - amount (decimal)
   - received_amount (decimal)
   - status (pending/partially_received/received/overdue/cancelled)
   - payment_method (bank_transfer/check/cash/credit_card)
   - bank_account_id (FK → contas_bancarias) [Crédito]
   - notes
   - company_id (FK → companies)

3. **`financial_history`** [Histórico consolidado - para Dashboard]
   - id (UUID)
   - date
   - type (payable/receivable/transfer/adjustment)
   - reference_id (UUID de payable/receivable)
   - partner_id (FK → partners, nullable)
   - amount (decimal)
   - balance_before (decimal)
   - balance_after (decimal)
   - bank_account_id (FK → contas_bancarias)
   - notes
   - company_id (FK → companies)

#### Chaves Estrangeiras:
- `payables.purchase_order_id → purchase_orders.id`
- `payables.partner_id → partners.id`
- `payables.bank_account_id → contas_bancarias.id`
- `payables.company_id → companies.id`
- `receivables.sales_order_id → sales_orders.id`
- `receivables.partner_id → partners.id`
- `receivables.bank_account_id → contas_bancarias.id`
- `receivables.company_id → companies.id`
- `financial_history.partner_id → partners.id` (nullable)
- `financial_history.bank_account_id → contas_bancarias.id`
- `financial_history.company_id → companies.id`

#### Regras de Integridade:
- Payable criada automaticamente quando purchase_order.status = approved
- Receivable criada automaticamente quando sales_order.status = approved
- Paid_amount ≤ amount (payable)
- Received_amount ≤ amount (receivable)
- Status reflete: pending > partially_paid/received > paid/received
- Balance_after = balance_before ± amount
- Não pode pagar/receber após cancelamento

---

### **FASE 8: FINANCEIRO (AGREGADOR)** (A Fazer)
**Responsabilidade:** Consolidar dados de Compra, Venda, Patrimônio e gerar relatórios

#### Módulo Completo: `Financeiro`
**Submódulos:**
- Fluxo de Caixa
- DRE (Demonstração do Resultado)
- Balancete
- Relatórios

#### Tabelas Somente-Leitura (Calculated Views):

1. **`cash_flow_daily`** [View calculada]
   - date
   - beginning_balance
   - inflows (receivables.received_amount)
   - outflows (payables.paid_amount)
   - ending_balance
   - bank_account_id

2. **`dre_monthly`** [View calculada]
   - month
   - revenue (SUM receivables paid)
   - cost_of_goods_sold (SUM payables paid para produtos)
   - gross_profit (revenue - cogs)
   - expenses (expense_categories)
   - operating_profit
   - net_income

3. **`balance_sheet`** [View calculada]
   - Assets: inventory value + receivables
   - Liabilities: payables
   - Equity

#### Chaves Estrangeiras:
- Não há: são VIEWs que agregam dados existentes

#### Regras de Integridade:
- Cash_flow_daily.ending_balance = beginning_balance + inflows - outflows
- DRE.gross_profit = revenue - cogs
- Balance_sheet sempre equilibrada (Assets = Liabilities + Equity)

#### Ligações Externas:
- **← Compra:** Consome dados de `payables`
- **← Venda:** Consome dados de `receivables`
- **← Patrimônio:** Consome dados de `inventory` (valor)
- **← Configurações:** Consome `expense_categories` para categorizar custos

---

## 3. Ordem de Criação das Tabelas no Supabase

### **Nível 0 - Base (Já Criado)**
```
✅ FASE 1: CONFIGURAÇÕES
  - companies
  - ufs
  - cities
  - partner_types
  - product_types
  - contas_bancarias
  - expense_types
  - expense_categories
  - initial_balances
  - shareholders
  - shareholder_transactions
  - watermarks
```

### **Nível 1 - Parceiros (Próxima)**
```
🔲 FASE 2: PARCEIROS
  - partners
  - partner_addresses
  - partner_contacts
```
**Por quê?** Base para Compra, Venda e Logística.

### **Nível 2 - Compra & Logística**
```
🔲 FASE 3: PEDIDO DE COMPRA
  - purchase_orders
  - purchase_order_items
  - purchase_receipts

🔲 FASE 4: LOGÍSTICA (CARREGAMENTO)
  - vehicles
  - drivers
  - warehouse_locations
  - loadings

🔲 FASE 5: PEDIDO DE VENDA
  - sales_orders
  - sales_order_items
  - sales_deliveries
```
**Por quê?** Compra e Venda dependem de Parceiros. Logística depende de Compra e Venda.

### **Nível 3 - Patrimônio**
```
🔲 FASE 6: PATRIMÔNIO
  - inventory
  - inventory_movements
```
**Por quê?** Depende de Compra (inbound) e Venda (outbound).

### **Nível 4 - Financeiro**
```
🔲 FASE 7: PAYABLES & RECEIVABLES
  - payables (gerada por purchase_orders)
  - receivables (gerada por sales_orders)
  - financial_history

🔲 FASE 8: RELATÓRIOS (VIEWS)
  - cash_flow_daily
  - dre_monthly
  - balance_sheet
```
**Por quê?** Depende de tudo acima. Consolida Compra, Venda e Patrimônio.

---

## 4. Resumo de Dependências

### **Grafo de Dependências:**
```
Configurações (FASE 1)
    ↓
Parceiros (FASE 2)
    ↓ ↓
  Compra ←─→ Venda
  (F3)      (F5)
    ↓ ↓
Logística ← Patrimônio
(F4)        (F6)
    ↓ ↓ ↓
    └─→ Financeiro (F7-8)
```

### **Tabelas que Dependem de Outras:**
| Tabela | Depende De | Fase |
|--------|-----------|------|
| partners | companies, partner_types, cities, ufs | 2 |
| purchase_orders | companies, partners, product_types | 3 |
| sales_orders | companies, partners, product_types | 5 |
| loadings | purchase_orders, sales_orders, vehicles, drivers | 4 |
| inventory | product_types, warehouse_locations | 6 |
| payables | purchase_orders, partners, contas_bancarias | 7 |
| receivables | sales_orders, partners, contas_bancarias | 7 |
| financial_history | payables, receivables, contas_bancarias | 7 |

---

## 5. Passos de Implementação (Para Cada Fase)

### **Template para Cada Fase:**

1. **Criar Tabelas**
   - Script SQL com CREATE TABLE
   - Chaves primárias (UUID ou TEXT)
   - Colunas obrigatórias (id, created_at, updated_at, company_id)
   - Índices para FK e campos de busca frequente

2. **Configurar RLS**
   - Política SELECT (para leitura)
   - Política INSERT (para criação)
   - Política UPDATE (para edição)
   - Política DELETE (para exclusão)
   - Diferenciar entre anonymous e authenticated

3. **Ativar Realtime**
   - `ALTER PUBLICATION supabase_realtime ADD TABLE table_name`
   - Verificar se permite broadcast de mudanças

4. **Integrar no Frontend**
   - Criar serviço TypeScript para cada tabela
   - Implementar listeners de Realtime
   - Atualizar cache local ao receber mudanças
   - Adicionar otimistic updates

5. **Testar**
   - CRUD (Create, Read, Update, Delete)
   - RLS (verificar quem vê o quê)
   - Realtime (mudança propaga em tempo real)
   - Integridade de dados (constraints funcionam)

---

## 6. Regras de Negócio Críticas

### **Compra → Financeiro**
```
Quando: purchase_order.status muda para "approved"
Então: Criar payable com:
  - amount = SUM(purchase_order_items.subtotal)
  - due_date = purchase_order.date + 30 dias (padrão)
  - status = "pending"
```

### **Venda → Financeiro**
```
Quando: sales_order.status muda para "approved"
Então: Criar receivable com:
  - amount = SUM(sales_order_items.subtotal) - discount
  - due_date = sales_order.date + 30 dias (padrão)
  - status = "pending"
```

### **Compra → Patrimônio**
```
Quando: purchase_receipt.receipt_date é salva
Então: Criar inventory_movement com:
  - to_location_id = localização padrão da empresa
  - movement_type = "inbound"
  - quantity = purchase_receipt.received_quantity
```

### **Venda → Patrimônio**
```
Quando: sales_order.status muda para "shipped"
Então: 
  1. Criar inventory_movement com:
     - from_location_id = localização do estoque
     - movement_type = "outbound"
     - quantity = sales_order_items.quantity
  2. Atualizar inventory.quantity_reserved
```

### **Logística → Patrimônio**
```
Quando: loading.status = "completed"
Então:
  Se inbound: inventory.quantity_on_hand += loading.weight_kg / item_weight
  Se outbound: inventory.quantity_on_hand -= loading.weight_kg / item_weight
```

---

## 7. Checklist de Migração

### **Fase 1** ✅
- [x] Tabelas de configuração
- [x] RLS configurado
- [x] Realtime ativo
- [x] Frontend integrado

### **Fase 2** 🔄 (Próxima)
- [ ] Tabelas de parceiros
- [ ] RLS configurado
- [ ] Realtime ativo
- [ ] Frontend integrado
- [ ] Testes de integridade

### **Fase 3-5** 📋
- [ ] Tabelas de Compra/Venda/Logística
- [ ] RLS configurado
- [ ] Realtime ativo
- [ ] Frontend integrado
- [ ] Triggers/Functions para criar payables/receivables

### **Fase 6** 📋
- [ ] Tabelas de Patrimônio
- [ ] RLS configurado
- [ ] Realtime ativo
- [ ] Frontend integrado
- [ ] Sincronização com Compra/Venda

### **Fase 7-8** 📋
- [ ] Payables & Receivables
- [ ] Views de Relatórios
- [ ] RLS configurado
- [ ] Realtime ativo
- [ ] Dashboard integrado

---

## 8. Notas Importantes

1. **Sempre Use Cascade Delete com Cuidado**
   - `partners.id` pode ter cascade em `partner_addresses` (deletar parceiro = deletar endereços)
   - Mas NÃO em `purchase_orders` ou `sales_orders` (auditoria precisa)

2. **Company_ID em Todas as Tabelas**
   - Multi-tenancy: cada empresa vê seus dados
   - Use `WHERE company_id = current_company_id` em todas as queries

3. **Soft Delete (Status = Cancelled)**
   - Em vez de deletar pedidos/movimentos, use status = "cancelled"
   - Preserva auditoria e integridade referencial

4. **Índices Críticos**
   - `partner_id` em purchase_orders, sales_orders, payables, receivables
   - `product_type_id` em inventory, inventory_movements
   - `company_id` em tudo
   - `status` para filtros frequentes

5. **Triggers/Functions**
   - Use triggers PostgreSQL para sincronizar payables/receivables com purchase/sales
   - Atualizar inventory automaticamente ao mudar status de logística

6. **Auditoria**
   - Todas as tabelas: `created_by` e `updated_by` (referência para auth.users)
   - Considerar `audit_log` separada para compliance

---

**Próximo Passo:** Iniciar Fase 2 - Parceiros
