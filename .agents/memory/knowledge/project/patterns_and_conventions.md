# Padrões de Interface e Convenções de Código

## 🎨 DESIGN SYSTEM (Premium UI)
O Suporte Grãos ERP utiliza uma estética moderna e limpa, focada em produtividade.
- **Cores**: Paleta sóbria, tons de cinza/azul para painéis operacionais, com indicadores vibrantes (verde para lucro, vermelho para débito).
- **Componentes**: Foco em tabelas densas, filtros rápidos e modais de alto impacto.

---

## 🧱 UX / MODAL PORTAL PATTERN (Regra de Ouro #1)
**NUNCA** renderize modais ou overlays diretamente dentro da hierarquia do componente de página.
- **Obrigatório**: Use o componente `ModalPortal`.
- **Por quê?**: Evita problemas de `z-index`, herança de estilos CSS indesejada e garante que o modal cubra 100% da viewport, incluindo o cabeçalho lateral.

---

## 🏗️ ARQUITETURA DE SERVIÇOS (Modular Service Pattern)
- **Handlers Especializados**: Lógicas complexas (como recálculo de frete ou sincronização de pagamentos) devem ser movidas para `handlers` específicos (ex: `loadingRecalculation.ts`).
- **Orquestradores**: Módulos que coordenam múltiplos serviços devem usar `orchestratorHelpers.ts`.
- **Estrutura de Pastas**: Cada domínio deve ter sua própria subpasta em `/services` (ex: `/services/user`).
- **Arquivos Obrigatórios**:
  - `types.ts`: Definições de interfaces e enums do domínio.
  - `loader.ts`: Funções de leitura (SELECT) e busca.
  - `actions.ts`: Funções de escrita (INSERT, UPDATE, DELETE).
  - `realtime.ts`: Lógica de ouvintes do Supabase (subscribe).
  - `index.ts`: Ponto de entrada que exporta tudo via Barrel Export.
- **Compatibilidade**: Ao refatorar um serviço legados (ex: `userService.ts`), mantenha o arquivo original como um barrel export para evitar quebras em componentes que já o utilizavam.

---

## 📊 PADRÕES DE DADOS
- **Financeiro**: Todos os campos de valor devem usar `Numeric(20,2)` no banco e ser tratados como `number` no frontend, com formatação via `Intl.NumberFormat('pt-BR', ...)`.
- **Datas**: SEMPRE use ISO strings (`YYYY-MM-DD`) para facilitar a manipulação e evitar loops de timezone.

---

## 🧪 CHECKLIST DE QUALIDADE (Frontend)
- [ ] O componente usa `useQuery` de forma eficiente?
- [ ] Existe tratamento para estado de `Loading`?
- [ ] Mensagens de erro são capturadas via toast ou alert amigável?
- [ ] A responsividade foi testada (Desktop vs Tablet)?
- [ ] O código respeita o princípio DRY (Don't Repeat Yourself)?
