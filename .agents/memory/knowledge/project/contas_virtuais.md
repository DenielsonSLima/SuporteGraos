# 🧠 Contas Virtuais e Lógica de Ocultação no Módulo Caixa

Este documento registra as diretrizes, propósito e blindagem aplicados às Contas Virtuais no ERP Suporte Grãos, especificamente no que diz respeito à sua ocultação obrigatória no Módulo Caixa.

---

## 🏛️ Contexto e Propósito

As contas classificadas como **Virtuais** (por exemplo, a conta com ID `97e8bd30-3ba1-4658-a51e-5df6ce184845`, cujo `account_name` é `"Contas Virtuais"` e o `owner` é `"Ajustes Virtual"`) servem unicamente como facilitadores e orquestradores de transações internas no sistema, tais como:
1. **Descontos / Abatimentos**: Lógica de compensação financeira interna de pedidos sem comprometer o fluxo de transações bancárias reais de entrada/saída.
2. **Adiantamentos de Fretes**: Utilização do saldo virtual para controlar adiantamentos concedidos a motoristas ou transportadoras temporariamente antes de sua devida conciliação em conta real.

Estas contas residem fisicamente na tabela `accounts` sob o tipo `'bank'`, permitindo que transações financeiras sejam vinculadas a elas.

---

## 🚨 Regra de Negócio: Ocultação Absoluta no Caixa

> [!WARNING]
> **A conta "Ajustes Virtual" (ou qualquer conta virtual de uso interno) NUNCA deve ser exibida no Módulo Caixa.**
> O usuário final não deve ver essa conta na seção **Contas & Disponibilidades**, tampouco no painel de **Saldos de Abertura**, e sob nenhuma hipótese ela deve aparecer nos relatórios em PDF.

### Por que ocultar?
- É um mecanismo estritamente técnico e interno do ERP.
- A exibição dela com valor `R$ 0,00` ou valores flutuantes de ajuste apenas confunde o operador e polui a auditoria do caixa de liquidez real.

---

## 🛠️ Blindagem Técnica Implementada

Para garantir que futuras manutenções ou novas consultas no banco não "vazem" essa conta novamente para a UI, implementou-se a seguinte blindagem no frontend (camada de serviços):

1. **Filtragem das Listas**:
   Tanto no serviço de caixa atual ([cashierReportService.ts](file:///Users/denielson/Desktop/SuporteGraos-main/services/cashierReportService.ts)) quanto no histórico retroativo ([historyService.ts](file:///Users/denielson/Desktop/SuporteGraos-main/modules/Cashier/services/cashier-history/historyService.ts)), os arrays de saldos bancários (`bankBalances`, `initialMonthBalances` e `initialBalances`) são ativamente filtrados em tempo de execução:
   ```typescript
   const VIRTUAL_ACCOUNT_ID = '97e8bd30-3ba1-4658-a51e-5df6ce184845';
   
   const filteredList = list.filter(acc => {
     const accId = acc.id || acc.accountId;
     const accName = (acc.bankName || acc.accountName || '').toLowerCase();
     const accOwner = (acc.owner || '').toLowerCase();
     
     return accId !== VIRTUAL_ACCOUNT_ID && 
            !accName.includes('virtual') && 
            !accOwner.includes('virtual');
   });
   ```

2. **Recálculo de Consistência Matemática**:
   Para evitar que os totais exibidos (como **Total Bancos** ou **Disponível em Banco**) mostrem divergências matemáticas em relação à soma física das contas listadas na tela:
   - Os saldos das contas virtuais expurgadas são somados.
   - O valor resultante é deduzido de:
     - `totalBankBalance` (Saldo consolidado de bancos)
     - `totalInitialMonthBalance` (Saldo inicial consolidado do mês)
     - `totalInitialBalance` (Saldo consolidado de abertura)
     - `totalAssets` (Ativos gerais)
   - O `netBalance` (Patrimônio Líquido Real) é recalculado de forma limpa como `totalAssets - totalLiabilities`.

Com isso, a integridade matemática da tela e dos relatórios PDF do caixa é matematicamente perfeita, sem vazamentos de contas internas.
