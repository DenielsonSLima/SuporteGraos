# Performance & Caixa — Referência Detalhada

## Módulo Performance Analítica

### Todos os KPIs e Fórmulas

| Indicador | Descrição | Fórmula |
|---|---|---|
| Receita Total | Faturamentos confirmados (peso destino) | SUM(faturamento cargas descarregadas) |
| Total Débitos | Todos os custos operacionais | SUM(compra + frete + despesas + estrutura) |
| Resultado (Saldo) | Lucro líquido do período | Receita Total - Total Débitos |
| Volume (TON) | Peso real consolidado | SUM(peso_descarga) / 1000 |
| Volume (SC) | Sacas 60kg operadas | SUM(peso_descarga) / 60 |
| Média Venda | Receita por saca | Receita Total / Volume SC |
| Média Compra | Custo grão por saca | SUM(custo_compra) / Volume SC |
| Gastos com Recusa | Custo extra de redirecionamento | SUM(despesas onde tipo = 'recusa') |
| Frete Médio (T) | Logística por tonelada | SUM(custo_frete) / Volume TON |
| Frete (R$/SC) | Logística por saca | SUM(custo_frete) / Volume SC |
| Estrutura (R$/SC) | ADM/fixo sem grão/frete | SUM(despesas_fixas_variaveis) / Volume SC |
| Lucro Líq. (SC) | Sobra real final por saca | Resultado / Volume SC |
| Margem Geral | Eficiência de lucro | Resultado / Receita Total × 100 |

### Gráficos
- **Evolução do Lucro Líquido Mensal:** linha por mês, período configurável
- **Composição de Receitas:** pizza/barra por tipo (Mercad. em Trânsito, Vendas realizadas)
- **Composição de Débitos:** pizza/barra (Fornecedores Grãos, Fretes, Estrutura)
- **Resultado & Spread:** Receita vs Despesas por mês (últimos 3 meses no dashboard home)

### Regra de Escopo de Dados
- Receita inclui cargas **em trânsito** como receita projetada (intencional)
- Filtros de período: 3M / 6M / 9M / 12M / TUDO
- Base de cálculo: sempre pelo peso destino quando disponível, peso origem quando em trânsito

---

## Módulo Caixa — Detalhamento Completo

### Estrutura
```
Caixa/
├── Fechamento Atual (Mês Vigente)    ← ABERTO, valores dinâmicos
└── Histórico de Meses Anteriores    ← FECHADO, snapshots imutáveis
```

### Cards do Cabeçalho

| Campo | Descrição |
|---|---|
| Patrimônio Líquido | Sobra real projetada (Ativos - Passivos) |
| Disponibilidade | Saldo atual em contas bancárias |
| Total Ativos | Receitas + Patrimônio |
| Total Passivos | Dívidas e obrigações em aberto |
| Saldo Inicial Impl. | Aporte inicial no momento de implantação do sistema |

### Saldos de Abertura do Período
- Posição de cada conta bancária no dia 01 do mês
- Soma Inicial Consolidada = total disponível no início

### Composição de Ativos & Bens

| Item | O que representa |
|---|---|
| Recebíveis de Vendas | Contas a receber em aberto (descarregados, não pagos) |
| Patrimônio (Bens Ativos) | Valor dos bens do módulo Patrimônio |
| Vendas de Bens (a Receber) | Alienação de patrimônio não recebida |
| Haveres de Sócios | Valores que sócios devem à empresa |
| Empréstimos Concedidos | Valores emprestados pela empresa |
| Mercadoria em Trânsito | Valor projetado das cargas na estrada (peso_origem × preço_venda) |
| Adiantamentos Concedidos | Adiantamentos a parceiros ainda não compensados |

### Composição de Passivos & Obrigações

| Item | O que representa |
|---|---|
| Fornecedores (Grãos) | Contas a pagar a produtores |
| Fretes a Pagar | Contas a pagar a transportadoras |
| Comissões a Pagar | Comissões não quitadas |
| Obrigações com Sócios | Pró-labore e saldo acumulado não retirado |
| Empréstimos Tomados | Contratos bancários em aberto |
| Adiant. de Clientes | Valores recebidos antecipados de compradores |

### Regras de Transição de Status

**Mercadoria em Trânsito → Recebíveis:**
- ANTES do peso destino: valor em "Mercadoria em Trânsito" (Ativo)
- APÓS confirmar peso destino: migra para "Recebíveis de Vendas" (Ativo)
- O Ativo permanece, mas muda de categoria

**Adiantamento concedido:**
- Ao lançar: Disponibilidade ↓, Adiantamentos Concedidos ↑ (troca dentro do Ativo)
- Ao compensar na quitação: Adiantamentos Concedidos ↓ + Fornecedores ↓ (reduz Passivo)

### Contas Bancárias Cadastradas (Exemplo)
- Anhanguera (Sr. José)
- Banco C6 (Suporte Grãos)
- Banco do Brasil (Ronaldo Oliveira)
- Sicredi (Suporte Grãos)
