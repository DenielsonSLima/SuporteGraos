# 📋 GUIA DE IMPLEMENTAÇÃO - FASE 2 (PARCEIROS)

## ⚠️ ORDEM DE EXECUÇÃO (IMPORTANTE!)

### **PASSO 1️⃣ - SQL NO SUPABASE (partners.sql)**
**QUANDO:** Primeiro, uma única vez  
**ONDE:** Abrir Supabase → SQL Editor → Copiar/Colar `partners.sql`  
**O QUE FAZ:**
- ✅ Cria 7 tabelas no banco (transporters, vehicles, drivers, partners, partner_addresses, partner_contacts, partner_history)
- ✅ Configura RLS (Row Level Security) para que DELETE funcione
- ✅ Ativa Realtime nas 7 tabelas
- ✅ Cria índices de performance
- ✅ Cria triggers automáticos
- ✅ Insere dados iniciais (1 transportadora padrão)

**RESULTADO:** Banco de dados pronto ✅

---

### **PASSO 2️⃣ - SERVIÇOS TYPESCRIPT (services/*.ts)**
**QUANDO:** Depois do SQL estar pronto  
**ARQUIVOS:**
- `services/transporterService.ts`
- `services/vehicleService.ts`  
- `services/driverService.ts`

**O QUE FAZ:**
- ✅ Conecta TypeScript ao banco de dados Supabase
- ✅ Sincroniza dados em tempo real (Realtime listeners)
- ✅ Carrega dados localmente (Persistence/Cache)
- ✅ Implementa CRUD (Create, Read, Update, Delete)
- ✅ Registra auditorias com logService

**RESULTADO:** Serviços prontos para usar na UI ✅

---

## 📁 ESTRUTURA FINAL

```
supabse/
  ├── parceiros/
  │   └── partners.sql ← EXECUTE PRIMEIRO (SQL puro)
  │
services/
  ├── partnerService.ts (já existia)
  ├── transporterService.ts ← CÓDIGO 2 (novo)
  ├── vehicleService.ts ← CÓDIGO 3 (novo)
  └── driverService.ts ← CÓDIGO 4 (novo)
```

---

## 🚀 COMO USAR OS SERVIÇOS

### **Exemplo 1: Carregar Transportadoras**
```typescript
import { transporterService } from './services/transporterService';

const transporters = transporterService.getAll();
const active = transporterService.getActive();
```

### **Exemplo 2: Adicionar Transportadora**
```typescript
await transporterService.add({
  name: 'Transportadora ABC',
  document: '12.345.678/0001-00',
  phone: '(11) 3333-3333',
  active: true
});
```

### **Exemplo 3: Deletar Transportadora**
```typescript
await transporterService.delete(transporterId);
// Automático:
// 1. Remove localmente (UI rápida)
// 2. Remove no Supabase
// 3. Se falhar, restaura localmente
// 4. Mostra erro real para o usuário
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] 1. Copiar `partners.sql` inteiro
- [ ] 2. Abrir Supabase → SQL Editor
- [ ] 3. Colar e executar (Ctrl+Enter)
- [ ] 4. Verificar criação das 7 tabelas
- [ ] 5. Copiar `transporterService.ts` para `/services/`
- [ ] 6. Copiar `vehicleService.ts` para `/services/`
- [ ] 7. Copiar `driverService.ts` para `/services/`
- [ ] 8. Usar os serviços nos componentes React

---

## 🔄 SINCRONIZAÇÃO AUTOMÁTICA

Os 3 serviços fazem **Realtime sincronizado**:
- Quando alguém adiciona uma transportadora → todos veem em tempo real
- Quando alguém deleta um veículo → remove da UI automaticamente
- Cache local + Supabase sempre em sincronia

**Sem fazer nada!** É automático com Realtime listeners.

---

## 💡 RESUMO SIMPLES

| ARQUIVO | TIPO | QUANDO | ONDE |
|---------|------|--------|------|
| `partners.sql` | SQL | 1º (uma vez) | Supabase SQL Editor |
| `transporterService.ts` | TypeScript | 2º | `/services/` folder |
| `vehicleService.ts` | TypeScript | 2º | `/services/` folder |
| `driverService.ts` | TypeScript | 2º | `/services/` folder |
| `partnerService.ts` | TypeScript | Já existe | `/services/` folder |

**ORDEM: SQL → TypeScript**

---

## ❓ PRÓXIMOS PASSOS

1. Execute o SQL no Supabase
2. Adicione os 3 serviços TypeScript ao projeto
3. Quer integrar ao **supabaseInitService** para carregar automaticamente?
4. Quer criar UI para gerenciar transportadoras/veículos/motoristas?
