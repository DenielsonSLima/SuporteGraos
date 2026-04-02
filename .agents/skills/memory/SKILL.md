---
name: claude-code-pro-rag
description: >
  SKILL DE MEMÓRIA PERSISTENTE RAG — SEMPRE ATIVA EM TODO PROJETO.
  Esta skill gerencia a memória evolutiva do projeto usando RAG (Retrieval-Augmented Generation).
  Ela utiliza uma base de "Knowledge Items" (KIs) em `.agents/memory/knowledge/` para contexto
  específico e `PROJETO_ALTERACOES.md` para o histórico de mudanças.
  No início de cada sessão, use buscas (grep/find) para recuperar apenas o contexto relevante.
---

# Claude Code Pro RAG — Sistema de Memória Evolutiva

> Esta skill transforma o Claude em um assistente com memória RAG entre sessões.
> O contexto é distribuído em pequenos arquivos (KIs) para máxima eficiência de tokens.

---

## 🔍 PROTOCOLO DE INICIALIZAÇÃO (RAG Search)

Ao começar qualquer tarefa, execute esta sequência de recuperação:

```
1. Consulte o `knowledge/MASTER_INDEX.md` para orientação.
2. Realize uma busca (grep -r) por termos-chave em `knowledge/project/`.
3. Se a tarefa envolver o ERP, busque em `knowledge/suporte-graos/`.
4. Leia os KIs identificados como relevantes.
5. Leia as últimas entradas de `PROJETO_ALTERACOES.md`.
```

---

## 📂 ESTRUTURA DA MEMÓRIA

### 1. Pasta: `.agents/memory/knowledge/`
Contém arquivos `.md` focados. Exemplos:
- `architecture.md`: Stack, infra e pastas.
- `business_domain.md`: Regras de negócio e fluxo central.
- `patterns_and_conventions.md`: Estilos, modais e padrões de código.
- `common_errors.md`: Post-mortems e armadilhas a evitar.
- `[module_name].md`: Detalhes específicos de sub-módulos.

### 2. Arquivo: `PROJETO_ALTERACOES.md` (Raiz)
**Propósito:** Registrar o histórico cronológico de mudanças.

---

## 🛠️ PROTOCOLO DE ATUALIZAÇÃO (Closing)

Após concluir qualquer alteração relevante:

```
1. Atualize `PROJETO_ALTERACOES.md` com o resumo da mudança.
2. Identifique se o conhecimento gerado pertence a um KI existente ou exige um NOVO KI.
3. Atualize ou crie o arquivo .md correspondente em `.agents/memory/knowledge/`.
4. Se um erro foi resolvido → adicione ao KI `common_errors.md`.
```

---

## ⚡ REGRAS DE OURO

| Situação | Ação RAG |
|---|---|
| Nova Feature | Criar KI específico se for complexa |
| Refatoração | Atualizar `patterns_and_conventions.md` |
| Erro de Lógica | Documentar em `common_errors.md` |
| Dúvida de Contexto | Buscar em `knowledge/` antes de perguntar |

---

## 💡 POR QUE RAG?
Diferente de um arquivo único imenso, o sistema RAG permite carregar **apenas o que é necessário**, economizando tokens e mantendo a precisão das respostas em projetos de larga escala.
 skill é a espinha dorsal do projeto. Ela elimina o problema de
> "o Claude não lembra o que foi feito antes". Com ela ativa, cada sessão
> começa exatamente de onde a última parou.
