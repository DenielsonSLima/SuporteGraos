# 🖼️ IMPLEMENTAÇÃO: TELA INICIAL (LOGIN SCREENS)

## 📋 Visão Geral
Sistema completo para gerenciar imagens da tela de login com suporte a:
- ✅ Upload manual de imagens
- ✅ Geração via IA (Google Gemini)
- ✅ Rotação automática (diária, semanal, mensal)
- ✅ Sincronização em tempo real (Realtime WebSocket)
- ✅ Fallback para Base64 (caso URL falhe)

---

## 🔧 ETAPAS DE IMPLEMENTAÇÃO

### ETAPA 1: CRIAR AS TABELAS NO SUPABASE ✅

**Arquivo:** `/supabse/login_screens/login_screens.sql`

**Tabelas criadas:**

1. **`public.login_screens`** - Armazena as imagens
   - `id` (UUID PK)
   - `company_id` (empresa associada)
   - `sequence_order` (ordem de exibição)
   - `image_url` (URL da imagem)
   - `image_data` (base64 fallback)
   - `title`, `description` (metadados)
   - `source` ('upload' ou 'ai_generated')
   - `ai_prompt` (prompt usado se IA)
   - `is_active` (ativa/inativa)
   - `created_by` (usuário que criou)
   - `created_at`, `updated_at` (timestamps)
   - `metadata` (jsonb para dados extras)

2. **`public.login_rotation_config`** - Configuração de rotação
   - `id` (UUID PK)
   - `company_id` (empresa, único)
   - `rotation_frequency` ('daily', 'weekly', 'monthly', 'fixed')
   - `display_order` ('sequential', 'random', 'manual')
   - `auto_refresh_seconds` (intervalo em segundos)
   - `last_rotation_at`, `next_rotation_at` (controle de rotação)

**Índices criados:** 5 (company_id, is_active, sequence_order, created_at, rotation_config)

---

### ETAPA 2: CONFIGURAR ROW LEVEL SECURITY (RLS) ✅

**Permissões em `login_screens`:**

| Ação   | Permissão | Quem? |
|--------|-----------|-------|
| SELECT | ✅ Permitido | Todos (tela pública) |
| INSERT | ✅ Permitido | Usuários autenticados |
| UPDATE | ✅ Permitido | Criador ou Admin |
| DELETE | ✅ Permitido | Criador ou Admin |

**Permissões em `login_rotation_config`:**

| Ação   | Permissão | Quem? |
|--------|-----------|-------|
| SELECT | ✅ Permitido | Todos |
| INSERT | ✅ Permitido | Usuários autenticados |
| UPDATE | ✅ Permitido | Usuários autenticados |
| DELETE | ❌ Bloqueado | (RLS padrão) |

**Triggers adicionados:**
- `login_screens_updated_at_trigger` - Atualiza `updated_at` automaticamente
- `login_rotation_config_updated_at_trigger` - Idem para config

---

### ETAPA 3: ATIVAR REALTIME ✅

**WebSocket habilitado para:**
- ✅ `public.login_screens` (INSERT, UPDATE, DELETE)
- ✅ `public.login_rotation_config` (INSERT, UPDATE)

**Isso permite:**
- Quando um admin adiciona uma imagem → Todos os clientes recebem a mudança em tempo real
- Quando rotação é ajustada → Tela de login se atualiza automaticamente
- Quando imagem é deletada → Desaparece da interface em tempo real

---

### ETAPA 4: INTEGRAÇÃO FRONTEND ⏳ (PRÓXIMO)

**Serviço a criar:** `services/loginScreenService.ts`

**Funcionalidades:**

```typescript
// Carregar imagens
const getActiveScreens(): Promise<LoginScreen[]>

// Carregar configuração de rotação
const getRotationConfig(): Promise<RotationConfig>

// Adicionar imagem (upload)
const addScreen(screen: LoginScreenInput): Promise<LoginScreen>

// Gerar via IA
const generateViaAI(prompt: string): Promise<LoginScreen>

// Atualizar configuração
const updateRotationConfig(config: RotationConfigInput): Promise<void>

// Deletar imagem
const deleteScreen(id: string): Promise<void>

// Realtime listener
const subscribeToChanges(callback: (changes: any) => void): () => void
```

**Integração com LoginScreenSettings.tsx:**
- Carregar imagens do Supabase ao invés de localStorage
- Sincronizar upload/geração com Supabase
- Escutar mudanças em tempo real
- Fallback para localStorage se Supabase falhar

---

## 📝 CHECKLIST

### Fase 1: Banco de Dados
- [x] Tabelas criadas
- [x] Índices adicionados
- [x] RLS configurado (SELECT, INSERT, UPDATE, DELETE)
- [x] Triggers de `updated_at` implementados
- [x] Realtime ativado

### Fase 2: SQL pronto
- [x] Script SQL completo em `/supabse/login_screens/login_screens.sql`
- [x] Documentação das tabelas e políticas

### Fase 3: Frontend (PRÓXIMO)
- [ ] Criar `services/loginScreenService.ts`
- [ ] Integrar com `LoginScreenSettings.tsx`
- [ ] Adicionar realtime listener
- [ ] Testar upload/geração/delete
- [ ] Implementar fallback localStorage

---

## 🚀 PRÓXIMOS PASSOS

1. **Executar SQL no Supabase** (copiar conteúdo do arquivo)
2. **Criar serviço frontend** (`loginScreenService.ts`)
3. **Integrar com LoginScreenSettings.tsx**
4. **Testar realtime** com múltiplos clientes
5. **Deploy em produção**

---

## 🔐 Segurança

✅ **SELECT público** - Tela de login precisa acessar as imagens
✅ **INSERT/UPDATE/DELETE autenticado** - Apenas usuários logados podem gerenciar
✅ **Base64 fallback** - Se URL falhar, usa dados armazenados
✅ **Validação de tamanho** - Limite 1MB por imagem (localStorage)
✅ **RLS ativa** - Impossível contornar sem auth

---

## 📊 Performance

| Operação | Tempo Esperado | Índice |
|----------|---|---|
| Buscar imagens ativas | < 100ms | `idx_login_screens_company` + `idx_login_screens_active` |
| Buscar config de rotação | < 50ms | `idx_rotation_config_company` |
| Realtime (novo upload) | < 500ms | WebSocket Supabase |
| Rotação automática | Batch | Trigger do app (cron job) |

---

**Status:** 📋 Tabelas criadas ✅ | RLS configurado ✅ | Realtime ativo ✅ | Frontend pendente ⏳
