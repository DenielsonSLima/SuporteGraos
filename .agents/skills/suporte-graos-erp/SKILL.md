---
name: suporte-graos-erp
description: >
  Skill especializada para desenvolvimento, depuração e manutenção do sistema ERP Grãos (suportegraoserp.vercel.app),
  desenvolvido pela Dailabs. Use esta skill SEMPRE que o usuário mencionar: pedido de compra, pedido de venda,
  carregamento, romaneio, logística, frete, financeiro, contas a pagar, contas a receber, adiantamentos, despesas,
  sócios, comissão, Supabase, fluxo de caixa, auditoria logística, ou qualquer módulo do ERP Grãos.
  Também acione para bugs, refatorações, novas features, queries SQL no Supabase, ou qualquer dúvida sobre
  o comportamento esperado do sistema. Esta skill contém o mapa completo do domínio de negócio e deve ser
  consultada antes de qualquer alteração de código para evitar regressões.
---

# Suporte Grãos ERP — Skill de Desenvolvimento

## 🚀 Proatividade com Ferramentas
- O agente tem acesso total ao `supabase-mcp-server`.
- **Proatividade:** O agente deve realizar consultas SQL, listar tabelas e verificar o banco de dados de forma proativa para resolver problemas ou validar implementações, sem necessidade de pedir permissão para cada comando (conforme acordado com o usuário).

## Visão Geral do Sistema

**Produto:** ERP para trading/corretagem de grãos (milho, soja, etc.)  
**Stack:** Next.js + Supabase (banco de dados principal)  
**URL:** suportegraoserp.vercel.app  
**Empresa:** Dailabs Creative AI & Software Design  
**Modelo de negócio:** Compra-se grão do produtor → carrega → envia ao comprador (sem estoque próprio)

---

## Módulos do Sistema

| Módulo | Função Principal |
|---|---|
| Parceiros | Cadastro de produtores, transportadoras, compradores |
| Ped. Compra | Contratos de compra com produtores |
| Ped. Venda | Contratos de venda para compradores |
| Logística | Gestão de fretes e transportadoras |
| Patrimônio | Ativos da empresa |
| Caixa | Saldo de contas bancárias |
| Financeiro | Central de fluxo de caixa |
| Performance | Indicadores e métricas |
| Relatórios | Exportações e análises |
| Configurações | Parametrização do sistema |

---

## Fluxo Central de Negócio

```
PRODUTOR → [Pedido de Compra] → [Carregamento / Romaneio]
                                         ↓
                              [Vínculo com Pedido de Venda]
                                         ↓
                              [EM TRÂNSITO para comprador]
                                         ↓
                         [Lança Peso de Descarga] ← GATILHO FINANCEIRO
                                         ↓
                    ┌─────────────────────────────────┐
                    ↓                                 ↓
          [Contas a Pagar]               [Contas a Receber]
          (Produtor + Frete)             (Comprador)
```

### Regras Críticas do Fluxo

1. **Carregamento vincula Compra ↔ Venda:** Ao adicionar um carregamento no Pedido de Compra, ele DEVE ser vinculado a um Pedido de Venda ativo.

2. **Gatilhos automáticos ao criar carregamento:**
   - Gera **Contas a Pagar** do produtor (valor do carregamento)
   - Gera **Contas a Pagar** do frete (transportadora)

3. **Status "Em Trânsito":** Pedido de Venda fica em trânsito enquanto `peso_descarga` é nulo ou zero.

4. **Gatilho do Contas a Receber:** Somente quando o `peso_descarga` é registrado no romaneio → gera Contas a Receber do comprador.

5. **Faturamento da venda:** Calculado com base no **peso de destino confirmado** (não pelo peso de origem).

---

## Pedido de Compra — Detalhamento

### Campos e Comportamentos

- **Quantidade / Preço / SC:** Unidade padrão é sacas (SC). 1 SC = 60kg
- **Saldo a Carregar:** Quantidade contratada menos o já carregado
- **Investimento Operacional Total:** Soma de todos os custos do pedido

### Sub-módulos do Pedido de Compra

#### 1. Carregamentos / Romaneios
- Cada carregamento tem: data, transportadora, motorista, peso carregado (origem), peso descarregado (destino)
- **Quebra/Ganho:** Diferença entre peso origem e destino
- Ao salvar carregamento → dispara criação automática de obrigações financeiras (ver Fluxo Central)

#### 2. Pagamentos ao Produtor (Fluxo de Caixa)
- Botão **Adiantamento:** Registra pagamento antecipado ao produtor (antes da entrega)
- Botão **Pagamento:** Quitação parcial ou total do pedido
- Barra de progresso: `valor_pago / valor_total_pedido`
- Pode ser pago aqui OU em **Financeiro > Contas a Pagar**

#### 3. Despesas Extras do Pedido
- Tipos:
  - **Debitar do Produtor:** Reduz o valor a pagar ao produtor (ex: despesa com balança)
  - **Custo da Empresa:** Acrescenta ao custo operacional do pedido (não debita do produtor)
- Exemplo: Devo R$100.000 ao produtor. Despesa de balança R$1.000 → "Debitar Produtor" = novo saldo a pagar: R$99.000

#### 4. Comissão
- Calculada por SC carregado
- Pode ser paga:
  - Diretamente no campo de comissão do Pedido de Compra
  - Em **Financeiro > Contas a Pagar > Comissões**

---

## Pedido de Venda — Detalhamento

### Campos e Comportamentos

- **Preço de Venda:** Por SC (ex: R$80,00/SC)
- **Faturamento:** Baseado no peso de destino confirmado
- **Status de Carga:** Em Trânsito / Descarregado

### Auditoria Logística de Saídas
Exibe cargas vinculadas com:
- Data da carga
- Logística (empresa/motorista)
- Peso carregado / Peso descarregado
- Quebra/Ganho
- Valor total
- Pedido de Entrada vinculado
- SC Compra (custo da saca)

### Recebimentos do Pedido
- **Só aparece/ativa após peso de descarga ser lançado**
- Progresso: `valor_recebido / valor_faturado`
- Pode receber aqui OU em **Financeiro > Contas a Receber**

### Anotações da Venda
- Campo livre para observações internas sobre aquele pedido

---

## Módulo Início (Dashboard Home)

### Ticker de Mercado (Topo)
Barra em tempo real com cotações:
- **Comercial** (dólar)
- **Soja (Paranaguá)** — R$/SC com variação %
- **Milho (MT)** — R$/SC com variação %
- **Arroz (RS)** — R$/SC com variação %

### KPIs do Dashboard

| Card | Descrição |
|---|---|
| Saldo Disponível | Soma dos saldos de todas as contas bancárias (disponibilidade imediata) |
| Contas a Pagar | Total de obrigações operacionais em aberto |
| Contas a Receber | Total de vendas faturadas ainda não recebidas |
| Em Trânsito | Valor total das cargas atualmente na estrada |
| Patrimônio Líquido | Ativos - Passivos (saúde financeira consolidada) |

### Gráficos do Dashboard

**Evolução Patrimonial (Últimos 6 Meses)**
- Barras: Ativos (verde) e Passivos (vermelho) por mês
- Linha: Patrimônio Líquido (roxo) = Ativos - Passivos
- Indicador de variação % no período

**Resultado & Spread (Últimos 3 Meses)**
- Linha Receita vs Despesas por mês

---

## Módulo Logística — Detalhamento

### KPIs do Módulo

| Card | Descrição |
|---|---|
| Total Fretes (Contratado) | Soma de todos os fretes do período filtrado |
| Total Pago | Adiantamentos + saldos já quitados |
| Saldo a Pagar | Pendência financeira com transportadoras |
| Volume Movimentado | Total em toneladas / número de cargas em trânsito |

### Filtros
- Data Inicial / Data Final
- Transportadora (todas ou específica)
- Busca por placa, motorista ou pedido

### Abas da Lista de Fretes

| Aba | Conteúdo |
|---|---|
| Em Aberto | Fretes com saldo pendente |
| Financeiro | Visão financeira de todos os fretes |
| Histórico | Fretes já quitados/encerrados |

### Sub-abas de Filtro da Lista
- **Ambos (Geral):** todos os fretes
- **Pendentes de Descarrego:** carga em trânsito, peso destino ainda não confirmado
- **Financeiro em Aberto:** descarregados mas não pagos

### Colunas da Tabela de Logística
`Data/Pedido | Transp./Motorista | Rota (Origem → Destino) | Peso Car. | Peso Desc. | Quebra | Frete/T | Total Bruto | Total Pago | Pendente | Base | Ações`

### "Valor em Risco"
= Valor total das cargas em trânsito vinculadas aos fretes listados.  
Representa exposição financeira caso haja problema na entrega.

---

## Modal: Gestão Logística de Carga

Aberto ao clicar em uma carga na lista de Logística.  
Título: **GESTÃO LOGÍSTICA DE CARGA** | Pedido + Data

### Aba: Dados da Carga

**Seção: Pesagem e Conferência de Quebra**
- **Peso Origem (Carregamento):** peso no momento da saída (imutável após confirmação)
- **Peso Destino (Chegada):** campo editável — preenchido quando a carga chega
- Botão **CONFIRMAR** → gatilho crítico que dispara:
  - Cálculo de quebra/ganho
  - Geração de Contas a Receber no Pedido de Venda
  - Atualização do status de "Em Trânsito" para "Descarregado"
  - Atualização do faturamento da venda (base = peso destino)

**Seção: Financeiro Compra**
- Valor Unit. (SC): preço pago ao produtor por saca
- Total a Pagar: valor total do pedido de compra vinculado

**Seção: Financeiro Venda**
- Valor Unit. (SC): preço de venda por saca
- Total Projetado: faturamento projetado (antes de confirmar peso destino)

**Seção: Custo Logístico**
- Preço (TON): custo do frete por tonelada
- Toggle **BASE ORIGEM / BASE DESTINO:** define se o frete é calculado pelo peso de saída ou de chegada
- Total Frete: custo total do frete

**Seção: Resultado da Carga**
```
Receita:        R$ XX (faturamento da venda)
(-) Custos:     R$ XX (compra + frete + despesas)
─────────────────────────────
Lucro Líquido:  R$ XX  (X.XX% Margem)
```

### Aba: Financeiro do Frete

**Campos:**
- Valor Bruto Frete
- Extras / Descontos (+R$ | -R$)
- Líquido a Pagar
- Saldo Pendente

**Sub-seções:**
- **Despesas do Motorista:** lançar itens de despesa do motorista (pedágio, refeição, etc.) — botão LANÇAR ITEM
- **Pagamentos Efetuados:** histórico de pagamentos — botão **BAIXAR FRETE** (quita o frete)

### Botão ESTRUTURAL
Modo de edição avançado da carga (dados estruturais do romaneio).

### ⚠️ Regra Crítica: Pagamento de Frete
Pode ser quitado por dois caminhos — **nunca deve gerar duplicidade:**
1. Modal Gestão Logística → aba Financeiro do Frete → **BAIXAR FRETE**
2. Financeiro → Contas a Pagar → filtrar fretes → pagar

Implementar com `id_referencia` + `tipo_origem = 'frete'` em `contas_pagar`.

> Para detalhes completos do modal, consulte `references/logistica.md`

---

## Módulo Financeiro — Detalhamento Completo

### Subseções

```
Financeiro/
├── Contas a Pagar       ← gestão de saídas
├── Contas a Receber     ← gestão de entradas
├── Adiantamentos        ← saldos de parceiros
├── Créditos             ← outros créditos
├── Transferências       ← movimentação interna entre contas
├── Empréstimos          ← contratos bancários
├── Despesas             ← fixas, variáveis e administrativas
├── Sócios               ← aportes e retiradas
└── Histórico Geral      ← extrato completo
```

### Contas a Pagar
**Origens possíveis:**
- Carregamento de Pedido de Compra (produtor)
- Frete de carregamento (transportadora)
- Comissão de pedido de compra
- Despesa lançada manualmente

**Filtros da tela principal:**
- Fornecedores (Abertos)
- Fretes (Abertos)
- Comissões (Abertas)
- Visão Geral (Todos)

**Dívida Consolidada por Parceiro:** Agrupa todos os pedidos em aberto de um mesmo parceiro.

### Contas a Receber
**Origem:** Exclusivamente do Pedido de Venda quando peso de descarga é lançado.

### Adiantamentos
- Registra valores adiantados a um parceiro (produtor, transportadora) antes do serviço
- Também registra adiantamentos recebidos de compradores
- Fica como saldo vinculado ao parceiro para abatimento posterior

### Despesas
- **Fixa:** Recorrente mensal (aluguel, salário, etc.) → lançar como recorrência
- **Variável:** Pontual → pode ser:
  - **Baixa imediata:** Pago na hora do lançamento
  - **A prazo:** Lança para pagar depois (gera entrada em Contas a Pagar)

### Sócios
- Registro mensal de pró-labore → fica como **saldo do sócio**
- Sócio pode **retirar** o saldo acumulado a qualquer momento
- Registrar aporte de capital dos sócios

### Transferências
- Movimentação entre contas bancárias internas
- Não afeta resultado financeiro, apenas distribuição de saldo

### Histórico Geral
- Extrato completo de todas as movimentações
- Filtros por período, tipo, parceiro, conta

---

## Banco de Dados — Supabase

### Convenções Importantes
- Banco PostgreSQL no Supabase
- **Sempre usar RLS (Row Level Security)** nas tabelas sensíveis
- Campos de valor em `numeric` ou `decimal`, NUNCA `float`
- Datas em `timestamptz` (com timezone)
- Status como `text` com check constraint OU `enum` type

### Tabelas Centrais (Mapeamento Conceitual)

```sql
-- Núcleo do negócio
pedidos_compra          → contratos com produtores
pedidos_venda           → contratos com compradores
carregamentos           → romaneios de carga (liga compra ↔ venda)

-- Financeiro
contas_pagar            → obrigações de saída
contas_receber          → direitos de entrada
adiantamentos           → saldos antecipados por parceiro
despesas                → custos operacionais
socios_saldo            → saldo acumulado de sócios
transferencias          → movimentações internas
emprestimos             → contratos bancários

-- Suporte
parceiros               → produtores, transportadoras, compradores
transportadoras         → detalhamento logístico
motoristas              → vinculados a transportadoras
contas_bancarias        → contas da empresa
```

### Gatilhos Críticos (Triggers/Functions Supabase)

Toda alteração nestas operações pode ter efeito cascata:

| Operação | Efeito Cascata |
|---|---|
| INSERT em `carregamentos` | Cria registro em `contas_pagar` (produtor) + `contas_pagar` (frete) |
| UPDATE `peso_descarga` em `carregamentos` | Cria/atualiza registro em `contas_receber` |
| DELETE em `carregamentos` | Deve reverter/cancelar os `contas_pagar` gerados |
| Pagamento em `pedidos_compra` | Atualiza status em `contas_pagar` |
| Recebimento em `pedidos_venda` | Atualiza status em `contas_receber` |

> ⚠️ **ATENÇÃO AO FAZER ALTERAÇÕES:** Modificar qualquer uma dessas operações sem considerar os efeitos cascata é a principal causa de bugs. Sempre rastrear todos os pontos de escrita antes de alterar.

---

## Guia Anti-Regressão (Principais Fontes de Bugs)

### 1. Dupla Contabilização
**Problema:** Pagar frete na Logística E no Financeiro sem sincronização  
**Solução:** Verificar se existe `id_referencia` e `tipo_origem` em `contas_pagar` para evitar duplicatas

### 2. Contas a Receber Prematuro
**Problema:** Gerar contas a receber antes do peso de descarga  
**Solução:** Sempre checar `peso_descarga IS NOT NULL AND peso_descarga > 0` antes de criar

### 3. Cálculo de Saldo do Pedido de Compra
**Problema:** Saldo a carregar incorreto  
**Fórmula correta:** `saldo_carregar = qtd_contratada - SUM(peso_carregado de carregamentos ativos)`

### 4. Faturamento da Venda
**Problema:** Usar peso de origem em vez de destino  
**Regra:** Faturamento SEMPRE pelo `peso_descarga` (peso de destino confirmado)

### 5. Despesas Produtores
**Problema:** Despesa marcada como "debitar produtor" não reduz o saldo a pagar  
**Solução:** Verificar se o cálculo do `valor_liquido_pedido` considera `SUM(despesas WHERE tipo = 'debitar_produtor')`

### 6. Adiantamentos Não Abatidos
**Problema:** Adiantamento registrado mas não deduzido do saldo final  
**Solução:** `saldo_a_pagar = valor_total - pagamentos_realizados - adiantamentos_vinculados`

---

## Checklist Antes de Qualquer Alteração

- [ ] Identificar TODAS as tabelas afetadas pela mudança
- [ ] Verificar se existe trigger/function Supabase relacionado
- [ ] Mapear os 2 caminhos de pagamento (módulo específico + financeiro central)
- [ ] Testar com carregamento em trânsito E carregamento já descarregado
- [ ] Verificar se despesas estão sendo somadas/subtraídas corretamente
- [ ] Confirmar que adiantamentos estão sendo abatidos no cálculo final
- [ ] Checar que nenhum contas a pagar/receber foi duplicado

---

## Terminologia do Domínio

| Termo | Significado |
|---|---|
| SC | Saca — unidade de medida (60kg) |
| Romaneio | Documento de carregamento de uma carga |
| Quebra | Perda de peso entre origem e destino |
| Ganho | Acréscimo de peso entre origem e destino |
| Produtor | Vendedor do grão (fornecedor) |
| Comprador / Destino | Empresa compradora do grão |
| Transportadora | Empresa de frete |
| Faturamento | Valor a receber baseado no peso de destino |
| Custo Saca | Preço pago por SC ao produtor |
| Venda/SC | Preço recebido por SC do comprador |
| Margem | (Venda/SC - Custo/SC) / Venda/SC |
| Pro Labore | Remuneração mensal dos sócios |
| Em Trânsito | Carga saiu da origem, não chegou ao destino |

---

---

## Módulo Performance — Resumo

Cockpit operacional com filtros 3M/6M/9M/12M/TUDO e exportação PDF.

**KPIs centrais:** Receita Total, Total Débitos, Resultado (Saldo), Volume TON/SC, Média Venda/SC, Média Compra/SC, Frete/SC, Lucro Líq./SC, Margem Geral %.

> ⚠️ Receitas incluem mercadoria **em trânsito** (projetada, não realizada) — sinalizar na UI.

**Fórmulas críticas:**
- `Margem Geral = Resultado / Receita Total × 100`
- `Lucro Líq./SC = Resultado / Volume SC`
- `Frete/SC = SUM(custo_frete) / Volume SC`

> Para todas as fórmulas e gráficos, consulte `references/performance-caixa.md`

---

## Módulo Caixa — Resumo

Fluxo de caixa mensal com conceito de **mês aberto / fechado**.

**Fórmula do Patrimônio Líquido:**
```
PL = Total Ativos - Total Passivos
   = (Recebíveis + Patrimônio + Mercad.Trânsito + Adiantamentos)
   - (Fornecedores + Fretes + Comissões + Sócios + Empréstimos)
```

**Regras críticas:**
- Mercadoria em Trânsito → migra para Recebíveis após confirmar peso destino
- Adiantamento concedido: sai da Disponibilidade, entra em Ativo (compensa na quitação)
- Meses fechados = snapshots imutáveis

> Para detalhes completos de Ativos/Passivos, consulte `references/performance-caixa.md`

---

## Referências Adicionais

Para detalhes específicos de cada módulo, consulte os arquivos em `references/`:

- `references/pedido-compra.md` — Detalhes completos do módulo de compra
- `references/pedido-venda.md` — Detalhes completos do módulo de venda  
- `references/financeiro.md` — Regras detalhadas do módulo financeiro
- `references/supabase-schema.md` — Schema SQL detalhado das tabelas
- `references/bugs-conhecidos.md` — Histórico de bugs e soluções aplicadas
