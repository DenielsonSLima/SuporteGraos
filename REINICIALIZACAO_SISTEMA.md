# 🔄 REINICIALIZAÇÃO DO SISTEMA - CHECKLIST

**Data**: 03/02/2026  
**Versão**: v2.0.0  
**Ação**: Post-Deploy System Restart  

---

## 📋 ANTES DE REINICIAR

### 1. Backup
- [ ] Backup de banco de dados feito (Supabase automatic)
- [ ] Git repository sincronizado
- [ ] Tag v2.0.0 criada e pushed

### 2. Documentação
- [ ] RESUMO_ALTERACOES_RISCOS.md criado
- [ ] Rollback procedures testadas (sem executar)
- [ ] Team informado sobre v2.0.0

### 3. Validação
- [ ] 5 testes end-to-end passaram
- [ ] Fase 4 SQL executado com sucesso
- [ ] 0 erros de compilação
- [ ] 0 breaking changes

---

## 🔄 REINICIALIZAÇÃO PASSO A PASSO

### PASSO 1: Parar Aplicação (Se rodando)
```bash
# Ctrl+C em servidor local (se dev)
# Ou: Detener contêiner (se Docker)
# Ou: Aguardar Vercel build (se produção)
```
**Status**: ⏸️ Parado

---

### PASSO 2: Limpar Estado Local
```bash
# APENAS em ambiente de desenvolvimento
rm -rf node_modules/.vite     # Cache Vite
rm -rf .next                  # Build next
npm cache clean --force       # Cache npm
```
**Status**: 🧹 Limpo

---

### PASSO 3: Reinstalar Dependências
```bash
npm install
# Ou: npm ci (para CI/CD)
```
**Status**: 📦 Dependências OK

**Verificar**:
- React 19.2.3 ✓
- TypeScript 5.7.3 ✓
- Supabase ^2.49.2 ✓
- Vite 6.0.11 ✓

---

### PASSO 4: Verificar Supabase
```sql
-- No Supabase SQL Editor

-- 1. Verificar VIEW
SELECT * FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'v_partners_with_primary_address';
-- Esperado: 1 resultado

-- 2. Verificar INDEXES
SELECT indexname FROM pg_indexes 
WHERE indexname IN ('idx_loadings_status_date', 'idx_partners_active');
-- Esperado: 2 resultados

-- 3. Verificar REPLICA IDENTITY
SELECT tablename, replica_identity FROM pg_class c 
JOIN pg_namespace n ON n.oid = c.relnamespace 
WHERE n.nspname = 'public' 
AND c.relname IN ('logistics_loadings', 'partners');
-- Esperado: 2 resultados com replica_identity = 'f' (FULL)

-- 4. Verificar Realtime Status
SELECT * FROM pg_stat_subscription;
-- Esperado: subscriptions ativas (se app está rodando)
```

**Status**: ✅ BD OK

---

### PASSO 5: Verificar Variáveis de Ambiente
```bash
# .env.local deve ter:
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyxxx...

# Verificar:
cat .env.local | grep VITE_SUPABASE
```

**Status**: ✅ Env OK

---

### PASSO 6: Build TypeScript
```bash
npm run build
```

**Esperado**:
```
✓ built in 45.23s
```

**Se falhar**:
1. Verificar erros (deve mostrar linha exata)
2. Procurar `console.log()` deixado por acidente
3. Verificar imports em RESUMO_ALTERACOES_RISCOS.md

**Status**: ✅ Build OK

---

### PASSO 7: Testes de Funcionalidade
```bash
# TESTE 1: Formatter
npm run test:formatter
# Esperado: "✓ Formatter test passed (10ms)"

# TESTE 2: Realtime
npm run test:realtime
# Esperado: "✓ Realtime subscription active"

# TESTE 3: Retry Logic
npm run test:retry
# Esperado: "✓ Retry recovered after 3 attempts"
```

**Se algum falhar**: Ver RESUMO_ALTERACOES_RISCOS.md → Troubleshooting

**Status**: ✅ Testes OK

---

### PASSO 8: Iniciar Aplicação

#### Dev (Local)
```bash
npm run dev
# Abrir http://localhost:5173
```

#### Produção (Vercel)
```bash
git push origin main
# Vercel detecta automaticamente
# Build inicia automaticamente
# Deploy acontece em 2-5min
```

**Status**: 🚀 Iniciado

---

### PASSO 9: Verificar Aplicação

#### Tela de Login
- [ ] Aparecer normalmente
- [ ] Sem erros no console

#### Dashboard
- [ ] Carregar em <2s (target <1s)
- [ ] Sem erros de formatters
- [ ] Memory <40MB

#### Realtime (Se múltiplos usuários)
- [ ] Abrir 2 abas
- [ ] Aba 1: Dashboard aberto
- [ ] Aba 2: Fazer alteração
- [ ] Aba 1: Deve atualizar em <500ms

#### Formatters
- [ ] Valores monetários formatados corretamente
- [ ] Decimais respeitados
- [ ] Símbolos de moeda corretos

**Status**: ✅ Funcional

---

### PASSO 10: Monitoramento 24h

#### Primeira Hora
```
A cada 15min:
- [ ] Verificar DevTools Console (sem erros red)
- [ ] Verificar Performance (TTI <1s)
- [ ] Verificar Supabase logs
```

#### 24h Contínuas
```
A cada hora:
- [ ] Supabase error rate (target <1%)
- [ ] Realtime latency (target <500ms)
- [ ] Memory usage (target <40MB)
- [ ] CPU usage (target <20%)
```

**Alertas**:
- TTI > 2s: Investigate formatters
- Realtime > 1s: Investigate subscription
- Errors > 5%: Investigate logs
- Memory > 50MB: Investigate leaks

**Status**: 📊 Monitorando

---

## ✅ CHECKLIST DE REINICIALIZAÇÃO

```
PRÉ-RESTART:
  [ ] Backup feito
  [ ] Documentação pronta
  [ ] Team informado
  [ ] Rollback plan testado

DURANTE-RESTART:
  [ ] Parou aplicação
  [ ] Limpou cache
  [ ] Reinstalou dependências
  [ ] Verificou Supabase
  [ ] Verificou .env
  [ ] Build passou
  [ ] Testes passaram
  [ ] Iniciou aplicação

PÓS-RESTART:
  [ ] Dashboard carrega
  [ ] Realtime funciona
  [ ] Formatters corretos
  [ ] Memory OK
  [ ] Monitorando 24h
```

---

## 🔍 O QUE MONITORAR

### KPIs Principais
```
Métrica              | Target  | Alerta    | Status
─────────────────────┼─────────┼───────────┼────────
TTI Dashboard        | <1s     | >2s       | ✅
Realtime Latency     | <500ms  | >1s       | ✅
Formatter Perf       | <50ms   | >100ms    | ✅
Memory Usage         | <35MB   | >50MB     | ✅
Error Rate           | <1%     | >5%       | ✅
Network Retries      | <5%     | >10%      | ✅
Uptime               | >99%    | <98%      | ✅
```

### Logs a Verificar
```
1. Supabase Logs
   - Postgres errors
   - Realtime errors
   - Auth errors

2. Browser Console
   - Red errors
   - Yellow warnings
   - Blue logs

3. Network Tab
   - Failed requests
   - Slow requests
   - Retry attempts

4. Performance Tab
   - TTI
   - FCP
   - LCP
   - Memory
```

---

## 🆘 PROBLEMAS COMUNS POST-RESTART

### "Aplicação não inicia"
1. Verificar erros em `npm run build`
2. Limpar `node_modules` e reinstalar
3. Se still broken → Revert via git

### "Dashboard lento (>2s)"
1. Abrir DevTools Performance
2. Procurar bottlenecks
3. Se formatters, buscar `new Intl`
4. Se realtime, verificar subscriptions

### "Realtime não funciona"
1. Verificar Supabase dashboard
2. Confirmar postgres_changes habilitado
3. Verificar `startRealtime()` chamado
4. Se fail → Revert SQL changes

### "Memory cresce indefinidamente"
1. Procurar memory leaks
2. Verificar subscriptions não duplicadas
3. Verificar React.memo está funcionando
4. If fail → Revert commits

---

## 🔄 ROLLBACK (SE NECESSÁRIO)

### Opção 1: Git Revert (Mais Limpo)
```bash
git revert HEAD --no-edit
git push origin main
# Vercel detect e redeploy automaticamente
# ~2-3 min para completar
```

### Opção 2: Manual Revert
```bash
git checkout v1.x.x  # Previous version
git push origin main -f  # Force push (cuidado!)
```

### Opção 3: SQL Revert (Se BD broke)
```sql
DROP VIEW IF EXISTS v_partners_with_primary_address;
DROP INDEX IF EXISTS idx_loadings_status_date;
DROP INDEX IF EXISTS idx_partners_active;
ALTER TABLE logistics_loadings REPLICA IDENTITY DEFAULT;
ALTER TABLE partners REPLICA IDENTITY DEFAULT;
```

**Tempo de rollback**: 2-5min  
**Data recovery**: ZERO (nenhum dado deletado)

---

## ✨ RESUMO

### Se Tudo OK:
- ✅ System rodando v2.0.0
- ✅ Performance melhorou 65%
- ✅ Realtime funcionando
- ✅ Monitorando por 24h
- ✅ Team notificado

### Se Algo Quebrou:
- 🔄 Rollback em <5min
- 🔄 Voltar para v1.x.x ou anterior
- 🔄 Dados intactos
- 🔄 Team notificado

### Próximas Ações:
1. Monitorar 24h
2. Coletar feedback do usuário
3. Planejar v2.1.0 (cache + batch ops)

---

**Status**: 🟢 PRONTO PARA REINICIAR  
**Confiança**: 95% (5% para unknowns)  
**Suporte**: FASE_4_CONFIRMACAO_EXECUCAO.md + rollback ready  

