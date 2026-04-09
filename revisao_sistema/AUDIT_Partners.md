# 📊 Auditoria de Módulo: Partners (Parceiros e Contatos)

**Status:** 🟡 AMARELO (Funcional, mas com lógica fragmentada)

## 🎯 Resumo Executivo
O módulo de Parceiros é o alicerce de todos os outros módulos (Compra, Venda, Frete). Sua estrutura modular em `services/parceiros/` é boa, mas o serviço sofre de "vazamento de lógica", realizando múltiplas chamadas sequenciais ao banco de dados para resolver operações que deveriam ser atômicas.

## ✅ O que está de acordo (Standards)
- **Paginação Nativa:** O `getPartners` utiliza corretamente `from` e `to` do Supabase, evitando problemas de performance no carregamento de grandes listas.
- **Normalização Geográfica:** O uso de tabelas separadas para `cities` e `states` garante a integridade dos dados de endereço.
- **Classificação Flexível:** A implementação de categorias via tabela de junção permite que um parceiro seja, simultaneamente, Produtor e Transportador.

## ⚠️ Resíduos Identificados (A Mudar)
- **Falta de Atomicidade em Endereços:** A função `savePartnerAddress` realiza até 4 operações de banco separadas no JavaScript (Busca Estado -> Busca/Cria Cidade -> Busca Endereço Existente -> Update/Insert). Se a internet do usuário oscilar no meio, o endereço pode ficar incompleto.
- **Dual Writes em Categorias:** Ao criar ou atualizar um parceiro, o frontend faz chamadas manuais para a tabela `parceiros_categorias`. Isso deve ser movido para uma Trigger SQL ou RPC.
- **Múltiplos Roundtrips:** O `getPartners` faz uma segunda chamada ao banco para buscar as categorias se um filtro for aplicado. Isso aumenta a latência da UI desnecessariamente.

## 🛠️ Plano de Ação Recomendado
1. **RPC de Endereço:** Criar a função `rpc_save_partner_primary_address` para lidar com toda a resolução de Cidade/Estado e persistência do endereço em uma única transação no banco.
2. **Trigger de Categorias:** Implementar uma Trigger que, ao salvar no `metadata` de um parceiro, atualize automaticamente a tabela `parceiros_categorias`.
3. **Consolidação de Query:** Ajustar a query principal para realizar um JOIN completo e trazer as categorias agregadas em uma única chamada.

---
*Auditoria realizada por: Senior Architect & Frontend Pro*
