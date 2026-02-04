# 🧪 GUIA DE TESTES - MÓDULO CRÉDITOS

## Data: 3 de Fevereiro de 2026
## Status: Pronto para teste

---

## ✅ TESTES BÁSICOS (Obrigatórios)

### 1. Criar Novo Crédito
```
Steps:
  1. Abra Financeiro > Créditos
  2. Clique em [+ Novo Crédito]
  3. Preencha:
     - Instituição: "Banco XYZ"
     - Descrição: "CDB 90 dias"
     - Tipo: "Crédito de Renda"
     - Capital: 10000.00
     - Taxa: 0.50
     - Data Início: 01/02/2026
     - Data Vencimento: 01/05/2026
     - Conta: Selecione qualquer uma
  4. Clique em [Criar Crédito]

Expected:
  ✅ Toast: "Crédito criado com sucesso!"
  ✅ Modal fecha
  ✅ Card aparece na lista
  ✅ KPIs atualizam
  ✅ Crédito aparece em "Mês Atual"
```

### 2. Visualizar Detalhes
```
Steps:
  1. Clique em um card da lista
  
Expected:
  ✅ Painel lateral abre com detalhes
  ✅ Mostra Capital: R$ 10.000,00
  ✅ Mostra Rendimento calculado
  ✅ Mostra Taxa: 0,50% a.m.
  ✅ Mostra datas início/vencimento
  ✅ Botões [Editar] [Remover] habilitados
```

### 3. Editar Crédito
```
Steps:
  1. Selecione um crédito
  2. Clique em [Editar]
  3. Altere a taxa para 0.75
  4. Clique em [Atualizar]

Expected:
  ✅ Modal fecha
  ✅ Card atualiza
  ✅ Rendimento recalcula
  ✅ KPIs atualizam
  ✅ Toast: "Crédito atualizado com sucesso!"
```

### 4. Remover Crédito
```
Steps:
  1. Selecione um crédito
  2. Clique em [Remover]

Expected:
  ✅ Crédito é removido
  ✅ KPIs atualizam
  ✅ Lista refiltra
  ✅ Toast: "Crédito removido com sucesso!"
  ✅ Painel lateral limpa
```

---

## 🔍 TESTES DE FILTROS

### 1. Aba "Mês Atual"
```
Steps:
  1. Clique em [Mês Atual]
  
Expected:
  ✅ Lista mostra apenas créditos deste mês
  ✅ KPIs recalculam para este mês
  ✅ Abas visual destaca "Mês Atual"
  ✅ Status é "Ativo" na maioria
```

### 2. Aba "Outros Meses"
```
Steps:
  1. Clique em [Outros Meses]
  
Expected:
  ✅ Lista mostra créditos de outros meses
  ✅ KPIs recalculam para outros meses
  ✅ Status pode ser "Encerrado"
  ✅ Abas visual destaca "Outros Meses"
```

### 3. Filtro "Todos"
```
Steps:
  1. Clique em botão [Todos]
  
Expected:
  ✅ Mostra todos os créditos da aba
  ✅ Sem filtrar por status
  ✅ Botão fica com fundo esmeralda
```

### 4. Filtro "Ativos"
```
Steps:
  1. Clique em botão [Ativos]
  
Expected:
  ✅ Mostra apenas status 'pending' ou 'partial'
  ✅ Filtro visual fica azul
  ✅ Reduz quantidade de itens
  ✅ Status são [Ativo]
```

### 5. Filtro "Encerrados"
```
Steps:
  1. Clique em botão [Encerrados]
  
Expected:
  ✅ Mostra apenas status 'paid'
  ✅ Filtro visual fica cinza
  ✅ Reduz quantidade de itens
  ✅ Status são [Encerrado]
```

### 6. Busca por Instituição
```
Steps:
  1. Crie créditos em "Banco XYZ" e "Bradesco"
  2. Digite "xyz" no campo de busca
  
Expected:
  ✅ Filtra em tempo real
  ✅ Mostra apenas "Banco XYZ"
  ✅ "Bradesco" desaparece
  ✅ Delete busca e volta ao normal
```

### 7. Busca por Descrição
```
Steps:
  1. Crie créditos com descrições diferentes
  2. Digite "cdb" no campo de busca
  
Expected:
  ✅ Filtra por descrição
  ✅ Case-insensitive
  ✅ Búsca em tempo real
```

---

## 📊 TESTES DE KPIs

### 1. Cálculo de Capital
```
Setup:
  - Crédito 1: R$ 10.000
  - Crédito 2: R$ 15.000
  - Crédito 3: R$ 25.000
  
Expected:
  ✅ KPI Capital = R$ 50.000
  
Test:
  1. Remova Crédito 3
  2. KPI deve virar R$ 25.000
```

### 2. Cálculo de Rendimentos
```
Setup:
  - Capital: R$ 10.000
  - Taxa: 0,5% a.m.
  - Período: 3 meses
  
Expected:
  ✅ Rendimento = R$ 150
  ✅ Fórmula: 10000 × (0,5/100) × 3
  
Test:
  Altere taxa para 1,0%
  Rendimento deve virar R$ 300
```

### 3. Cálculo de Taxa Média
```
Setup:
  - Crédito 1: 0,50% a.m.
  - Crédito 2: 0,40% a.m.
  - Crédito 3: 0,60% a.m.
  
Expected:
  ✅ Taxa Média = (0,50 + 0,40 + 0,60) / 3 = 0,50%
```

### 4. Cálculo de Total Final
```
Setup:
  - Capital: R$ 10.000
  - Rendimento: R$ 150
  
Expected:
  ✅ Total Final = R$ 10.150
  
Test:
  Adicione novo crédito
  Total deve somar todos os capitais + rendimentos
```

---

## 🎨 TESTES DE UI/UX

### 1. Responsividade Mobile
```
Device: iPhone 12 (390x844)

Expected:
  ✅ KPIs stackados verticalmente
  ✅ Lista ocupa 100% da largura
  ✅ Detalhes em modal
  ✅ Abas horizontais scrolláveis
  ✅ Botões tappáveis (min 44px)
```

### 2. Responsividade Tablet
```
Device: iPad (768x1024)

Expected:
  ✅ KPIs em grid 2x2
  ✅ Lista e detalhes visíveis
  ✅ Layout adaptado
  ✅ Sem scroll horizontal
```

### 3. Responsividade Desktop
```
Device: 1920x1080

Expected:
  ✅ KPIs em grid 1x4
  ✅ Lista 2/3, Detalhes 1/3
  ✅ Todo conteúdo visível
  ✅ Otimizado para largura
```

### 4. Cores por Tema
```
Test:
  1. Verifique cores nos KPIs
  
Expected:
  ✅ Capital: Azul (#0EA5E9)
  ✅ Rendimentos: Esmeralda (#10B981)
  ✅ Taxa: Violeta (#A78BFA)
  ✅ Total: Laranja (#F97316)
```

### 5. Hover Effects
```
Steps:
  1. Passe mouse sobre card de crédito
  
Expected:
  ✅ Borda muda para verde (emerald-400)
  ✅ Sombra aumenta
  ✅ Transição suave
  ✅ Cursor vira pointer
```

### 6. Animações
```
Steps:
  1. Abra modal
  2. Clique em uma aba
  3. Remova um crédito
  
Expected:
  ✅ Modal: fade-in + zoom-in
  ✅ Abas: fade-in das listas
  ✅ Remove: desaparece suavemente
```

---

## ⚡ TESTES DE PERFORMANCE

### 1. Carregamento Inicial
```
Steps:
  1. Abra Financeiro > Créditos (primeira vez)
  
Expected:
  ✅ Carrega em < 1 segundo
  ✅ Dados aparecem imediatamente
  ✅ KPIs calculam rapidamente
```

### 2. Busca em Tempo Real
```
Setup:
  - 10+ créditos
  
Steps:
  1. Digite na busca
  
Expected:
  ✅ Filtra instantaneamente
  ✅ Sem lag perceptível
  ✅ Resposta < 100ms
```

### 3. Cálculos
```
Steps:
  1. Crie crédito com taxa complexa
  2. Altere período
  
Expected:
  ✅ Rendimento recalcula < 50ms
  ✅ Sem freeze da UI
```

### 4. Realtime (Duas Abas)
```
Steps:
  1. Abra em duas abas/janelas
  2. Crie crédito em aba 1
  
Expected:
  ✅ Aba 2 atualiza automaticamente
  ✅ Sem necessidade de refresh
  ✅ Demora < 1 segundo
```

---

## 🔐 TESTES DE SEGURANÇA

### 1. Campos Obrigatórios
```
Steps:
  1. Abra modal criar
  2. Deixe Instituição em branco
  3. Clique em [Criar Crédito]
  
Expected:
  ✅ Modal não fecha
  ✅ Campo fica com erro (vermelho)
  ✅ Não salva dados incompletos
```

### 2. Valores Numéricos
```
Steps:
  1. Tente digitar letras em "Capital"
  2. Tente digitar valor negativo
  
Expected:
  ✅ Campo rejeita letras
  ✅ Permite apenas números/decimais
  ✅ Não permite negativos (se configurado)
```

### 3. Datas Inválidas
```
Steps:
  1. Data Vencimento anterior a Início
  2. Tente confirmar
  
Expected:
  ✅ Aviso ou erro
  ✅ Não salva datas inválidas
```

---

## 🔄 TESTES DE INTEGRAÇÃO

### 1. Com Dashboard
```
Steps:
  1. Crie crédito com rendimento
  2. Vá para Dashboard
  
Expected:
  ✅ Dashboard mostra o crédito
  ✅ Valores aparecem no sumário
  ✅ KPIs refletem o novo crédito
```

### 2. Com Histórico Financeiro
```
Steps:
  1. Crie crédito
  2. Vá para Histórico Geral
  
Expected:
  ✅ Crédito aparece no histórico
  ✅ Categoria correta
  ✅ Valor correto
```

### 3. Com Banco de Dados
```
Steps:
  1. Crie crédito
  2. Verifique Supabase
  
Expected:
  ✅ Registro em tabela `loans`
  ✅ sub_type = 'credit_income' ou 'investment'
  ✅ Todos campos preenchidos
```

---

## 📋 CHECKLIST FINAL

- [ ] Criar crédito
- [ ] Editar crédito
- [ ] Remover crédito
- [ ] Filtro Mês Atual
- [ ] Filtro Outros Meses
- [ ] Filtro Todos/Ativos/Encerrados
- [ ] Busca funcionando
- [ ] KPIs calculando corretamente
- [ ] Responsividade OK
- [ ] Hover effects
- [ ] Animações suaves
- [ ] Performance adequada
- [ ] Realtime sync
- [ ] Campos obrigatórios
- [ ] Validação de dados
- [ ] Toast notifications
- [ ] Integração Dashboard
- [ ] Integração Histórico
- [ ] Supabase sincronizado
- [ ] Sem erros no console

---

## 🐛 Encontrou um bug?

```
Reporte com:
  1. Steps para reproduzir
  2. Comportamento esperado
  3. Comportamento atual
  4. Screenshot/Video
  5. Browser/Device
  6. Timestamp
```

---

## 📝 Notas

- Todos os testes devem ser feitos com dados reais
- Testar em navegadores diferentes (Chrome, Firefox, Safari)
- Testar em dispositivos diferentes
- Executar após cada atualização
- Manter este checklist atualizado

---

**Teste completo estimado: 30-45 minutos** ⏱️
