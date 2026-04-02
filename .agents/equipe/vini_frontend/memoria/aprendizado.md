# 🧠 Aprendizado: Vini Frontend

## 📅 30/03/2026 - Configuração Inicial
- **O que aprendi:** A importância de separar memórias por agente para evitar conflitos de contexto.
### 📅 30/03/2026 - Filtros Padrão na Logística
- **Desafio:** Implementar um filtro de 30 dias que não bloqueasse a visão total do usuário.
- **Lição:** O uso de inicialização lazy no `useState` (`() => dateCarryOver`) garante que cálculos de data não rodem em cada render. O botão "Limpar Filtros" agora reseta para strings vazias, forçando o componente de KPI a ignorar as datas e somar todo o histórico.
- **Arquivo:** `modules/Logistics/LogisticsModule.tsx`
- **Padrão UI:** Mantivemos o foco em interfaces premium com HSL.
- **Próximo Passo:** Aplicar micro-animações nos cards do Dashboard.
