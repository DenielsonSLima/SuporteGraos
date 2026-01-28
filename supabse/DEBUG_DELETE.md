# Debug DELETE no Supabase - Instruções

## Problema
- Ao deletar contas bancárias: item desaparece localmente mas volta ao reload
- Ao deletar tipos de despesa: mesmo problema
- DELETE pode estar falhando silenciosamente ou RLS/constraints bloqueando

## Solução de Debug

### Passo 1: Abrir DevTools
1. Acesse http://localhost:3002/
2. Pressione `F12` para abrir DevTools
3. Vá para a aba "Console"

### Passo 2: Tentar deletar um item
1. Vá para **Configurações → Contas Bancárias**
2. Crie uma nova conta bancária (ex: "Banco Teste Delete")
3. Tente deletar essa conta
4. **Observe os logs no console do DevTools**

### Passo 3: Analisar os logs

Você verá logs como:
```
🔴 [1/5] Iniciando DELETE de conta: xxx
🔴 [2/5] Conta não possui movimentações, deletando localmente...
🔴 [3/5] Deletado localmente. Tentando deletar no Supabase...
🔴 [3.5] Registro encontrado antes de DELETE: [...]
🔴 [4/5] DELETE Response: { data: [...], error: null, status: 204, dataLength: 1 }
✅ [5/5] Conta excluída do Supabase (1 registros removidos)
```

### Passo 4: Verificar o que está acontecendo

**Se vir erro na resposta:**
- `error: {...}` → RLS ou constraint do Supabase está bloqueando
- Screenshot do erro completo e me envie

**Se vir `dataLength: 0`:**
- `🔴 [4.7] DELETE retornou 0 registros` → Supabase aceitou mas não deletou nada
- Pode ser RLS silencioso ou usuário não tem permissão

**Se disser "DELETE funcionou" mas item volta:**
- Problema é o Realtime trazendo de volta
- Precisa desabilitar Realtime ou ajustar a lógica

## Outras Telas de Teste

### Contas Bancárias
- **Caminho:** Configurações → Contas Bancárias
- **Teste:** Criar e deletar conta
- **Logs esperados:** Veja acima

### Tipos de Despesa
- **Caminho:** Configurações → Tipos de Despesas
- **Teste:** Criar tipo "Teste Despesa", deletar
- **Logs esperados:** Similar ao acima, mas em `expense_types` table

### Saldos Iniciais
- **Caminho:** Configurações → Saldos Iniciais
- **Teste:** Criar saldo inicial para uma conta, deletar
- **Logs esperados:** Similar ao acima, mas em `initial_balances` table

## Checklist para Troubleshooting

- [ ] DELETE mostra erro no console? Qual é?
- [ ] DELETE mostra dataLength: 0? Indica RLS
- [ ] DELETE mostra dataLength: 1? Mas volta ao reload?
  - Então é problema do Realtime
- [ ] Qual tabela está afetada?
  - contas_bancarias
  - expense_types
  - initial_balances

## Próximas Ações
1. Colete os logs da console
2. Identifique qual é o padrão de erro
3. Se RLS: Verificar policies no Supabase
4. Se Realtime: Ajustar handler DELETE para não re-adicionar
