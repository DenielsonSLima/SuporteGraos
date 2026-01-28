# 🖼️ GUIA DE EXECUÇÃO: TELA INICIAL NO SUPABASE

## ✅ STATUS ATUAL

| Etapa | Status | Arquivo |
|-------|--------|---------|
| 1. Criar Tabelas | ✅ Pronto | `/supabse/login_screens/login_screens.sql` |
| 2. Configurar RLS | ✅ Pronto | Incluído no SQL |
| 3. Ativar Realtime | ✅ Pronto | Incluído no SQL |
| 4. Serviço Frontend | ✅ Pronto | `/services/loginScreenService.ts` |

---

## 🚀 PASSO-A-PASSO PARA EXECUTAR

### PASSO 1: Copiar o SQL

**Arquivo:** `/supabse/login_screens/login_screens.sql`

**O que fazer:**
1. Abra o arquivo `login_screens.sql`
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

---

### PASSO 2: Executar no Supabase SQL Editor

**Acesso:**
1. Abra [Supabase Console](https://app.supabase.com)
2. Selecione seu projeto `Suporte Grãos ERP`
3. Vá para **SQL Editor** (lado esquerdo)
4. Clique em **New Query**
5. Cole o SQL (Ctrl+V)
6. Clique **RUN** (botão azul)

**Resultado esperado:**
```
✅ CREATE TABLE (x2)
✅ CREATE INDEX (x5)
✅ ALTER TABLE enable row level security
✅ CREATE POLICY (x6)
✅ CREATE TRIGGER (x2)
✅ ALTER PUBLICATION supabase_realtime
```

---

### PASSO 3: Verificar Tabelas Criadas

**No SQL Editor, execute:**

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('login_screens', 'login_rotation_config');

-- Resultado: deve retornar 2 linhas
```

---

### PASSO 4: Verificar RLS Ativo

**Execute:**

```sql
-- Verificar RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('login_screens', 'login_rotation_config');

-- Resultado: ambas com rowsecurity = true
```

---

### PASSO 5: Verificar Políticas RLS

**Execute:**

```sql
-- Listar todas as políticas
SELECT tablename, policyname, permissive 
FROM pg_policies 
WHERE tablename IN ('login_screens', 'login_rotation_config')
ORDER BY tablename;

-- Resultado: deve retornar ~6 políticas
```

---

### PASSO 6: Verificar Realtime

**Execute:**

```sql
-- Verificar publicação realtime
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('login_screens', 'login_rotation_config');

-- Resultado: ambas tabelas listadas
```

---

### PASSO 7: Integração Frontend (Automática)

✅ Serviço já criado em `/services/loginScreenService.ts`

**Funciona automaticamente:**
- Carrega imagens ao iniciar a app
- Escuta mudanças em tempo real
- Sincroniza com localStorage como fallback

**Para usar no LoginScreenSettings.tsx:**

```tsx
import { loginScreenService } from '../../../services/loginScreenService';

// Dentro do componente
useEffect(() => {
  const screens = loginScreenService.getScreens();
  setImages(screens.map(s => s.image_url));
}, []);

// Ao salvar imagem
const handleSave = async () => {
  for (const image of images) {
    await loginScreenService.addScreen({
      image_url: image,
      source: 'upload',
      sequence_order: images.indexOf(image)
    });
  }
};

// Listener em tempo real
const unsubscribe = window.addEventListener('login_screens:updated', () => {
  // Recarregar imagens
  const screens = loginScreenService.getScreens();
  setImages(screens.map(s => s.image_url));
});
```

---

## 📊 ESTRUTURA FINAL

```
Supabase
├── public.login_screens (tabela de imagens)
│   ├── id (UUID)
│   ├── company_id (empresa)
│   ├── image_url (link da imagem)
│   ├── image_data (base64 fallback)
│   ├── title, description (metadados)
│   ├── source ('upload' ou 'ai_generated')
│   ├── ai_prompt (se gerada por IA)
│   ├── sequence_order (ordem exibição)
│   ├── is_active (ativa/inativa)
│   └── [Realtime ON]
│
└── public.login_rotation_config (configuração)
    ├── id (UUID)
    ├── rotation_frequency ('daily', 'weekly', 'monthly', 'fixed')
    ├── display_order ('sequential', 'random', 'manual')
    ├── auto_refresh_seconds (intervalo)
    └── [Realtime ON]

Frontend
└── services/loginScreenService.ts
    ├── loadActiveScreens() → carrega do Supabase
    ├── addScreen() → salva nova imagem
    ├── updateScreen() → edita existente
    ├── deleteScreen() → remove imagem
    ├── startRealtime() → escuta mudanças
    └── Events: 'login_screens:updated'
```

---

## 🔐 PERMISSÕES FINAIS

| Ação | login_screens | login_rotation_config |
|------|---|---|
| SELECT | Todos | Todos |
| INSERT | Autenticados | Autenticados |
| UPDATE | Criador/Admin | Autenticados |
| DELETE | Criador/Admin | ❌ Bloqueado |

---

## ✅ CHECKLIST FINAL

- [ ] SQL copiado e executado no Supabase
- [ ] Tabelas criadas (verificar step 3)
- [ ] RLS ativo (verificar step 4)
- [ ] Políticas criadas (verificar step 5)
- [ ] Realtime publicado (verificar step 6)
- [ ] Serviço frontend integrado
- [ ] LoginScreenSettings.tsx adaptado
- [ ] Testar upload de imagem
- [ ] Testar geração por IA
- [ ] Testar sincronização realtime
- [ ] Testar exclusão de imagem
- [ ] Produção ready! 🚀

---

## 🐛 TROUBLESHOOTING

### "Tabela não encontrada"
→ Verificar se SQL foi executado corretamente (step 2-3)

### "Erro ao inserir (RLS)"
→ Verificar se usuário está autenticado (`auth.uid()`)

### "Realtime não funciona"
→ Verificar se publicação foi adicionada (step 6)

### "Base64 muito grande"
→ Limite de 1MB por imagem (localStorage)

---

**Total de tempo estimado:** ⏱️ 5 minutos (copiar SQL + verificar)

**Status:** 🟢 Pronto para Produção
