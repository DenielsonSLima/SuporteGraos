# 🔴 PROBLEMA: Realtime não funciona sem habilitar no Supabase

## O que está acontecendo?

O código está **PRONTO** para realtime, mas o Supabase **PRECISA TER REALTIME HABILITADO** nas tabelas!

## ✅ SOLUÇÃO: Habilitar Realtime em TODAS as tabelas

### Passo a passo:

1. **Acesse seu Supabase Dashboard**
   - https://supabase.com/dashboard

2. **Vá em Database → Replication**
   - No menu lateral esquerdo
   - Clique em "Replication"

3. **Habilite Realtime nas tabelas:**

Marque as seguintes tabelas como **"Realtime enabled"**:

- ✅ `purchase_orders` (Pedidos de Compra)
- ✅ `sales_orders` (Pedidos de Venda)  
- ✅ `logistics_loadings` (Carregamentos)
- ✅ `partners` (Parceiros)
- ✅ `partner_addresses` (Endereços)

**Como habilitar:**
- Clique na tabela
- Toggle "Enable Realtime" → **ON**
- Clique em "Save"

### Ou execute este SQL:

```sql
-- Habilitar Realtime em todas as tabelas necessárias
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE logistics_loadings;
ALTER PUBLICATION supabase_realtime ADD TABLE partners;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_addresses;
```

## 🧪 Como testar se funcionou:

1. Abra 2 navegadores diferentes (ou abas anônimas)
2. Faça login nos 2
3. Em um navegador, **crie um pedido de compra**
4. No outro navegador, **veja aparecer AUTOMATICAMENTE** (sem recarregar!)

Se aparecer instantaneamente = **✅ REALTIME FUNCIONANDO!**

## 🐛 Debug: Como ver se está funcionando

Abra o **Console do navegador** (F12):
- Deve aparecer: `[PurchaseOrder Realtime] Status: SUBSCRIBED`
- Quando criar pedido: `[PurchaseOrder Realtime] INSERT { ... }`

Se não aparecer nada = Realtime não está habilitado no Supabase!

## 📊 Status atual do código:

✅ PurchaseOrderModule - Com realtime
✅ SalesOrderModule - Com realtime
✅ LogisticsModule - Com realtime  
✅ PartnersModule - Com realtime

**Falta apenas habilitar no Supabase!**
