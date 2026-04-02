# 🧠 Master Index: Memória Evolutiva RAG

Este é o ponto de entrada central para toda a base de conhecimento do projeto. Use as subpastas abaixo para realizar buscas RAG focadas no seu objetivo.

---

## 📁 ESTRUTURA DE CONHECIMENTO

### 🏛️ [01. Projeto (Geral)](file:///Users/denielson/Desktop/Suporte%20Graos%20ERP%20%20/.agents/memory/knowledge/project/)
*Contexto macro, arquitetura e padrões locais.*
- `architecture.md`: Stack tecnológica e estrutura de pastas.
- `business_domain.md`: Fluxo central de negócio e terminologia.
- `patterns_and_conventions.md`: Estilos (Tailwind/CSS) e padrões de UI.
- `common_errors.md`: Post-mortems e armadilhas a evitar.

### 🌾 [02. Suporte Grãos (Negócio)](file:///Users/denielson/Desktop/Suporte%20Graos%20ERP%20%20/.agents/memory/knowledge/suporte-graos/)
*Regras específicas do ERP Grãos.*
- `overview.md`: Visão geral do produto.
- `logistics.md`: Gestão de fretes e carregamentos.
- `finance.md`: Fluxo financeiro, adiantamentos e baixas.
- `supabase_ui.md`: Banco de dados e padrões de componentes ERP.
- `performance_caixa.md`: KPIs e visão patrimonial.

### 📘 [03. Senior Dev (Padrões)](file:///Users/denielson/Desktop/Suporte%20Graos%20ERP%20%20/.agents/memory/knowledge/senior-dev/)
*Padrões absolutos de engenharia e referência técnica.*
- `capitulos/`: 17 capítulos de fundamentos sênior.
- `adr/`: Registros de decisões arquiteturais.
- `examples/`: Implementações de referência (Hooks, Services).

### 🚨 [04. Rollback (Recuperação)](file:///Users/denielson/Desktop/Suporte%20Graos%20ERP%20%20/.agents/skills/rollback/)
*Guias de tratamento de erros e recuperação de desastres.*
- `rollback-banco.md`: Erros de Supabase/SQL.
- `rollback-codigo.md`: Erros de Frontend/Runtime.
- `rollback-financeiro.md`: Erros de cálculo e valores.

---

## 🔍 COMO USAR (Protocolo RAG)
Sempre comece com:
`grep -r "termo_da_tarefa" .agents/memory/knowledge/`
