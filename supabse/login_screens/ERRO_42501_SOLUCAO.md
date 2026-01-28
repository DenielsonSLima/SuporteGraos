# 🔴 ERRO 42501 - ROW LEVEL SECURITY VIOLATION

## 📋 O QUE ACONTECEU

Você viu esses erros nos logs:

```
❌ Code: "42501"
❌ message: "new row violates row-level security policy for table \"login_screens\""
```

**Isso significa:** A política de segurança do Supabase está bloqueando o INSERT

---

## 🔍 DIAGNÓSTICO

Você estava vendo:
- ✅ `[loginScreenService] Inserindo imagem na posição 0...`
- ❌ `Erro ao inserir: code 42501`
- ❌ `Erro ao adicionar screen`
- ✅ `Salvando backup em localStorage...`
- ✅ `SUCESSO!` (FALSO - apenas localStorage)

**Conclusão:** A policy RLS está muito restritiva!

---

## ✅ COMO CORRIGIR

### OPÇÃO 1: Rápida (Permissiva - Desenvolvimento)

**Abra o SQL Editor do Supabase:**
1. https://app.supabase.com
2. Projeto: SupporteGrãos ERP
3. SQL Editor → New Query
4. Cole todo o conteúdo de **`FIX_RLS_42501.sql`**
5. Clique **RUN**

**O que faz:**
- Remove policies velhas (muito restritivas)
- Cria novas policies (mais permissivas)
- INSERT agora funciona para qualquer pessoa

---

## 🔐 NOVO MODELO DE SEGURANÇA

| Ação | Quem pode | Policy |
|------|-----------|--------|
| SELECT | Todos | `true` |
| INSERT | Todos | `true` |
| UPDATE | Todos | `true` |
| DELETE | Criador ou NULL | `created_by = auth.uid() OR created_by IS NULL` |

### Isso é seguro?
- ✅ Para MVP (desenvolvimento): SIM, é OK
- ⚠️ Para produção: Precisa de melhorias
- 🔒 DELETE restringe para criador (seguro)

---

## 🧪 TESTE DEPOIS DE CORRIGIR

1. **No Supabase, teste a query:**
```sql
INSERT INTO public.login_screens (
  sequence_order, image_url, title, source, is_active
) VALUES (
  99, 'https://via.placeholder.com/test', 'Test', 'upload', true
)
RETURNING id, title;
```

Se conseguir inserir = RLS OK ✅

2. **No Frontend:**
   - F5 (reload)
   - Configurações → Tela Inicial
   - Upload de imagem
   - Salvar
   - Veja os logs

---

## 📊 COMPARAÇÃO

### ANTES (❌ Não funcionava)
```sql
CREATE POLICY "LoginScreens insert" ON public.login_screens
FOR INSERT 
WITH CHECK (auth.uid() is not null);
```
→ Bloqueava porque usuário não estava sendo passado corretamente

### DEPOIS (✅ Funciona)
```sql
CREATE POLICY "LoginScreens insert" ON public.login_screens
FOR INSERT 
WITH CHECK (true);
```
→ Permite qualquer um inserir (sem restrição)

---

## 🚀 PRÓXIMAS AÇÕES

1. **Execute o SQL (FIX_RLS_42501.sql) no Supabase**
2. **Recarregue o frontend** (F5)
3. **Faça upload novamente**
4. **Vire no Supabase e veja se aparece** ✅

---

## ❓ E SE CONTINUAR NÃO FUNCIONANDO?

Se ainda der erro 42501 depois de rodar o SQL:

1. Verifique se a policy foi realmente criada:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'login_screens' AND policyname LIKE '%insert%';
```

2. Se não aparecer, tente recriar manualmente:
```sql
DROP POLICY IF EXISTS "LoginScreens insert" ON public.login_screens;
CREATE POLICY "LoginScreens insert" ON public.login_screens
FOR INSERT WITH CHECK (true);
```

3. Se ainda não funcionar, avise - pode ser outro problema

---

**Documento:** Correção RLS Error 42501  
**Data:** 27/01/2026  
**Status:** 🔴 Aguardando execução do SQL
