# Checklist de Revisão do Sistema — ERP Grãos

Este documento serve para acompanhar a revisão completa e sistemática de todos os módulos do sistema.

## Status Geral: `EM PROGRESSO`

---

## 📋 Módulos para Teste

### 1. Parceiros (Cadastro Base)
- [x] **Listagem de Parceiros**: Verificar se o filtro por tipo (Produtor, Comprador, etc.) funciona. (OK)
- [x] **Novo Parceiro**: Testar cadastro completo com endereço e categorias. (OK - Corrigido)
- [x] **Edição**: Alterar dados de um parceiro existente e verificar se persiste. (OK)
- [x] **Exclusão**: Testar remoção de parceiro sem dependências. (OK)
- [ ] **Logs/Resultados**: 

### 2. Pedido de Compra
- [x] **Novo Pedido**: Criar um contrato de venda (SC, Preço).
- [x] **Financeiro**: Corrigida regra de "A Receber". Agora o valor só sobe após descarregamento (Unloading).
- [x] **KPIs em Tempo Real**: Atualiza imediatamente ao salvar carga (CORRIGIDO: staleTime 0 + listener ops_loadings).
- [ ] **Anexos e Notas**: Testar funcionalidade de notas internas.
- [ ] **Logs/Resultados**: 

### 3. Logística (O Coração do Sistema)
- [x] **Novo Carregamento**: Criar carga vinculada ao Pedido de Compra e Venda.
- [x] **Financeiro Automático**: Validar se gerou Contas a Pagar (Grão) e Frete.
- [x] **Cálculo de Frete**: Testar base "Origem" vs "Destino".
- [x] **Descarregamento**: Validar entrada do peso e impacto no Dashboard (Trânsito -> Receber).
- [x] **Logs/Resultados**: 

### 4. Pedido de Venda
- [x] **KPIs em Tempo Real**: "Mercadoria em Trânsito" atualiza imediatamente (CORRIGIDO: staleTime 0).
- [ ] **Listagem e Auditoria**: Verificar se as cargas descarregadas aparecem para faturamento.
- [x] **Recebimentos**: Testar baixa de parcelas recebidas do comprador. (OK - Corrigido erro de query/UX)
- [ ] **Logs/Resultados**: 

### 5. Financeiro — Contas a Pagar
- [x] **Geração Automática**: Verificar se carregamentos geraram as entradas de produtor e frete. (OK)
- [ ] **Baixa de Pagamento**: Realizar pagamento parcial e total, conferindo o saldo no banco.
- [ ] **Logs/Resultados**: 

### 6. Financeiro — Contas a Receber
- [x] **Geração Automática**: Verificar se o romaneio confirmado gerou a entrada de venda. (OK)
- [ ] **Baixa de Recebimento**: Conferir entrada de saldo na conta escolhida.
- [ ] **Logs/Resultados**: 

### 7. Caixa (Gestão de Contas)
- [x] **Detalhamento de Débitos**: Corrigido mapeamento (Fornecedores/Fretes visíveis).
- [x] **Realtime Dashboard**: Atualiza instantaneamente com o banco (staleTime 0).
- [ ] **Extrato por Conta**: Verificar se as transações aparecem corretamente no histórico da conta.
- [ ] **Transferência entre Contas**: Testar transferência interna e conferir os dois saldos.
- [ ] **Logs/Resultados**: 

### 8. Sócios
- [ ] **Lançamento de Pró-labore**: Testar geração de crédito para o sócio.
- [ ] **Retirada de Saldo**: Realizar retirada e conferir saída do caixa.
- [ ] **Logs/Resultados**: 

### 9. Patrimônio
- [ ] **Cadastro de Ativo**: Adicionar veículo ou imóvel.
- [ ] **Venda/Baixa**: Registrar saída de ativo e entrada financeira proporcional.
- [ ] **Logs/Resultados**: 

### 10. Performance & Relatórios
- [ ] **Dashboard Principal**: Verificar se KPIs (Receber, Pagar, Saldo) refletem os testes.
- [ ] **Exportação PDF**: Testar geração de PDF de um pedido ou extrato.
- [ ] **Logs/Resultados**: 

---

## 🛠 Histórico de Erros e Correções
*Nesta seção, registraremos cada bug encontrado durante o teste e como ele foi resolvido.*

| Módulo | Erro Identificado | Causa Raiz | Correção Aplicada | Status |
| :--- | :--- | :--- | :--- | :--- |
| Parceiros | Erro no Cadastro | Índice Único e Query Invalidation | Criado índice SQL e refatorado TanStack Query | Corrigido |
| Caixa | Detalhamento Zerado | Falha no mapeamento JS | Corrigido mapeamento em `cashierReportService.ts` | Corrigido |
| Venda/Compra | Delay KPI (3 min) | staleTime alto (5 min) | Reduzido staleTime para zero (Realtime Puro) | Corrigido |
| Compra | Sync Carga Faltando | Falta listener loadings | Adicionado listener ops_loadings no hook | Corrigido |
| Venda | Erro no Recebimento | Query Inválida em View | Refatorado para direct query + try/catch front-end | Corrigido |
| Banco de Dados | Erro SQL (CASE mapping) | Cast ENUM vs Column Text | Corrigido `fn_update_entry_paid_amount` removendo casts | Corrigido |
| Financeiro | Falta de Feedback (Reversão) | Promoções assíncronas/swallowed | Adicionado try/catch + toasts + await em estornos e baixas | Corrigido |
