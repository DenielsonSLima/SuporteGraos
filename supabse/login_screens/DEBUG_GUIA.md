# 🔍 GUIA DE DEBUG - TELA INICIAL

## 📍 ERRO DIAGNOSTICADO

Você está vendo a mensagem de sucesso mas:
- ✅ Toast aparece: "Sincronizado com Sucesso"
- ❌ Dados NÃO salvam no Supabase
- ❌ Se recarregar página, imagem desaparece
- ❌ Apenas localStorage tem os dados

**Causa:** A função `saveSettings()` está tendo um erro silencioso que não aparece no toast.

---

## 🛠️ COMO DEBUGAR AGORA

### PASSO 1: Abrir Console (F12)

1. Acesse http://localhost:3007/
2. Clique em **F12** (DevTools)
3. Vá para a aba **Console**
4. Limpe com `console.clear()`

### PASSO 2: Fazer Upload de Imagem

1. Configurações → Tela Inicial
2. Clique em um slot vazio (UPLOAD)
3. Selecione uma imagem
4. Clique em "SALVAR E APLICAR GALERIA"

### PASSO 3: Observar Logs Detalhados

Na console você verá algo como:

```
💾 Iniciando salvamento de imagens... {total: 1}
📸 Processando imagem 1/1
🔍 Total de imagens no cache: 0
🔎 Existente na posição 0: NÃO
➕ Criando nova imagem na posição 0
[loginScreenService] Inserindo imagem na posição 0...
[loginScreenService] ✅ Imagem salva! ID: xxx-xxx-xxx
⚙️ Salvando configuração de rotação...
⚙️ Config salva: true
💾 Salvando backup em localStorage...
💾 Backup localStorage: ✅ OK
🎉 SUCESSO! Todas as imagens foram salvas.
```

### PASSO 4: Se Vir Erro

Se vir algo como:

```
❌ ERRO CRÍTICO ao salvar: {
  message: "..."
  code: "..."
  status: 409
  fullError: {...}
}
```

**Anote o `status` e `message`** - esse é o problema real!

---

## 🚨 ERROS COMUNS & SOLUÇÕES

### ❌ Erro 409 (Conflict)
**Causa:** Tentando inserir imagem na mesma posição 2x
**Solução:** Mudar constraint da tabela
```sql
-- No Supabase SQL Editor:
ALTER TABLE public.login_screens 
DROP CONSTRAINT IF EXISTS login_screens_pkey CASCADE;

ALTER TABLE public.login_screens 
ADD PRIMARY KEY (id);
```

### ❌ Erro 403 (Forbidden)
**Causa:** RLS bloqueando - usuário não autenticado
**Solução:** Verificar se usuário está logado
```javascript
// No console:
const { data: { user } } = await supabase.auth.getUser();
console.log("Usuário:", user?.email);
```

### ❌ Erro 401 (Unauthorized)
**Causa:** Sessão expirada
**Solução:** Fazer logout e login novamente

### ❌ TypeError "loginScreenService is not defined"
**Causa:** Import não funcionou
**Solução:** Verificar linha 5 de LoginScreenSettings.tsx
```tsx
import { loginScreenService } from '../../../services/loginScreenService';
```

---

## 🔬 TESTES ADICIONAIS

### Teste 1: Verificar se Supabase está online

```javascript
// No console do navegador:
await supabase.from('login_screens').select('id').limit(1);
```

Deve retornar dados ou erro, não undefined.

### Teste 2: Verificar RLS

```javascript
// No console:
await supabase
  .from('login_screens')
  .insert([{ 
    sequence_order: 99,
    image_url: 'https://test.com',
    source: 'upload',
    is_active: true
  }]);
```

Se der erro 42501, é problema de RLS.

### Teste 3: Verificar localStorage

```javascript
// No console:
const saved = localStorage.getItem('suporte_grãos_erp_login_settings');
console.log("LocalStorage tem dados:", saved ? 'SIM' : 'NÃO');
```

---

## 📊 CHECKLIST DE DEBUG

- [ ] Abri F12 e limpei console
- [ ] Fiz upload e vi logs com 💾 💾 💾
- [ ] Procurei por ❌ ERRO CRÍTICO
- [ ] Procurei por [loginScreenService] ✅
- [ ] Fui ao Supabase e consultei `SELECT * FROM login_screens LIMIT 5;`
- [ ] Imagens aparecem na tabela ✅

---

## 📞 PRÓXIMA AÇÃO

**Faça o upload agora e me mostre:**

1. **Os logs da console** (copie tudo entre os 💾)
2. **O resultado da query SQL**:
```sql
SELECT COUNT(*) FROM public.login_screens;
```
3. **Se há erro ou mensagem vermelha**

Assim posso identificar exatamente onde está o problema!

---

## 🎯 RESUMO

| Cenário | Ação |
|---------|------|
| Vê "🎉 SUCESSO" na console | ✅ Está funcionando! Verifique Supabase |
| Vê "❌ ERRO CRÍTICO" | 📝 Copie a mensagem exata |
| Console vazio | Recarregue página (Cmd+R) e repita |
| LocalStorage tem dados | Logo deve sincronizar com Supabase |

**Versão:** 1.0 - Debug Completo  
**Data:** 27/01/2026 - 11:30  
**Status:** 🔴 Aguardando logs do usuário
