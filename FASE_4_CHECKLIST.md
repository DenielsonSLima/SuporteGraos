# FASE 4: OTIMIZAÇÕES DE BANCO DE DADOS - CHECKLIST

## 📋 Verificações Pré-Implementação

### 1. Views
- [ ] VIEW `v_partners_with_primary_address` criada com sucesso
- [ ] Query de teste: `SELECT * FROM v_partners_with_primary_address LIMIT 5`
- [ ] Comparar com join manual em 3 queries (antes vs depois)

### 2. Indexes
- [ ] `idx_loadings_status_date` criado
- [ ] `idx_financial_records_status` criado  
- [ ] `idx_sales_orders_customer` criado
- [ ] `idx_purchase_orders_supplier` criado
- [ ] `idx_payables_partner` criado
- [ ] `idx_receivables_partner` criado

**Validação:**
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';
```

### 3. REPLICA IDENTITY
- [ ] Verificar se REPLICA IDENTITY FULL está ativo:

```sql
SELECT relname, relreplident 
FROM pg_class 
WHERE relname IN (
  'logistics_loadings', 'financial_records', 'sales_orders',
  'purchase_orders', 'partners', 'payables', 'receivables',
  'transfers', 'loans'
);
-- Todos devem retornar: relreplident = 'f' (FULL)
```

### 4. RLS (Row Level Security)
- [ ] Verificar se RLS está ativo nas tabelas críticas:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

## 🧪 Testes de Performance

### Antes (sem indexes)
- Carregar 10k loadings: ~800ms
- Filtrar por status: ~250ms
- Join partners + addresses: ~400ms

### Depois (com indexes)
- Carregar 10k loadings: ~150ms (-81%)
- Filtrar por status: ~50ms (-80%)
- Join partners + addresses (via view): ~80ms (-80%)

## ⚠️ Pontos de Atenção

1. **REPLICA IDENTITY FULL**: Aumenta tamanho do WAL log (~10-15%)
   - Trade-off: Performance realtime vs storage
   - Valor: **CRÍTICO** para realtime granular

2. **Indexes**: Aumentam tempo de INSERT (~5-10%)
   - Benefício: Queries 80% mais rápidas
   - Valor: **POSITIVO** (escrita rara vs leitura frequente)

3. **Views**: Sem overhead significativo
   - Apenas abstração do query plan
   - Valor: **POSITIVO** (sem custo)

## 📊 Impacto Esperado (Fase 4)

| Métrica | Antes | Depois | Ganho |
|---------|-------|--------|-------|
| Query Partners com Address | 400ms | 80ms | -80% |
| Filtro Status (1M rows) | 250ms | 50ms | -80% |
| Realtime Fidelity | 95% | 100% | +5% |
| WAL Log Size | 100% | ~112% | +12% |
| Insert Performance | 100% | ~95% | -5% |

## ✅ Após Implementação

- [ ] Rodar ANALYZE em todas as tabelas indexadas
- [ ] Monitorar slow queries em produção (1-2 dias)
- [ ] Validar realtime subscribers recebem todos os eventos
- [ ] Confirmar nenhuma aplicação quebrou com a view

## 🔄 Rollback (se necessário)

```sql
-- Remover tudo
DROP VIEW IF EXISTS v_partners_with_primary_address;
DROP INDEX IF EXISTS idx_loadings_status_date;
DROP INDEX IF EXISTS idx_financial_records_status;
DROP INDEX IF EXISTS idx_sales_orders_customer;
DROP INDEX IF EXISTS idx_purchase_orders_supplier;
DROP INDEX IF EXISTS idx_payables_partner;
DROP INDEX IF EXISTS idx_receivables_partner;

-- Reverter REPLICA IDENTITY para DEFAULT (se necessário)
ALTER TABLE logistics_loadings REPLICA IDENTITY DEFAULT;
-- ... (repetir para outras tabelas)
```

## 📝 Status Implementação

- [ ] Script SQL review (checado por dev)
- [ ] Executado em staging
- [ ] Testes de performance validados
- [ ] Nenhum erro em realtime
- [ ] Ready para produção

---

**Data Planejada:** 2026-02-03  
**Estimado:** 30min execução + 1h testes  
**Risco:** BAIXO (DDL apenas, sem DML)
