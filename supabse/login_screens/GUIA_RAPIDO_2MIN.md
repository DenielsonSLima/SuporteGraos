# ⚡ GUIA RÁPIDO - CORRIGIR EM 2 MINUTOS

## 🔴 PROBLEMA ATUAL
```
Você faz upload → Toast diz "SUCESSO"
MAS a imagem só fica em localStorage
Se F5 (recarrega), some tudo
```

## 🟢 SOLUÇÃO RÁPIDA

### 1️⃣ COPIAR O SQL

**Abra este arquivo em seu editor:**
```
/Users/denielson/Desktop/Teste/supabse/login_screens/FIX_RLS_42501.sql
```

**Copie TODO o conteúdo (Ctrl+A, Ctrl+C)**

---

### 2️⃣ ABRIR SUPABASE

1. Acesse: https://app.supabase.com
2. Clique no projeto **SupporteGrãos ERP**
3. Menu esquerdo → **SQL Editor**
4. Clique em **New Query**

---

### 3️⃣ COLAR E EXECUTAR

1. Cole o SQL (Ctrl+V)
2. Clique no botão azul **RUN** (canto inferior direito)
3. Espere terminar (algo entre 2-5 segundos)

**Você deve ver:** ✅ Sem erros vermelhos

---

### 4️⃣ TESTAR

1. Volte ao frontend: http://localhost:3007/
2. Aperte F5 (recarregar página)
3. Configurações → Tela Inicial
4. Clique em um slot vazio (UPLOAD)
5. Selecione uma imagem qualquer
6. Clique **"SALVAR E APLICAR GALERIA"**
7. Olhe para os logs (F12 → Console)

**Se vir:** `🎉 SUCESSO! Todas as imagens foram salvas.`
✅ Funcionou!

---

### 5️⃣ VERIFICAR SUPABASE

Volte ao Supabase:
1. Menu → **Table Editor**
2. Tabela → **login_screens**
3. Procure sua imagem

Se aparecer lá = **SUCESSO 100%** 🎉

---

## 📋 ARQUIVO A EXECUTAR

**Localização:**
```
/Users/denielson/Desktop/Teste/supabse/login_screens/FIX_RLS_42501.sql
```

**Tamanho:** Pequeno (~100 linhas)

**O que faz:** Remove as policies velhas e cria novas menos restritivas

---

## ⏱️ TEMPO ESTIMADO
- Copiar: 10 segundos
- Abrir Supabase: 15 segundos  
- Colar: 5 segundos
- Executar: 3 segundos
- **TOTAL:** 33 segundos

---

## ❓ PERGUNTAS?

### P: E se der erro ao executar?
**R:** Screenshot do erro e me manda

### P: Preciso de permissão especial?
**R:** Não, é sua conta, você tem tudo

### P: Vai quebrar algo?
**R:** Não, só está consertando o que estava errado

### P: E se recarregar a página?
**R:** A imagem fica lá! (ao contrário de antes)

---

## ✅ CHECKLIST FINAL

- [ ] Copiei o arquivo FIX_RLS_42501.sql
- [ ] Abri o SQL Editor do Supabase
- [ ] Criei New Query
- [ ] Colei o SQL
- [ ] Cliquei RUN
- [ ] Não deu erro
- [ ] Recarreguei o frontend
- [ ] Testei upload novamente
- [ ] Vi "SUCESSO" nos logs
- [ ] Consultei Table Editor do Supabase
- [ ] Vi a imagem lá!

---

**Pronto? Vamo que vamo! 🚀**
