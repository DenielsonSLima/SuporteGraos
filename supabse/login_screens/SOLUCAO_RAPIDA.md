# 🚨 ERRO ENCONTRADO - SOLUÇÃO RÁPIDA

## ❌ ERRO NOS LOGS
```
Code: "42501"
Message: "new row violates row-level security policy for table \"login_screens\""
```

**Tradução:** A política de segurança está bloqueando o salvamento!

---

## ✅ SOLUÇÃO EM 2 MINUTOS

### PASSO 1: Abrir Supabase SQL Editor

1. Acesse: **https://app.supabase.com**
2. Selecione projeto: **SupporteGrãos ERP**
3. Menu esquerdo → **SQL Editor**
4. Clique em **New Query**

### PASSO 2: Copiar e Executar SQL

**Arquivo:** `/supabse/login_screens/FIX_RLS_42501.sql`

**Copie TUDO desse arquivo e cole no SQL Editor**

```sql
DROP POLICY IF EXISTS "LoginScreens select" ON public.login_screens;
DROP POLICY IF EXISTS "LoginScreens insert" ON public.login_screens;
...
```

### PASSO 3: Clicar RUN

- Clique no botão azul **RUN** no canto inferior direito
- Espere completar (deve ter ✅ verde)

### PASSO 4: Verificar se funcionou

Na console do SQL, você deve ver:
```
✅ DROPPED
✅ CREATED POLICY
✅ CREATED POLICY
...
```

---

## 🧪 TESTE DE VERIFICAÇÃO

**Após rodar o SQL, execute esta query:**

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'login_screens' 
ORDER BY policyname;
```

**Você deve ver 4 políticas:**
- LoginScreens select
- LoginScreens insert
- LoginScreens update
- LoginScreens delete

Se vir, RLS está OK! ✅

---

## 🔄 PRÓXIMA AÇÃO NO FRONTEND

1. **F5** (recarregue a página)
2. **Configurações → Tela Inicial**
3. **Clique UPLOAD** em um slot vazio
4. **Selecione uma imagem**
5. **Clique "SALVAR E APLICAR GALERIA"**
6. **Verifique os logs na console** - procure por:
   ```
   🎉 SUCESSO! Todas as imagens foram salvas.
   ```

---

## ✅ SE FUNCIONOU

Depois vá para o Supabase e execute:

```sql
SELECT id, title, source, is_active, created_at 
FROM public.login_screens 
ORDER BY created_at DESC 
LIMIT 5;
```

**Você deve ver suas imagens lá!** ✅

---

## 🆘 SE AINDA NÃO FUNCIONAR

Se continuar dando erro 42501:

1. **Verifique se a policy foi realmente criada:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'login_screens';
```

2. **Se não aparecer, tente deletar e recriar manualmente:**
```sql
DROP POLICY IF EXISTS "LoginScreens insert" ON public.login_screens;

CREATE POLICY "LoginScreens insert" ON public.login_screens
FOR INSERT 
WITH CHECK (true);
```

3. **Se AINDA não funcionar**, há outro problema - me avise!

---

## 📋 CHECKLIST

- [ ] Abri SQL Editor do Supabase
- [ ] Criei New Query
- [ ] Colei todo o SQL de FIX_RLS_42501.sql
- [ ] Cliquei RUN
- [ ] Verifiquei que as policies foram criadas
- [ ] Recarreguei o frontend (F5)
- [ ] Testei upload novamente
- [ ] Vejo "🎉 SUCESSO!" na console
- [ ] Vejo imagens no Supabase Table Editor

---

**Status:** 🔴 Aguardando você executar o SQL  
**Tempo estimado:** 2 minutos  
**Dificuldade:** ⭐ Muito fácil
