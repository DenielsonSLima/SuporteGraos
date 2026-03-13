# Logística — Referência Detalhada

## Modal: Gestão Logística de Carga

Aberto ao clicar em uma carga na lista de Logística.  
Título: **GESTÃO LOGÍSTICA DE CARGA** | Pedido + Data

---

### Aba: Dados da Carga

**Seção: Informações do Pedido**
- Preço Compra (R$/SC): custo do grão
- Produto: tipo do grão (ex: Milho em Grãos)
- Motorista vinculado
- Destino / Pedido de Venda vinculado

**Seção: Pesagem e Conferência de Quebra**
- **Peso Origem (Carregamento):** peso na saída — imutável após confirmação
- **Peso Destino (Chegada):** campo editável (destacado em amarelo quando pendente)
- Botão **CONFIRMAR** → **gatilho crítico** que dispara:
  1. Cálculo da quebra/ganho (Destino - Origem)
  2. Geração de Contas a Receber no Pedido de Venda
  3. Status muda de "Em Trânsito" para "Descarregado"
  4. Faturamento da venda calculado com base no peso destino
  5. Performance analítica atualizada

**Seção: Financeiro Compra**
- Valor Unit. (SC): preço pago ao produtor por saca
- Total a Pagar: valor total do pedido de compra vinculado a esta carga

**Seção: Financeiro Venda**
- Valor Unit. (SC): preço de venda ao comprador por saca
- Total Projetado: faturamento projetado usando peso origem (antes de confirmar destino)
  - Após confirmar peso destino → vira "Total Faturado" com base real

**Seção: Custo Logístico**
- Preço (TON): custo do frete por tonelada
- Toggle **BASE ORIGEM / BASE DESTINO:**
  - BASE ORIGEM: frete calculado sobre peso carregado
  - BASE DESTINO: frete calculado sobre peso descarregado
- Total Frete: custo total do frete para esta carga

**Seção: Resultado da Carga**
```
Receita:          R$ XX,XX   (faturamento venda)
(-) Custos:       R$ XX,XX   (compra + frete + despesas)
──────────────────────────────────────────────
Lucro Líquido:    R$ XX,XX   (X.XX% Margem)
```

---

### Aba: Financeiro do Frete

**Campos de Resumo:**
- **Valor Bruto Frete:** valor base contratado
- **Extras / Descontos:** acréscimos e abatimentos (+R$ | -R$)
- **Líquido a Pagar:** Bruto + Extras - Descontos
- **Saldo Pendente:** Líquido a Pagar - Total Pago

**Sub-seção: Despesas do Motorista**
- Lançar itens de despesa (pedágio, refeição, ajudante, etc.)
- Botão: LANÇAR ITEM
- Cada item: descrição + valor + se debita do frete ou é custo empresa

**Sub-seção: Pagamentos Efetuados**
- Histórico de pagamentos ao freteiro
- Botão: **BAIXAR FRETE** — quita o saldo pendente
- Ao baixar: registra data, valor, conta bancária debitada

---

### Botão ESTRUTURAL
Modo avançado de edição — permite alterar dados estruturais do romaneio após criação.  
Usar com cautela: alterações estruturais podem invalidar cálculos já realizados.

---

## Colunas Completas da Tabela de Logística

| Coluna | Descrição |
|---|---|
| Data/Pedido | Data da carga e número do pedido de compra |
| Transp./Motorista | Nome da transportadora e motorista |
| Rota (Origem → Destino) | Local de coleta e entrega |
| Peso Car. | Peso no carregamento (kg) |
| Peso Desc. | Peso no descarregamento (kg) — "Pendente" se em trânsito |
| Quebra | Diferença de peso (negativo = perda, positivo = ganho) |
| Frete/T | Valor do frete por tonelada |
| Total Bruto | Valor total do frete (base + extras) |
| Total Pago | Soma dos pagamentos já efetuados |
| Pendente | Saldo em aberto |
| Base | BASE ORIGEM ou BASE DESTINO |
| Ações | Abrir modal, editar, etc. |
