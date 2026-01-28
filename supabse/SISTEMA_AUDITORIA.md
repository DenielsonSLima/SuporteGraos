# 📊 Sistema de Auditoria e Logs - Documentação

## 🎯 Visão Geral

Sistema completo de auditoria e rastreamento de eventos do sistema com 3 pilares:

1. **Logs de Auditoria** - Quem alterou o quê, quando, onde e por quê
2. **Sessões de Usuários** - Tempo de acesso, duração, informações do navegador
3. **Histórico de Login** - Sucessos, falhas, tentativas de acesso

---

## 📋 Componentes Implementados

### 1. SQL - Tabelas Supabase
**Arquivo:** `supabse/audit/audit_logs.sql`

#### Tabelas criadas:
- **audit_logs** - Registro de todas as ações (create, update, delete, etc)
- **user_sessions** - Sessões ativas e encerradas
- **login_history** - Histórico de login/logout
- **critical_events** - Eventos críticos (deletions, security, etc)

#### Features:
- ✅ RLS habilitado (acesso irrestrito para auditoria)
- ✅ Realtime habilitado (postgres_changes)
- ✅ Índices para performance
- ✅ Triggers para updated_at automático
- ✅ Cálculo automático de duration em sessões

---

### 2. Serviço - auditService.ts
**Arquivo:** `services/auditService.ts`

#### Funcionalidades:
```typescript
// Audit Logs
auditService.logAction('create', 'Financeiro', 'Criou conta a pagar');
auditService.getAuditLogs();
auditService.subscribeAuditLogs(callback);

// User Sessions
const session = await auditService.createSession();
await auditService.closeSession(sessionId);
auditService.getUserSessions();
auditService.subscribeUserSessions(callback);

// Login History
await auditService.recordLogin('user@email.com', true);
await auditService.recordLogin('user@email.com', false, 'Credenciais inválidas');
auditService.getLoginHistory();
auditService.subscribeLoginHistory(callback);

// Stats
auditService.getStats() // { totalAuditLogs, activeSessions, totalLogins, failedLogins }
```

#### Realtime integrado:
- Canais PostgreSQL para cada tipo de evento
- Callbacks automáticos ao detectar mudanças
- Sincronização em tempo real com Supabase

---

### 3. Integração - authService.ts
**Arquivo:** `services/authService.ts`

#### Mudanças:
```typescript
// Login bem-sucedido → registra no sistema de auditoria
await auditService.recordLogin(email, true);
const session = await auditService.createSession();

// Login falhado → registra tentativa
await auditService.recordLogin(email, false, 'Credenciais inválidas');

// Logout → encerra sessão e registra saída
await auditService.logAction('logout', 'Sistema', `${user.name} saiu`);
await auditService.closeSession(currentSessionId);
```

---

### 4. Frontend - LogsSettings.tsx
**Arquivo:** `modules/Settings/Logs/LogsSettings.tsx`

#### 3 Abas principais:

**Aba 1 - Auditoria**
- Lista todos os logs de ações (create, update, delete)
- Filtra por: usuário, módulo, data range
- Mostra: ação, módulo, descrição, usuário, timestamp, IP

**Aba 2 - Sessões**
- Lista todas as sessões ativas/encerradas
- Mostra: usuário, data/hora início, duração, navegador, device
- Status: Ativa, Fechada, Expirada

**Aba 3 - Histórico de Login**
- Registra login/logout de usuários
- Mostra: email, tipo (sucesso/falha), motivo, data/hora, IP, navegador
- Indicador de 2FA

#### Stats Dashboard:
- 📊 Total de logs de auditoria
- 👤 Sessões ativas agora
- 📝 Total de logins
- ❌ Tentativas falhadas

---

## 🔌 Como Usar

### Registrar uma ação no log de auditoria
```typescript
import { auditService } from '../../services/auditService';

// Ao criar um parceiro
auditService.logAction('create', 'Parceiros', 'Criou novo parceiro: Fulano LTDA', {
  entityType: 'partner',
  entityId: partnerId,
  metadata: { cpf, email }
});

// Ao atualizar uma conta a pagar
auditService.logAction('update', 'Financeiro', 'Alterou status de conta a pagar', {
  entityType: 'payable',
  entityId: payableId,
  metadata: { old_status: 'pending', new_status: 'paid' }
});

// Ao deletar um ativo
auditService.logAction('delete', 'Patrimônio', 'Excluiu ativo: Veículo XYZ', {
  entityType: 'asset',
  entityId: assetId
});
```

### Acompanhar em tempo real
```typescript
// React component
useEffect(() => {
  const unsubscribe = auditService.subscribeAuditLogs((logs) => {
    console.log('Logs atualizados:', logs);
    setLogs(logs);
  });

  return unsubscribe;
}, []);
```

### Verificar stats
```typescript
const stats = auditService.getStats();
console.log(`${stats.activeSessions} usuários conectados`);
console.log(`${stats.failedLogins} tentativas falhadas`);
```

---

## 🔒 Segurança

### RLS Policies
- ✅ SELECT: Todos podem ler (auditoria pública)
- ✅ INSERT: Apenas sistema (via trigger/backend)
- ✅ UPDATE: Restritos (apenas updates de sessão)
- ✅ DELETE: Bloqueado (auditoria imutável)

### Dados Capturados
- 👤 Usuário (ID, nome, email)
- 🔄 Ação (create, update, delete, login, logout)
- 📍 IP Address
- 🌐 User Agent (navegador, OS)
- ⏰ Timestamp preciso
- 📦 Metadata customizável

---

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────┐
│         Ação do Usuário no App                 │
│  (login, criar partner, atualizar payable)      │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │   Registra no Log     │
         │  (auditService.log)   │
         └───────────┬───────────┘
                     │
         ┌───────────▼────────────────┐
         │   Persiste no Supabase     │
         │  (INSERT audit_logs)       │
         └───────────┬────────────────┘
                     │
         ┌───────────▼──────────────────┐
         │  Dispara Realtime Event      │
         │  (postgres_changes)          │
         └───────────┬──────────────────┘
                     │
         ┌───────────▼──────────────────┐
         │  Atualiza LogsSettings.tsx   │
         │  (via subscription callback) │
         └───────────┬──────────────────┘
                     │
         ┌───────────▼──────────────────┐
         │  Exibe no Frontend           │
         │  (em tempo real)             │
         └──────────────────────────────┘
```

---

## 🚀 Próximas Melhorias

- [ ] Exportar logs em PDF/CSV
- [ ] Dashboard de segurança (alertas de atividade suspeita)
- [ ] Autenticação de 2FA
- [ ] Geolocalização de IP
- [ ] Retenção automática (delete after X days)
- [ ] Criptografia de dados sensíveis
- [ ] Integração com email (alertas)
- [ ] Relatórios de conformidade

---

## 📝 Execução do SQL

Para ativar no Supabase:

1. Copie o conteúdo de `supabse/audit/audit_logs.sql`
2. Vá para Supabase → SQL Editor
3. Cole e execute (Run)
4. Aguarde confirmação de sucesso

---

## ✅ Verificação

Teste a auditoria:

```bash
# 1. Faça login no app
# 2. Vá para Settings → Logs
# 3. Deve aparecer "login" registrado

# 4. Crie/atualize algo (parceiro, produto, etc)
# 5. Abra Settings → Logs → Auditoria
# 6. Deve aparecer a ação que realizou

# 7. Veja a aba "Sessões"
# 8. Sua sessão deve aparecer como "Ativa"

# 9. Veja a aba "Histórico de Login"
# 10. Seu login deve aparecer como "Sucesso"
```

---

## 📖 Referências

- **Supabase Realtime:** https://supabase.com/docs/guides/realtime
- **RLS Policies:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Triggers:** https://www.postgresql.org/docs/current/sql-createtrigger.html
