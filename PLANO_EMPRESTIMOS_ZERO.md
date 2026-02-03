# PLANO DE EMPRÉSTIMOS DO ZERO

## 📋 REQUISITOS DO USUÁRIO

### Campos do Formulário (Mantendo Design):
1. **Data** - Data do contrato
2. **Descrição** - Nome/descrição do empréstimo
3. **Valor do Contrato** - Valor total emprestado
4. **Tipo** - Tomado ou Cedido (botões toggle)
5. **Valor a Pagar** - Saldo pendente
6. **Conta Bancária** - Qual conta foi afetada

### Fluxo Esperado:

#### Quando cria um Empréstimo **TOMADO**:
- Retira valor da conta bancária
- Cria registro em "Contas a Receber" (a pessoa vai pagar de volta)
- Atualiza saldo da conta

#### Quando cria um Empréstimo **CEDIDO**:
- Adiciona valor à conta bancária
- Cria registro em "Contas a Pagar" (você vai receber de volta)
- Atualiza saldo da conta

#### Histórico Geral:
- Cria registro de débito/crédito na conta escolhida
- Mostra movimento de caixa

---

## 🗃️ ESTRUTURA DE DADOS

### Tabela Atual: `standalone_records`
```
id | description | entity_name | category | sub_type | original_value | paid_value | status | issue_date | due_date | ...
```

### Novos campos necessários:
- `loan_type` → 'taken' | 'granted' (ou usar sub_type diferente)
- `remaining_balance` → Valor a pagar
- `bank_account_id` → Qual conta foi afetada

---

## 🛠️ ETAPAS DE IMPLEMENTAÇÃO

### ✅ ETAPA 1: Entender Estrutura
- [x] Analisar formulário
- [x] Entender standalone_records
- [x] Entender contas bancárias

### 📝 ETAPA 2: Redesenhar Formulário
- [ ] Simplificar campos (Data, Desc, Valor, Tipo, Saldo, Conta)
- [ ] Remover campos desnecessários (juros, parcelas, etc)
- [ ] Manter design visual

### 🗄️ ETAPA 3: Estrutura BD (Supabase)
- [ ] Verificar se standalone_records suporta os novos campos
- [ ] Se não, criar/modificar tabela
- [ ] Definir triggers ou lógica de cálculo de saldo

### 💻 ETAPA 4: Implementar Serviço
- [ ] Criar função de salvar empréstimo
- [ ] Atualizar conta bancária
- [ ] Criar registro em contas a receber/pagar

### 🧪 ETAPA 5: Testar
- [ ] Criar empréstimo tomado → verifica saldo banco
- [ ] Criar empréstimo cedido → verifica saldo banco
- [ ] Verifica histórico geral

---

## ❓ DÚVIDAS A ESCLARECER

1. **"Valor a Pagar"** = Saldo pendente ou parcela mensal?
2. **Juros e parcelas** = Deixamos de fora por enquanto?
3. **Quando marca como "Pago"** = Como funciona? Manual?
4. **Histórico** = Deve aparecer em "Contas a Pagar" e "Contas a Receber"?
