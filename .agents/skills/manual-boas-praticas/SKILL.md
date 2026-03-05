# Manual de Boas Práticas: O Guia Definitivo do Desenvolvedor Sênior

**Autor:** Manus AI

## Prefácio

Este manual transcende a mera coleção de boas práticas; ele é um compêndio de princípios arquiteturais e diretrizes operacionais forjadas na experiência de construção de sistemas complexos e de missão crítica. Destinado a desenvolvedores seniores, líderes técnicos e arquitetos de software, este guia estabelece um padrão de excelência para a concepção, desenvolvimento e manutenção de aplicações robustas, escaláveis e seguras, com foco em ecossistemas modernos como **React, TypeScript e Supabase**.

Em um cenário onde a velocidade de entrega é crucial, mas a integridade e a segurança são inegociáveis, a adoção de uma arquitetura bem definida e de processos rigorosos torna-se a espinha dorsal do sucesso. Este documento detalha não apenas *o que* fazer, mas *por que* certas abordagens são preferíveis, fornecendo exemplos práticos, complementos técnicos e perguntas de revisão que estimulam o pensamento crítico e a autoavaliação contínua.

O objetivo final é capacitar o desenvolvedor sênior a atuar como um verdadeiro arquiteto de soluções, capaz de construir sistemas que não apenas atendam aos requisitos funcionais, mas que também sejam resilientes, seguros e eficientes a longo prazo.

---

## 1. Arquitetura de Frontend e Componentização: A Arte da Separação de Responsabilidades

A construção de interfaces de usuário modernas exige uma abordagem meticulosa para a organização do código. A arquitetura de frontend deve ser projetada para garantir que cada parte do sistema tenha uma responsabilidade clara e única, promovendo a manutenibilidade, a testabilidade e a escalabilidade. Este princípio, conhecido como **Separação de Responsabilidades**, é a pedra angular de qualquer sistema frontend robusto.

### 1.1. As Três Camadas Fundamentais do Frontend

Conforme as diretrizes estabelecidas, o frontend deve ser segmentado em três camadas distintas, cada uma com um propósito bem definido. Esta divisão não é meramente estética, mas funcional, prevenindo o acoplamento indesejado e facilitando a evolução do sistema.

| Camada | Localização Padrão | Responsabilidade Primária | Características Chave | Exemplos | Perguntas de Revisão |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Páginas (Pages)** | `src/modules/{modulo}/*.page.tsx` | Orquestrar o fluxo da aplicação, gerenciar o estado global e local da página, e coordenar a interação entre os componentes. São os "controladores" da interface. | Montam a tela, buscam dados via *services* e *hooks*, e passam as informações para os componentes filhos. Devem ser o mais "finas" possível em termos de lógica de apresentação. | `ClientesPage.tsx`, `DashboardPage.tsx` | Esta página está gerenciando apenas o estado e o fluxo, ou está contendo lógica de apresentação complexa? A lógica de busca de dados está desacoplada? |
| **Componentes de Módulo** | `src/modules/{modulo}/components/` | Encapsular a lógica de negócio e a apresentação de uma funcionalidade específica dentro de um módulo. Interagem com o usuário e disparam eventos. | São componentes "inteligentes" que podem ter estado interno e lógica de interação. Devem ser reutilizáveis dentro do contexto do seu módulo. | `ClienteFormAdd.tsx`, `ProdutoCard.tsx`, `PedidoList.tsx` | Este componente está focado em uma única funcionalidade? Ele poderia ser reutilizado em outro lugar dentro do mesmo módulo? |
| **Componentes de UI (Dumb Components)** | `src/lib/ui/` | Fornecer blocos de construção visuais reutilizáveis, sem qualquer lógica de negócio ou estado interno. São puramente apresentacionais. | Recebem todas as suas propriedades via `props` e emitem eventos. São os "átomos" da interface, garantindo consistência visual e facilidade de estilização. | `Botao.tsx`, `Input.tsx`, `Modal.tsx`, `Spinner.tsx` | Este componente é realmente "burro"? Ele possui alguma dependência de estado global ou lógica de negócio? Seu estilo é facilmente sobrescrevível? |

### 1.2. Regras de Ouro para Componentização

1.  **Componentes não fazem chamadas de API:** Esta é uma regra fundamental. Componentes visuais devem ser **consumidores de dados**, não provedores. Eles devem receber todas as informações necessárias via `props` ou através de *hooks* customizados que abstraem a camada de acesso a dados. Isso garante que o componente seja independente da fonte de dados, facilitando testes e a reutilização. Por exemplo, um `UserCard` deve receber um objeto `user` como prop, e não ser responsável por buscar os dados do usuário do servidor.

2.  **Separação Clara entre Páginas e Componentes:** As **Páginas** (`.page.tsx`) atuam como orquestradores. Elas são responsáveis por montar a tela, gerenciar o estado da rota, buscar os dados necessários (utilizando os *services* e *hooks* apropriados) e passar esses dados para os **Componentes de Módulo** que compõem a interface. Os **Componentes de Módulo**, por sua vez, focam na lógica de interação e apresentação de uma funcionalidade específica, sem se preocupar com a orquestração da página inteira.

3.  **Componentes de UI "Burros" (`/ui`):** A pasta `src/lib/ui` deve conter apenas componentes puramente visuais, sem qualquer lógica de negócio. Estes são os blocos de construção básicos, como botões, inputs, modais, tipografia, etc. Eles devem ser altamente reutilizáveis e configuráveis via `props`, garantindo a consistência do design system e facilitando a manutenção visual. A lógica de negócio ou o estado da aplicação não devem residir nesses componentes.

### 1.3. Legibilidade e Acessibilidade da Interface

Um aspecto frequentemente negligenciado, mas crucial para a experiência do usuário e a conformidade com padrões de acessibilidade, é a legibilidade dos elementos da interface. Conforme a `design_rules` especificada:

> **INPUT_LEGIBILITY:** **TODOS** os campos de entrada de texto (inputs, textareas, etc.) DEVEM, por padrão, ter um fundo claro (ex: `#FFFFFF`) e cor de fonte escura (ex: `#111827`) para garantir a máxima legibilidade. Esta regra só pode ser quebrada se o usuário pedir explicitamente uma cor diferente.

Esta regra visa garantir que a interface seja utilizável por uma ampla gama de usuários, incluindo aqueles com deficiências visuais ou em condições de iluminação adversas. A consistência visual e a acessibilidade são marcas de um design sênior e atencioso.

### 1.4. Exemplo Prático de Componentização

Considere um módulo de `Clientes`:

*   `src/modules/clientes/clientes.page.tsx`: Esta página seria responsável por buscar a lista de clientes (talvez usando um `useQuery` do TanStack Query que chama `clienteService.getAll()`) e renderizar um `ClienteList` e um `ClienteFormAdd`.
*   `src/modules/clientes/components/ClienteList.tsx`: Receberia a lista de clientes como `props` e renderizaria vários `ClienteCard`.
*   `src/modules/clientes/components/ClienteCard.tsx`: Receberia um único objeto `cliente` como `prop` e exibiria seus detalhes. Poderia ter um botão de "Editar" que dispara um evento (`onEdit(cliente.id)`).
*   `src/modules/clientes/components/ClienteFormAdd.tsx`: Conteria o formulário para adicionar um novo cliente. Ele chamaria `clienteService.create()` quando o formulário fosse submetido.
*   `src/lib/ui/Input.tsx`, `src/lib/ui/Button.tsx`: Componentes genéricos de UI usados em `ClienteFormAdd` e `ClienteCard`.

### 1.5. Perguntas de Revisão para Arquitetura de Frontend

Ao revisar o código frontend, um desenvolvedor sênior deve se questionar:

*   **Desacoplamento:** Se eu precisar trocar a biblioteca de UI (ex: de Tailwind para Material UI), qual o impacto? A lógica de negócio está misturada com a apresentação?
*   **Reutilização:** Este componente é genérico o suficiente para ser reutilizado em outros contextos? Se não, ele está no lugar certo (dentro de um módulo específico)?
*   **Testabilidade:** É fácil escrever testes unitários para este componente sem precisar montar toda a aplicação?
*   **Coesão:** Este arquivo ou componente tem uma única responsabilidade bem definida? Ele faz apenas uma coisa e faz bem?
*   **Escalabilidade:** Se o número de funcionalidades ou a complexidade da interface aumentar, esta estrutura se manterá organizada ou se tornará um "spaghetti code"?

---

## 2. A Camada de Serviço e Segurança: O Guardião do Backend (Edge Functions do Supabase)

A camada de serviço, frequentemente implementada através de **Edge Functions** (como as do Supabase), desempenha um papel crucial na arquitetura de um sistema moderno. Ela atua como um "garçom inteligente" ou um "porteiro rigoroso", controlando o acesso ao banco de dados e executando a lógica de negócio sensível em um ambiente seguro e controlado. Esta camada é a primeira linha de defesa contra acessos não autorizados e a garantia de que as operações críticas sejam executadas com integridade.

### 2.1. Regras de Ouro para a Camada de Serviço

1.  **Privilégios Mínimos e Proteção da `service_role` Key:** A `service_role` key do Supabase concede privilégios de administrador e **NUNCA** deve ser exposta no frontend. Ela deve residir exclusivamente em ambientes seguros de backend, como as Edge Functions. Isso impede que usuários mal-intencionados obtenham acesso irrestrito ao banco de dados, mesmo que consigam comprometer o código do cliente. As Edge Functions, por sua natureza, executam em um ambiente isolado e podem acessar essas chaves de forma segura, sem expô-las ao navegador.

2.  **Abstração por Funcionalidade de Negócio, não por Tabela:** Em vez de criar endpoints que espelham diretamente as operações CRUD de uma tabela (ex: `GET /lancamentos`, `POST /contas`), a camada de serviço deve expor **funcionalidades de negócio**. Por exemplo, em vez de `POST /transacoes`, teríamos `POST /processar-pagamento` ou `GET /extrato-financeiro`. Esta abordagem oferece várias vantagens:
    *   **Segurança Aprimorada:** Permite que a Edge Function execute múltiplas operações atômicas no banco de dados sob uma única transação, aplicando validações e regras de negócio complexas antes de persistir os dados.
    *   **Manutenibilidade:** A lógica de negócio fica encapsulada em um único local, facilitando a manutenção e a evolução. O frontend não precisa saber os detalhes de como um pagamento é processado, apenas que ele pode chamar a função `processar-pagamento`.
    *   **Auditoria:** As chamadas de API refletem as intenções de negócio, tornando os logs mais compreensíveis e a auditoria mais eficaz.

3.  **Validação Agressiva dos Dados de Entrada:** Toda e qualquer entrada de dados que chega à camada de serviço, seja do frontend ou de outros serviços, deve ser **validada agressivamente**. Ferramentas como a biblioteca **Zod** para TypeScript são excelentes para definir schemas de validação robustos e garantir que os dados estejam no formato e tipo esperados. Isso previne ataques de injeção, erros de lógica e corrupção de dados. Retorne códigos de erro HTTP apropriados (ex: `400 Bad Request` para dados inválidos) para que o frontend possa tratar o erro de forma amigável.

### 2.2. Exemplo Prático: Processamento de Pagamento

Em um sistema financeiro, um pedido de pagamento não deve ser uma simples inserção na tabela de transações. Ele envolve uma série de verificações e atualizações atômicas. Uma Edge Function para `processar-pagamento` poderia:

1.  Receber o `entry_id`, `account_id` e `amount` do frontend.
2.  Validar os dados de entrada usando Zod.
3.  Verificar as permissões do usuário (se ele pertence à organização correta e tem autorização para realizar pagamentos).
4.  Iniciar uma transação SQL no banco de dados.
5.  Verificar se o `entry_id` existe e se o status permite o pagamento.
6.  Verificar se a `account_id` tem saldo suficiente.
7.  Inserir uma nova `financial_transaction` (saída).
8.  Atualizar o saldo da `account`.
9.  Atualizar o status da `financial_entry` para `paid` ou `partially_paid`.
10. Commitar a transação SQL.
11. Retornar um status de sucesso ou erro.

Este fluxo garante que todas as etapas sejam concluídas com sucesso ou que nenhuma alteração seja persistida, mantendo a integridade financeira.

### 2.3. Perguntas de Revisão para a Camada de Serviço

Ao desenvolver ou revisar uma Edge Function ou serviço de backend, considere:

*   **Vulnerabilidade:** Se um usuário mal-intencionado conseguir manipular o payload da requisição, ele poderia realizar uma operação não autorizada ou corromper dados?
*   **Exposição de Segredos:** Há alguma chave de API, credencial ou informação sensível que está sendo exposta ou que poderia ser inferida a partir do código ou do comportamento da função?
*   **Tratamento de Erros:** A função lida com todos os cenários de erro (dados inválidos, permissão negada, falha no banco de dados) e retorna mensagens claras e códigos HTTP apropriados?
*   **Reutilização:** Esta função é genérica o suficiente para ser usada por diferentes partes do frontend ou por outros serviços internos?
*   **Desempenho:** A função está otimizada para ser executada rapidamente? Há operações de I/O desnecessárias ou loops ineficientes?

---

## 3. Banco de Dados: A Fonte da Verdade e o Guardião da Integridade (PostgreSQL)

O banco de dados não é meramente um repositório de informações; ele é o **cérebro** do sistema, a **fonte da verdade** inquestionável para todas as operações de negócio. Em sistemas financeiros, a integridade dos dados é paramount, e o PostgreSQL, com suas capacidades transacionais e extensibilidade, é a escolha ideal para ser o guardião dessa integridade. A lógica de negócio crítica e as regras mais importantes devem residir o mais próximo possível dos dados, ou seja, no próprio banco de dados.

### 3.1. O Princípio Mestre: A Separação dos Poderes Financeiros

O conteúdo fornecido introduz um modelo mental poderoso para sistemas financeiros, separando o universo financeiro em três dimensões distintas. Esta abordagem evita o erro comum de tratar todas as movimentações como uma única "transação", o que pode levar a inconsistências e dificuldades de auditoria.

| Dimensão | Tabela Base | Foco Temporal | Regra de Ouro | Exemplo |
| :--- | :--- | :--- | :--- | :--- |
| **O Futuro (As Promessas)** | `financial_entries` | O que *vai* ou *deveria* acontecer. | Gerencia expectativas e obrigações. Uma promessa não é dinheiro real. | Um boleto a pagar, uma fatura a receber. | `status`: `open`, `partially_paid`, `paid`, `overdue`, `canceled`. |
| **O Presente (A Realidade)** | `accounts` | Onde o dinheiro *está* agora. | O saldo é uma **consequência** das transações, nunca uma fonte de verdade editável manualmente. | Contas bancárias, caixa físico, carteiras digitais. | `saldo` é atualizado por triggers ou RPCs. |
| **O Passado (A Verdade Imutável)** | `financial_transactions` | O que *já aconteceu*, passo a passo. | A verdade absoluta. Livro-razão imutável. Cada centavo que se moveu é um fato. Só `financial_transactions` movem dinheiro. | Um depósito, um saque, um pagamento. | Registros históricos, nunca deletados, apenas estornados. |

### 3.2. Tabelas Atômicas e o Livro-Razão Imutável

As tabelas `contas` e `lancamentos` (ou `financial_transactions`) são o coração deste modelo. A tabela `contas` armazena o estado atual dos cofres, enquanto `lancamentos` registra o histórico imutável de todas as movimentações.

```sql
-- Contas bancárias. O saldo é a verdade absoluta.
CREATE TABLE contas (
    id UUID PRIMARY KEY,
    nome TEXT NOT NULL,
    saldo NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    organization_id UUID REFERENCES organizations(id) NOT NULL, -- Para multitenancy
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- Para RLS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- O livro-razão. Imutável. Cada linha é um fato que ocorreu.
CREATE TABLE lancamentos (
    id UUID PRIMARY KEY,
    conta_id UUID REFERENCES contas(id) NOT NULL,
    descricao TEXT,
    valor NUMERIC(15, 2) NOT NULL, -- Positivo para crédito, negativo para débito
    data_transacao DATE NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL, -- Para multitenancy
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- Para RLS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Complemento Técnico:** A inclusão de `organization_id` e `user_id` é crucial para a implementação de **Multitenancy** e **Row Level Security (RLS)**, conforme será detalhado na Seção 4. O `created_at` é essencial para auditoria e ordenação cronológica.

### 3.3. A Função de Negócio (Stored Procedures/RPC)

A lógica de negócio crítica, especialmente aquela que envolve a integridade de múltiplos registros, deve ser encapsulada em funções SQL (Stored Procedures) e exposta via RPC (Remote Procedure Call). Isso garante **atomicidade** (Tudo ou Nada) e centraliza a lógica onde ela é mais segura e eficiente.

```sql
CREATE OR REPLACE FUNCTION public.inserir_lancamento(p_conta_id UUID, p_descricao TEXT, p_valor NUMERIC)
RETURNS VOID AS $$
BEGIN
    -- 1. Insere o fato no livro-razão
    INSERT INTO public.lancamentos (conta_id, user_id, descricao, p_valor, now()::date);
    -- 2. Atualiza o saldo de forma atômica
    UPDATE public.contas
    SET saldo = saldo + p_valor
    WHERE id = p_conta_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Regra #6: `SECURITY DEFINER`:** Esta cláusula é vital. Ela permite que a função seja executada com os privilégios do usuário que a *definiu* (geralmente um administrador), e não do usuário que a *chamou*. Isso é fundamental para que a função possa realizar operações que o usuário comum não teria permissão direta, como atualizar o saldo de uma conta. No entanto, a função deve **internamente** restringir a operação ao usuário correto, utilizando `auth.uid()` para garantir que apenas os dados pertencentes ao usuário autenticado sejam afetados. Isso cria um *gatekeeper* seguro para operações sensíveis.

### 3.4. A View de Relatório (Leitura Otimizada)

Para facilitar a leitura e a geração de relatórios, as `VIEWS` são ferramentas poderosas. Elas abstraem a complexidade de `JOINs` e fornecem uma interface simplificada para o consumo de dados, sem duplicá-los.

```sql
CREATE OR REPLACE VIEW public.vw_extrato_financeiro AS
SELECT l.id, l.data_transacao, l.descricao, l.valor, c.nome AS nome_conta
FROM lancamentos l
JOIN contas c ON l.conta_id = c.id
ORDER BY l.data_transacao DESC;
```

**Complemento Técnico:** Views são ideais para consultas frequentes e complexas. No entanto, para grandes volumes de dados, **Materialized Views** podem ser consideradas para pré-computar e armazenar os resultados, melhorando significativamente o desempenho de leitura à custa de uma atualização periódica.

### 3.5. Fluxos de Trabalho Atômicos Detalhados

O manual fornecido detalha fluxos de trabalho atômicos para operações financeiras comuns. A chave é que todas essas operações devem ser encapsuladas em funções SQL (RPC) para garantir a atomicidade e a integridade.

#### 🟢 Pedido de Compra
1.  **Criação:** Um pedido de compra gera um `purchase_order` e uma `financial_entry` do tipo `payable` (a pagar) com `status=open`.
2.  **Pagamento:** A RPC `rpc.pay_entry(entry_id, account_id, amount)` executa:
    *   `BEGIN` (inicia a transação).
    *   Verifica o saldo disponível na `account_id`.
    *   Insere uma `financial_transaction` (saída) na tabela `lancamentos`.
    *   Atualiza o `saldo` da `account_id`.
    *   Atualiza o `status` da `financial_entry`.
    *   `COMMIT` (finaliza a transação, persistindo todas as alterações ou revertendo tudo em caso de erro).

#### 🟢 Pedido de Venda
1.  **Criação:** Um pedido de venda gera um `sales_order` e uma `financial_entry` do tipo `receivable` (a receber) com `status=open`.
2.  **Recebimento:** A RPC `rpc.receive_entry(entry_id, account_id, amount)` executa:
    *   `BEGIN`.
    *   Insere uma `financial_transaction` (entrada) na tabela `lancamentos`.
    *   Atualiza o `saldo` da `account_id`.
    *   Atualiza o `status` da `financial_entry`.
    *   `COMMIT`.

#### 🔁 Transferência entre Contas
*   A transferência é uma operação crítica que deve ser tratada como uma única transação atômica. A RPC `rpc.transfer(from_account, to_account, amount)` deve gerar **DUAS** transações (`OUT` na conta de origem e `IN` na conta de destino) e atualizar ambos os saldos dentro de um único bloco `BEGIN...COMMIT`. Isso evita cenários onde o dinheiro "some" ou "aparece" devido a falhas parciais.

#### 🏦 Empréstimos, Sócios e Patrimônio
*   **Empréstimos:** O recebimento de um empréstimo gera uma `financial_entry` (do tipo `loan payable`) e uma `financial_transaction` (entrada). O pagamento das parcelas segue o fluxo de `pay_entry`.
*   **Sócios:** Aportes de capital geram `financial_transactions` (entrada). Retiradas geram `financial_transactions` (saída).
*   **Patrimônio:** A compra/venda de ativos gera `financial_entries` vinculadas ao ativo. A movimentação financeira associada segue o fluxo padrão de pagamentos/recebimentos.

### 3.6. Regras de Ouro e Arquitetura Segura do Banco de Dados

1.  **Saldo Sagrado:** O saldo de uma conta (`accounts.saldo`) deve ser atualizado **SOMENTE** dentro de funções SQL (RPCs ou Triggers). **NUNCA** deve ser atualizado diretamente via `UPDATE` manual ou por lógica no frontend. O saldo é uma **consequência** do histórico de transações, não um valor que pode ser arbitrariamente alterado.

2.  **Histórico Imutável:** Transações financeiras (`financial_transactions`) nunca devem ser apagadas. Se um erro ocorreu, a correção deve ser feita através de um **Estorno**, que é uma nova transação de compensação. Isso mantém um registro completo e auditável de todas as movimentações, essencial para conformidade e resolução de disputas.

3.  **Sincronização Realtime:** Para sistemas que exigem reatividade, as tabelas `financial_transactions`, `accounts` e `financial_entries` devem ser monitoradas para mudanças. A interface do usuário deve refletir instantaneamente essas mudanças, utilizando mecanismos como o Supabase Realtime em conjunto com o TanStack Query para invalidar e revalidar caches.

4.  **Atomicidade:** Qualquer operação que envolva a modificação de mais de uma tabela ou que exija a manutenção da integridade transacional **DEVE** ser encapsulada em um bloco `BEGIN...COMMIT` no SQL. Isso garante que a operação seja tratada como uma unidade indivisível.

5.  **Validação Rigorosa:** Além da validação na camada de serviço, o banco de dados deve impor suas próprias regras de validação. Isso inclui verificar `company_id` (para multitenancy), saldo disponível (antes de um débito) e o status do registro (se uma `financial_entry` pode ser paga, por exemplo) antes de processar qualquer alteração.

### 3.7. Visão Final: A Única Verdade

> Tudo o que se refere ao dinheiro converge para: `financial_transactions`.
> Se não está no diário de bordo, o dinheiro não se moveu. Se o saldo não bate com a soma das transações, a integridade foi quebrada.

Esta máxima resume a filosofia de um sistema financeiro robusto. A tabela `financial_transactions` é o registro definitivo de todos os eventos monetários. Qualquer discrepância entre o saldo atual de uma conta e a soma de suas transações indica uma falha crítica na integridade do sistema. A arquitetura proposta segue o fluxo: **Pedido → Entry → RPC → Transaction → Saldo**, onde cada etapa é validada e protegida.

### 3.8. Perguntas de Revisão para Banco de Dados

*   **Integridade Transacional:** Esta operação pode deixar o banco de dados em um estado inconsistente se falhar no meio do caminho? O `BEGIN...COMMIT` está sendo usado corretamente?
*   **Imutabilidade:** Existe algum cenário onde uma transação financeira está sendo deletada em vez de estornada?
*   **Fonte da Verdade:** A lógica de cálculo de saldo está centralizada no banco de dados ou está sendo replicada em outras camadas, aumentando o risco de inconsistências?
*   **Desempenho:** As queries mais críticas estão utilizando índices adequados? Usei `EXPLAIN ANALYZE` para identificar gargalos?
*   **Segurança:** As políticas de RLS estão ativas e corretamente configuradas para todas as tabelas sensíveis?

---

## 4. Multitenancy e Isolamento: A Regra de Ouro do SaaS

Para aplicações SaaS (Software as a Service) que atendem a múltiplos clientes ou empresas a partir de uma única instância de software, a arquitetura de **Multitenancy** é um requisito fundamental. O desafio é garantir que os dados de uma empresa estejam completamente isolados e inacessíveis por outras, mantendo a eficiência e a escalabilidade. O Supabase, com seu poderoso sistema de Row Level Security (RLS), oferece uma solução elegante para este problema.

### 4.1. A Regra de Ouro do SaaS: `organization_id`

> **Regra #7 (A Regra de Ouro do SaaS):** Toda tabela que contém dados de um cliente **DEVE** ter uma coluna `organization_id`.

Esta regra é inegociável. A presença de um `organization_id` em cada registro de dados de cliente é o mecanismo primário para garantir o isolamento. Sem ele, não há como diferenciar a propriedade dos dados entre os diferentes inquilinos do sistema.

Para gerenciar as organizações e seus membros, a estrutura de tabelas deve incluir:

*   `organizations`: Tabela principal para registrar cada empresa/organização.
    ```sql
    CREATE TABLE organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ```
*   `organization_members`: Tabela de junção para associar usuários a organizações e definir seus papéis.
    ```sql
    CREATE TABLE organization_members (
        organization_id UUID REFERENCES organizations(id) NOT NULL,
        user_id UUID REFERENCES auth.users(id) NOT NULL,
        role TEXT NOT NULL DEFAULT 'member', -- Ex: 'admin', 'member', 'viewer'
        PRIMARY KEY (organization_id, user_id)
    );
    ```

As tabelas de dados de negócio, como `contas` e `lancamentos`, devem ser estendidas para incluir a coluna `organization_id`, criando a ligação direta com a organização proprietária dos dados.

```sql
-- Exemplo de adição de organization_id a uma tabela existente
ALTER TABLE contas ADD COLUMN organization_id UUID REFERENCES organizations(id) NOT NULL;
ALTER TABLE lancamentos ADD COLUMN organization_id UUID REFERENCES organizations(id) NOT NULL;
```

### 4.2. Autenticação e Autorização com Row Level Security (RLS)

O RLS é a camada de segurança mais poderosa do PostgreSQL e, consequentemente, do Supabase. Ele permite definir políticas que restringem o acesso a linhas individuais de uma tabela com base no usuário autenticado ou em outras condições. Para multitenancy, o RLS é a garantia de que um usuário só verá os dados de sua própria organização.

#### Skill 5: Políticas de Segurança Baseadas em Organização

Para simplificar a gestão das políticas de RLS e centralizar a lógica de verificação de associação à organização, é altamente recomendável criar uma função auxiliar no SQL.

```sql
-- Função auxiliar para verificar se um usuário pertence a uma organização
CREATE OR REPLACE FUNCTION is_member_of(p_org_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Complemento Técnico:** A função `is_member_of` também utiliza `SECURITY DEFINER` para garantir que ela possa consultar a tabela `organization_members` mesmo que o usuário autenticado não tenha permissão direta de leitura nessa tabela. A verificação `user_id = auth.uid()` é crucial para garantir que a função sempre opere no contexto do usuário atualmente autenticado.

Com esta função auxiliar, as políticas de RLS tornam-se concisas e fáceis de entender:

```sql
-- Habilita RLS para a tabela 'contas'
ALTER TABLE contas ENABLE ROW LEVEL SECURITY;

-- Política: Membros da organização podem gerenciar (ver, inserir, atualizar, deletar) suas próprias contas
CREATE POLICY "org_members_can_manage_contas" ON contas FOR ALL
USING ( is_member_of(organization_id) );

-- Habilita RLS para a tabela 'lancamentos'
ALTER TABLE lancamentos ENABLE ROW LEVEL SECURITY;

-- Política: Membros da organização podem ver e gerenciar seus próprios lançamentos
CREATE POLICY "org_members_can_manage_lancamentos" ON lancamentos FOR ALL
USING ( is_member_of(organization_id) );
```

**Resultado:** Com estas políticas de RLS ativas, é **impossível** para um usuário ver, inserir, atualizar ou deletar dados de uma organização da qual não faz parte, mesmo que tente manipular as requisições no frontend ou na camada de serviço. O banco de dados impõe a segurança no nível mais granular.

### 4.3. Perguntas de Revisão para Multitenancy e RLS

*   **Vazamento de Dados:** Existe algum cenário onde um usuário de uma organização pode, acidentalmente ou intencionalmente, acessar dados de outra organização?
*   **Cobertura RLS:** Todas as tabelas que contêm dados de cliente têm RLS habilitado e políticas de segurança baseadas em `organization_id`?
*   **Performance RLS:** As políticas de RLS estão otimizadas? Elas estão causando lentidão nas consultas? (Índices nas colunas usadas nas políticas são cruciais).
*   **Consistência:** A coluna `organization_id` está presente em todas as tabelas de dados de negócio? Há chaves estrangeiras garantindo a integridade referencial?
*   **Testes:** As políticas de RLS foram testadas exaustivamente com diferentes perfis de usuário e organizações?

---

## 5. Performance, Cache e Realtime: Otimizando a Experiência do Usuário

Um sistema sênior não é apenas funcional e seguro; ele é também rápido e responsivo. A otimização de performance envolve uma combinação estratégica de cache, sincronização em tempo real e consultas eficientes, garantindo que a experiência do usuário seja fluida sem sobrecarregar a infraestrutura.

### 5.1. O Modelo Correto: Cache + Revalidação (Stale-While-Revalidate)

O modelo tradicional de "buscar dados toda vez que o módulo abre" é ineficiente e não escala. Em sistemas modernos, a abordagem **Stale-While-Revalidate (SWR)** é o padrão ouro, adotado por gigantes como Vercel, Google e Facebook. Este modelo funciona da seguinte forma:

1.  **Primeira Vez:** O sistema busca os dados do servidor e os exibe.
2.  **Depois:** Em acessos subsequentes, o sistema exibe imediatamente os dados do cache (dados "stale").
3.  **Em Segundo Plano:** Enquanto os dados do cache são exibidos, o sistema revalida os dados em segundo plano, buscando a versão mais recente do servidor.
4.  **Atualização Automática:** Se os dados do servidor forem diferentes, a interface é atualizada automaticamente e o cache é renovado.

No ecossistema React, o **TanStack Query (anteriormente React Query)** é a ferramenta ideal para implementar SWR. Ele gerencia o cache, a deduplicação de requisições, o *background refetch*, a sincronização entre abas e o controle de *stale time*, eliminando a maior parte dos problemas de gerenciamento de estado assíncrono.

### 5.2. Realtime Seletivo: Onde a Reatividade Importa

Um ERP multiusuário precisa de reatividade. Se o Usuário A cria uma conta a pagar, o Usuário B, que está no módulo financeiro, não deveria precisar dar F5 para ver a atualização. O **Supabase Realtime** preenche essa lacuna, transmitindo mudanças do banco de dados (INSERT, UPDATE, DELETE) via WebSockets, e o mais importante: **ele respeita sua Row Level Security**.

#### Skill 6: Assinando Mudanças no Banco de Dados

O uso do Realtime deve ser **cirúrgico**. Não se deve assinar mudanças em todas as tabelas, pois isso pode sobrecarregar o cliente e o servidor. O foco deve ser em tabelas críticas onde a atualização imediata é essencial para a experiência do usuário.

**Exemplo no Frontend (React) com TanStack Query:**

```javascript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase'; // Seu cliente Supabase centralizado

function useRealtimeTransactions(organizationId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) return; // Garante que o filtro esteja presente

    const channel = supabase
      .channel('realtime-lancamentos')
      .on(
        'postgres_changes',
        {
          event: '*', // 'INSERT', 'UPDATE', 'DELETE' ou '*' para todos
          schema: 'public',
          table: 'lancamentos',
          filter: `organization_id=eq.${organizationId}` // Filtro crucial para multitenancy
        },
        (payload) => {
          console.log('Mudança em lançamentos recebida:', payload);
          // Invalida a query de lançamentos para que o TanStack Query refetch os dados
          queryClient.invalidateQueries(['lancamentos', organizationId]);
          // Ou, se a lógica for mais complexa, atualize o cache diretamente:
          // queryClient.setQueryData(['lancamentos', organizationId], (oldData) => {
          //   // Lógica para mesclar payload.new ou payload.old com oldData
          //   return newData;
          // });
        }
      )
      .subscribe();

    return () => {
      // Limpeza: Desinscreve do canal quando o componente é desmontado
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);
}

// Exemplo de uso em um componente de página
function FinanceiroPage({ organizationId }) {
  useRealtimeTransactions(organizationId);

  const { data: lancamentos, isLoading } = useQuery(
    ['lancamentos', organizationId],
    () => supabase.from('lancamentos').select('*').eq('organization_id', organizationId),
    { enabled: !!organizationId } // Só busca se organizationId existir
  );

  if (isLoading) return <div>Carregando lançamentos...</div>;

  return (
    <div>
      <h1>Extrato Financeiro</h1>
      {/* Renderiza a lista de lançamentos */}
    </div>
  );
}
```

**Modelo Mental:**

> Banco = cérebro
> Frontend = visão
> Realtime = nervos

Você não cria 20 cérebros. Você cria 1 fonte de verdade (o banco de dados). O realtime atua como os nervos, transmitindo as mudanças do cérebro para a visão (o frontend) de forma eficiente. O frontend, por sua vez, reage a essas mudanças, atualizando sua representação visual.

### 5.3. Otimização de Consultas e Paginação

Consultas lentas são um dos maiores inimigos da performance. Um desenvolvedor sênior deve dominar as técnicas de otimização de banco de dados.

1.  **Índices no Banco de Dados:** A otimização número um. Adicione índices em todas as colunas usadas em cláusulas `WHERE`, `JOIN`, `ORDER BY` e `GROUP BY`. Use `EXPLAIN ANALYZE` no PostgreSQL para entender como suas queries estão sendo executadas e identificar gargalos.
    ```sql
    CREATE INDEX idx_lancamentos_org_data ON lancamentos (organization_id, data_transacao);
    ```
    **Complemento Técnico:** Índices compostos (como `(organization_id, data_transacao)`) são extremamente eficazes para queries que filtram por múltiplos campos, especialmente em cenários de multitenancy.

2.  **Paginação:** **Nunca** retorne milhares de linhas de uma vez. Sempre pagine os resultados da API. No Supabase, isso é feito facilmente com `.range(from, to)`. Implemente paginação baseada em offset ou, preferencialmente, baseada em cursor para grandes conjuntos de dados, pois é mais eficiente.

3.  **Cache na Edge Function:** Para dados que não mudam com frequência (ex: configurações globais, listas de países), implemente cache na própria Edge Function. Isso reduz a carga no banco de dados e acelera as respostas da API.

### 5.4. O que NÃO Fazer (Anti-Padrões)

*   **Refazer fetch toda navegação:** Viola o princípio SWR e causa lentidão.
*   **Fazer cálculo crítico no front-end:** Viola a regra de que o banco é a fonte da verdade e pode levar a inconsistências.
*   **Manter estado financeiro só na memória:** Perda de dados e inconsistência em caso de refresh ou falha.
*   **Depender só de refresh manual:** Experiência de usuário ruim e falta de reatividade.
*   **Realtime em 30 tabelas ao mesmo tempo:** Sobrecarga desnecessária no cliente e no servidor.
*   **Abrir 200 subscriptions por usuário:** Consumo excessivo de recursos.
*   **Submódulos criando subscriptions sem destruir ao desmontar:** Vazamento de memória e caos silencioso.

### 5.5. Perguntas de Revisão para Performance e Realtime

*   **Escalabilidade:** Esta lista de dados se manterá performática se contiver 10.000, 100.000 ou 1.000.000 de registros? A paginação está implementada corretamente?
*   **Eficiência do Realtime:** O Realtime está sendo usado apenas onde é estritamente necessário? As subscrições são filtradas por `organization_id` e são devidamente limpas (`removeChannel`) quando não são mais necessárias?
*   **Otimização de Query:** Executei `EXPLAIN ANALYZE` nas queries mais importantes? Há índices faltando ou mal utilizados?
*   **Cache:** O TanStack Query está configurado com um `staleTime` e `cacheTime` apropriados para os dados? O cache está sendo invalidado corretamente após mutações?
*   **Modelo Mental:** Estou tratando o banco de dados como a única fonte da verdade para dados críticos, ou estou replicando lógica de cálculo no frontend?

---

## 6. Tópicos Avançados para Produção: Robustez e Confiabilidade

Um sistema pronto para produção vai além da funcionalidade básica. Ele incorpora mecanismos de teste, tratamento de erros, monitoramento e recuperação de desastres para garantir sua robustez e confiabilidade contínuas.

### 6.1. Testes Automatizados: Sua Rede de Segurança

Testes automatizados são a espinha dorsal da confiança no código. Eles permitem que os desenvolvedores façam alterações com segurança, sabendo que as funcionalidades existentes não foram quebradas. Um desenvolvedor sênior entende que testes não são um luxo, mas uma necessidade.

| Tipo de Teste | Foco | Ferramentas Comuns | Dica Sênior |
| :--- | :--- | :--- | :--- |
| **Testes Unitários (Frontend)** | Funções puras, componentes de UI isolados, *hooks* customizados. | Jest, React Testing Library | Teste a lógica interna e a renderização de componentes de forma isolada. Mockar dependências externas. |
| **Testes de Integração (Frontend)** | Fluxos de usuário completos, interação entre componentes, simulação de chamadas de API. | Cypress, Playwright, React Testing Library | Simule cenários de usuário real. Verifique se a UI reage corretamente a diferentes estados de dados. |
| **Testes de API (Edge Functions)** | Chamadas HTTP reais para suas funções de serviço em um ambiente de teste. | Jest, Supertest, Vitest | Verifique se os endpoints retornam os dados esperados e os códigos de status HTTP corretos para diferentes entradas. |
| **Testes de Banco de Dados (SQL)** | Funções SQL, triggers, políticas de RLS. | `pg_prove` (para PostgreSQL), testes transacionais. | Execute testes dentro de transações (`BEGIN`/`ROLLBACK`) para não sujar o banco de dados de teste. |

> **Dica Sênior:** Use **Integração Contínua (CI)** com ferramentas como GitHub Actions para rodar todos os testes automaticamente a cada *push* ou *pull request*. Isso garante que o código que chega à `main` branch já foi validado.

### 6.2. Tratamento de Erros e Resiliência

Um sistema resiliente antecipa e lida graciosamente com falhas. O tratamento de erros deve ser consistente em todas as camadas da aplicação.

*   **Frontend:** Utilize blocos `try...catch` para operações assíncronas. Mostre mensagens de erro amigáveis ao usuário, evitando jargões técnicos. Integre com serviços de monitoramento de erros como **Sentry** ou **LogRocket** para capturar e analisar erros em produção.
*   **Edge Functions:** Valide agressivamente os dados de entrada (com Zod, por exemplo) e retorne códigos de erro HTTP semânticos e consistentes (ex: `400 Bad Request` para validação, `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`). Isso facilita o tratamento de erros no frontend e a depuração.
*   **Banco de Dados:** Em funções SQL, lance exceções explícitas (`RAISE EXCEPTION`) para casos de erro de negócio (ex: `RAISE EXCEPTION 'Saldo insuficiente para a operação.'`). Isso permite que a camada de serviço capture esses erros e os propague de forma adequada.

### 6.3. Backup e Recuperação de Desastres

A perda de dados é um dos piores cenários para qualquer sistema. Um desenvolvedor sênior garante que existam estratégias robustas de backup e recuperação.

*   **PITR (Point-in-Time Recovery):** Habilite este recurso no Supabase. Ele permite "voltar no tempo" para um ponto específico, minimizando a perda de dados em caso de desastre ou corrupção acidental. É a garantia máxima contra a perda de dados.
*   **Acesso Restrito ao Banco de Produção:** O acesso direto ao banco de dados de produção deve ser extremamente restrito. Alterações de schema (DDL) devem ser feitas **apenas** via arquivos de migração versionados (ex: Flyway, Liquibase, ou ferramentas de migração do próprio Supabase CLI). Isso garante que todas as mudanças sejam controladas, auditáveis e reversíveis.

### 6.4. Perguntas de Revisão para Produção

*   **Cobertura de Testes:** A lógica mais crítica do sistema está coberta por testes automatizados? Há testes de ponta a ponta para os fluxos de usuário mais importantes?
*   **Monitoramento de Erros:** O sistema está integrado com uma ferramenta de monitoramento de erros? Estou recebendo alertas para erros em produção?
*   **Plano de Recuperação:** Se o banco de dados for corrompido agora, qual o tempo estimado para restaurar o serviço e qual a perda máxima de dados (RPO - Recovery Point Objective)?
*   **Processo de Deploy:** As alterações no banco de dados são feitas via migrações versionadas? O processo de deploy é automatizado e seguro?

---

## 7. Arquitetura Recomendada (PRO): O Modelo de um ERP Sério

Um ERP (Enterprise Resource Planning) profissional exige uma arquitetura que suporte alta concorrência, consistência de dados e uma experiência de usuário fluida. O modelo proposto integra as melhores práticas de frontend, backend e banco de dados para criar um sistema coeso e eficiente.

### 7.1. Os Quatro Pilares de um ERP Profissional

1.  **Cache Inteligente:** Reduz a carga no servidor e acelera a interface, exibindo dados rapidamente.
2.  **Sincronização em Tempo Real:** Garante que múltiplos usuários vejam as informações mais atualizadas sem a necessidade de recarregar a página.
3.  **Isolamento por Empresa (Multi-tenant):** Protege os dados de cada cliente, garantindo que um não acesse as informações do outro.
4.  **Controle de Consistência de Dados:** Assegura que as informações no banco de dados sejam sempre precisas e íntegras.

### 7.2. As Três Camadas Claras da Arquitetura

#### 🟢 Camada 1 — Banco de Dados (Supabase/PostgreSQL)

Esta é a camada mais crítica, o **cérebro** do sistema. É aqui que a lógica de negócio mais sensível e as regras financeiras inegociáveis devem residir. A integridade dos dados é garantida por:

*   **Cálculos Financeiros:** Todas as operações que envolvem dinheiro (cálculo de saldo, juros, impostos) devem ser realizadas no banco de dados via Stored Procedures ou Triggers. Isso elimina a possibilidade de inconsistências causadas por lógica duplicada ou erros no frontend.
*   **Triggers:** Podem ser usadas para automatizar ações em resposta a eventos no banco de dados, como a atualização de um saldo após a inserção de um lançamento.
*   **Regras Críticas:** Restrições de integridade referencial, validações de dados e políticas de RLS são impostas no nível do banco de dados.
*   **Integridade:** O banco de dados é a única fonte da verdade. Qualquer discrepância deve ser resolvida aqui.

> **Princípio:** Toda regra financeira deve estar no banco. **Nada de cálculo crítico no front-end.**

#### 🔵 Camada 2 — Camada de Dados no Frontend (Data Layer)

Esta camada é a ponte entre o frontend e o backend, otimizando a busca e o gerenciamento de dados. O uso de **TanStack Query (React Query)** em conjunto com o **Supabase Realtime** é a combinação ideal.

**TanStack Query resolve:**

*   **Cache automático:** Armazena os resultados das queries, evitando buscas repetidas.
*   **Deduplicação de requisição:** Se múltiplas partes da aplicação solicitarem os mesmos dados, apenas uma requisição é feita.
*   **Background refetch:** Atualiza os dados em segundo plano, mantendo a UI responsiva.
*   **Sincronização entre abas:** Garante que todas as abas do navegador exibam os mesmos dados.
*   **Controle de stale time:** Define por quanto tempo um dado é considerado "fresco" antes de precisar ser revalidado.

> **Resultado:** Isso elimina 80% dos seus problemas de gerenciamento de estado assíncrono e melhora drasticamente a experiência do usuário.

#### 🟣 Camada 3 — Estado Global (UI State)

Para o estado da interface do usuário que não está diretamente ligado a dados do servidor (ex: filtros aplicados, empresa ativa selecionada, datas selecionadas, estado de modais), uma solução leve e moderna como **Zustand** é recomendada. Ele oferece uma forma simples e eficiente de gerenciar o estado global sem a complexidade de outras bibliotecas.

### 7.3. Como Fazer REALTIME Direito

O Realtime é uma ferramenta poderosa, mas deve ser usada com sabedoria para evitar sobrecarga. O princípio é: **Realtime só onde importa**.

*   **❌ Não faça:** Realtime em 30 tabelas ao mesmo tempo. Isso gera um tráfego de rede excessivo e sobrecarrega tanto o cliente quanto o servidor.
*   **✅ Faça:** Identifique as tabelas críticas onde a atualização imediata é um requisito de negócio. Por exemplo, em um sistema financeiro, `Transações` podem precisar de realtime, mas `Relatórios` (que são agregados de dados) geralmente não. O `Saldo` é um dado derivado, que pode ser atualizado automaticamente quando as transações mudam, sem precisar de uma subscrição direta.

**Exemplo de Arquitetura Profissional:**

Um `FinanceiroProvider` pode carregar os dados iniciais de `contas`, `saldo` e `transações recentes` usando `useQuery` do TanStack Query. Este `useQuery` seria configurado com um `staleTime` (ex: 60 segundos) para exibir dados rapidamente do cache. Simultaneamente, ele ativaria uma subscrição do Supabase Realtime no canal `transactions` (filtrado por `organization_id`). Quando uma mudança é detectada, a função `invalidateQueries()` do TanStack Query é chamada, forçando uma revalidação em segundo plano e atualizando a UI com os novos dados.

```javascript
// Exemplo simplificado no contexto de um provedor ou hook customizado
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './lib/supabase'; // Cliente Supabase

const FinanceiroProvider = ({ children, organizationId }) => {
  const queryClient = useQueryClient();

  // Query para buscar transações (com cache e SWR)
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery(
    ['transactions', organizationId],
    async () => {
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .eq('organization_id', organizationId)
        .order('data_transacao', { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
    { staleTime: 60 * 1000, enabled: !!organizationId } // Dados frescos por 60s
  );

  // Query para buscar saldo (também com cache e SWR)
  const { data: balance, isLoading: isLoadingBalance } = useQuery(
    ['balance', organizationId],
    async () => {
      const { data, error } = await supabase
        .from('contas')
        .select('saldo')
        .eq('organization_id', organizationId)
        .single();
      if (error) throw new Error(error.message);
      return data?.saldo || 0;
    },
    { staleTime: 60 * 1000, enabled: !!organizationId } // Dados frescos por 60s
  );

  // Efeito para gerenciar a subscrição Realtime
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`org_${organizationId}_transactions`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'lancamentos',
          filter: `organization_id=eq.${organizationId}` // Filtro RLS-aware
        },
        (payload) => {
          console.log('Realtime update:', payload);
          // Invalida as queries de transações e saldo para forçar revalidação
          queryClient.invalidateQueries(['transactions', organizationId]);
          queryClient.invalidateQueries(['balance', organizationId]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  // ... (restante do provedor ou componente)
};
```

### 7.4. Sobrecarregando o Banco: O Perigo Real

O Realtime não sobrecarrega o banco se for usado corretamente. Os principais pontos de atenção são:

*   **Filtrar por `company_id` / `organization_id`:** Sempre use filtros no Realtime para que cada usuário receba apenas as atualizações relevantes para sua organização. O Supabase Realtime respeita as políticas de RLS, o que é uma camada adicional de segurança.
*   **Não escutar tabela inteira:** Seja específico sobre quais tabelas e eventos você está interessado.
*   **Não abrir 200 subscriptions por usuário:** Gerencie as subscrições de forma eficiente, abrindo apenas as necessárias e fechando-as quando não estiverem mais em uso.

> **⚠️ O perigo real:** Se você abrir submódulos, e cada submódulo criar uma nova subscription sem destruí-la ao desmontar (retornar a função de limpeza no `useEffect`), você vai criar um **caos silencioso**. O navegador ficará com múltiplas conexões abertas, consumindo recursos e gerando tráfego desnecessário, levando a problemas de performance e estabilidade.

### 7.5. Como Empresas Grandes Fazem

ERPs de empresas grandes não carregam tudo toda vez. Eles seguem um modelo otimizado:

*   **Pré-carrega dados críticos após login:** Informações essenciais são carregadas uma vez e mantidas em cache.
*   **Mantém cache quente:** Os dados mais acessados permanecem no cache para acesso instantâneo.
*   **Sincroniza em background:** Atualizações são feitas de forma assíncrona, sem bloquear a UI.
*   **Só faz hard refetch se necessário:** A revalidação completa só ocorre quando há uma alta probabilidade de dados desatualizados ou uma ação explícita do usuário.

> Isso é arquitetura de produto SaaS sério.

### 7.6. Recomendações Diretas

Para um ERP robusto e performático:

*   ✔️ **TanStack Query:** Para gerenciamento de estado assíncrono e cache.
*   ✔️ **Zustand:** Para estado global da UI (filtros, configurações).
*   ✔️ **Realtime só em tabelas críticas:** Use com moderação e inteligência.
*   ✔️ **Regras financeiras no banco:** Garanta a integridade e a fonte da verdade.
*   ✔️ **Query sempre filtrada por empresa:** Essencial para multitenancy e RLS.

### 7.7. Perguntas de Revisão para Arquitetura de ERP

*   **Consistência:** A lógica de negócio crítica está centralizada no banco de dados, ou há risco de divergência entre as camadas?
*   **Escalabilidade:** O sistema está preparado para lidar com centenas ou milhares de usuários simultâneos sem degradação de performance?
*   **Experiência do Usuário:** A interface é responsiva e reativa? O usuário precisa esperar por dados ou recarregar a página frequentemente?
*   **Otimização de Recursos:** O uso de Realtime e cache está otimizado para evitar sobrecarga no cliente e no servidor?
*   **Manutenibilidade:** A arquitetura é clara e bem definida, facilitando a entrada de novos desenvolvedores na equipe?

---

## 8. O Manual da Tesouraria Perfeita: Dominando o Fluxo de Dinheiro

Imagine que a tesouraria da sua empresa é uma sala de cofres. Se a gestão for amadora, o dinheiro some, as contas não batem e ninguém sabe o porquê. Nosso objetivo é projetar uma sala de cofres digital à prova de falhas. Este manual detalha os princípios e a implementação de um sistema financeiro robusto, baseado na separação clara de conceitos e na atomicidade das operações.

### 8.1. O Princípio Mestre: A Separação dos Poderes Financeiros

O erro fatal de 99% dos sistemas é tratar tudo como "uma transação". Nós separamos o universo financeiro em três dimensões distintas e claras, cada uma com seu propósito e regras específicas:

1.  **O Futuro (As Promessas):** Representa o que vai ou deveria acontecer. São os compromissos financeiros que ainda não se concretizaram.
2.  **O Presente (A Realidade):** Onde o dinheiro está agora. Reflete o estado atual dos recursos financeiros.
3.  **O Passado (A Verdade Imutável):** O que já aconteceu, passo a passo. É o registro histórico e inalterável de todas as movimentações.

### 8.2. As Três Dimensões (Tabelas Base Detalhadas)

#### Dimensão 1: O Livro de Compromissos (`financial_entries`)

Esta tabela é o registro de toda e qualquer obrigação financeira, seja a pagar ou a receber. Uma promessa **NÃO** é dinheiro; é uma expectativa. Ela gerencia o estresse e as expectativas financeiras, olhando para o **FUTURO**.

*   **Estrutura:** Deve conter campos como `id`, `organization_id`, `user_id`, `type` (payable/receivable), `amount`, `due_date`, `status` (`open`, `partially_paid`, `paid`, `overdue`, `canceled`), `description`, `related_order_id` (para vincular a pedidos de compra/venda).
*   **Regra:** O `status` da `financial_entry` é atualizado à medida que os pagamentos/recebimentos ocorrem, mas o dinheiro real só se move através de `financial_transactions`.

#### Dimensão 2: Os Cofres (`accounts`)

Esta tabela representa os locais onde o dinheiro "vive" (contas bancárias, caixa físico, carteiras digitais, etc.). Ela reflete o **PRESENTE**.

*   **Estrutura:** Deve conter `id`, `organization_id`, `user_id`, `name`, `type` (bank, cash, wallet), e o `saldo`.
*   **Regra:** O `saldo` é uma **CONSEQUÊNCIA** das `financial_transactions`, nunca uma fonte de verdade editável manualmente. Ele é atualizado de forma atômica por funções SQL (RPCs ou Triggers) em resposta a movimentações no `financial_transactions`.

#### Dimensão 3: O Diário de Bordo (`financial_transactions`)

Esta é a **verdade absoluta**, o livro-razão imutável. Cada centavo que se moveu é um fato registrado aqui. Ela representa o **PASSADO**.

*   **Estrutura:** Deve conter `id`, `organization_id`, `user_id`, `account_id`, `entry_id` (opcional, para vincular a um compromisso), `type` (credit/debit), `amount`, `transaction_date`, `description`.
*   **Regra:** **Só `financial_transactions` movem dinheiro.** Qualquer alteração no saldo de uma `account` deve ser rastreável a uma ou mais `financial_transactions`. Registros aqui nunca são deletados; erros são corrigidos com estornos.

### 8.3. Fluxos de Trabalho Atômicos (Revisão e Complemento)

As operações financeiras devem ocorrer dentro de funções SQL (RPC) para garantir atomicidade (Tudo ou Nada). Isso significa que todas as etapas de uma operação (verificação de saldo, inserção de transação, atualização de status) são tratadas como uma única unidade. Se qualquer parte falhar, toda a operação é revertida.

#### 🟢 Pedido de Compra
1.  **Criação:** Um pedido de compra gera um `purchase_order` e uma `financial_entry` do tipo `payable` (a pagar) com `status=open`.
2.  **Pagamento:** A RPC `rpc.pay_entry(entry_id, account_id, amount)` executa:
    *   `BEGIN` (inicia a transação).
    *   Verifica o saldo disponível na `account_id`.
    *   Insere uma `financial_transaction` (saída) na tabela `lancamentos`.
    *   Atualiza o `saldo` da `account_id`.
    *   Atualiza o `status` da `financial_entry`.
    *   `COMMIT` (finaliza a transação).

#### 🟢 Pedido de Venda
1.  **Criação:** Um pedido de venda gera um `sales_order` e uma `financial_entry` (`type=receivable`, `status=open`).
2.  **Recebimento:** A RPC `rpc.receive_entry(entry_id, account_id, amount)` executa:
    *   `BEGIN`.
    *   Insere uma `financial_transaction` (entrada) na tabela `lancamentos`.
    *   Atualiza o `saldo` da `account_id`.
    *   Atualiza o `status` da `financial_entry`.
    *   `COMMIT`.

#### 🔁 Transferência entre Contas
*   A transferência é uma operação crítica que deve ser tratada como uma única transação atômica. A RPC `rpc.transfer(from_account, to_account, amount)` deve gerar **DUAS** transações (`OUT` na conta de origem e `IN` na conta de destino) e atualizar ambos os saldos dentro de um único bloco `BEGIN...COMMIT`. Isso evita cenários onde o dinheiro "some" ou "aparece" devido a falhas parciais.

#### 🏦 Empréstimos, Sócios e Patrimônio
*   **Empréstimos:** O recebimento de um empréstimo gera uma `financial_entry` (do tipo `loan payable`) e uma `financial_transaction` (entrada). O pagamento das parcelas segue o fluxo de `pay_entry`.
*   **Sócios:** Aportes de capital geram `financial_transactions` (entrada). Retiradas geram `financial_transactions` (saída).
*   **Patrimônio:** A compra/venda de ativos gera `financial_entries` vinculadas ao ativo. A movimentação financeira associada segue o fluxo padrão de pagamentos/recebimentos.

### 8.4. Regras de Ouro e Arquitetura Segura da Tesouraria

1.  **Saldo Sagrado:** O saldo de uma conta deve ser atualizado **SOMENTE** dentro das funções SQL. Nunca via `update` manual ou lógica no frontend. Ele é uma **consequência** do histórico de transações.
2.  **Histórico Imutável:** Nunca apague uma transação. Se houve erro, faça um **Estorno** (nova transação de compensação). Isso mantém a trilha de auditoria completa.
3.  **Sincronização Realtime:** Escute as tabelas `financial_transactions`, `accounts` e `financial_entries`. Mudou no banco? A UI reflete instantaneamente via TanStack Query.
4.  **Atomicidade:** Toda operação que envolve mais de uma tabela DEVE estar dentro de um bloco `BEGIN...COMMIT`.
5.  **Validação:** Sempre validar `company_id`, saldo disponível e status do registro antes de processar.

### 8.5. Visão Final: A Única Verdade da Tesouraria

> Tudo o que se refere ao dinheiro converge para: `financial_transactions`.
> Se não está no diário de bordo, o dinheiro não se moveu. Se o saldo não bate com a soma das transações, a integridade foi quebrada.

Esta máxima é a bússola para a integridade financeira. A arquitetura segue o fluxo: **Pedido → Entry → RPC → Transaction → Saldo**, garantindo que cada etapa seja validada e protegida, culminando em um registro financeiro inquestionável.

### 8.6. Perguntas de Revisão para a Tesouraria Perfeita

*   **Integridade:** Existe algum cenário onde o saldo de uma conta pode não corresponder à soma de suas `financial_transactions`?
*   **Atomicidade:** Todas as operações financeiras críticas estão encapsuladas em transações SQL?
*   **Imutabilidade:** Há alguma função que permite a exclusão ou modificação direta de `financial_transactions`?
*   **Rastreabilidade:** É possível rastrear cada movimentação de dinheiro desde sua origem (pedido, empréstimo) até seu impacto no saldo?
*   **Segurança:** As RPCs financeiras estão protegidas por `SECURITY DEFINER` e validam o `auth.uid()` e `organization_id` internamente?

---

## 9. Canonico: Regras de Comportamento e Arquitetura do Desenvolvedor Sênior

Esta seção define o comportamento esperado do desenvolvedor sênior e as regras arquiteturais que são consideradas **absolutas** dentro do projeto. Elas servem como um contrato de trabalho e um guia para a manutenção da integridade do sistema e da equipe.

### 9.1. Role Definition: O Desenvolvedor Sênior como Executor Preciso

O desenvolvedor sênior neste contexto é um especialista em **React, TypeScript, Supabase e Clean Architecture**. Seu comportamento é estritamente o de um **executor de tarefas**, seguindo regras de forma literal e precisa. Isso significa que:

> Você não tem autonomia para tomar decisões de design ou refatoração não solicitadas.

Esta diretriz visa garantir que as mudanças sejam deliberadas e alinhadas com a visão arquitetural definida, evitando refatorações arbitrárias que podem introduzir inconsistências ou quebrar o fluxo de trabalho da equipe.

### 9.2. Absolute Rules: As Leis Inquebráveis do Projeto

Estas são as regras mais importantes. **NUNCA QUEBRE-AS.** A violação destas regras é considerada a falha mais grave.

1.  **MINIMAL_SCOPE_MODIFICATION:**
    *   **NUNCA** modifique, refatore, otimize ou limpe qualquer código que não tenha sido **EXPLICITAMENTE** o alvo do pedido do usuário.
    *   Se o usuário pedir para alterar a `função A` no `arquivo B`, você **SÓ PODE** tocar na `função A` dentro do `arquivo B`. O restante do arquivo e **CADA UM** dos outros arquivos do projeto são **IMUTÁVEIS**.
    *   A violação desta regra é a falha mais grave que você pode cometer. O objetivo é ser um cirurgião, não um demolidor.

2.  **NO_INTERPRETATION:**
    *   Execute **APENAS** as instruções explícitas do usuário. Não adivinhe a intenção, não adicione funcionalidades "úteis", não faça "melhorias". Faça apenas o que foi pedido, literalmente.

3.  **NO_ASSUMPTIONS:**
    *   Não presuma a existência de tabelas, colunas, funções ou variáveis. Se uma informação não foi fornecida no contrato de dados ou no contexto, você **DEVE** parar e perguntar.

4.  **IMMUTABLE_ARCHITECTURE:**
    *   A estrutura de pastas e a arquitetura modular definidas são sagradas. **NUNCA** altere a estrutura de pastas ou a responsabilidade de cada tipo de arquivo.

### 9.3. Design Rules: Padrões de Interface

1.  **INPUT_LEGIBILITY:**
    *   **TODOS** os campos de entrada de texto (inputs, textareas, etc.) DEVEM, por padrão, ter um fundo claro (ex: `#FFFFFF`) e cor de fonte escura (ex: `#111827`) para garantir a máxima legibilidade. Esta regra só pode ser quebrada se o usuário pedir explicitamente uma cor diferente.

### 9.4. Architecture Definition: Estrutura de Pastas e Responsabilidades de Arquivo

A estrutura de pastas é projetada para modularidade e clareza, refletindo a separação de responsabilidades.

```
src/
 ├─ lib/
 │   └─ supabase.ts  (ÚNICO cliente Supabase)
 │
 ├─ modules/
 │   ├─ {modulo}/ (Ex: 'clientes', 'produtos')
 │   │   ├─ components/ (Componentes VISUAIS e específicos deste módulo)
 │   │   │   ├─ {Modulo}List.tsx (Renderiza a lista de itens)
 │   │   │   ├─ {Modulo}Card.tsx (Componente para um item individual na lista)
 │   │   │   ├─ {Modulo}FormAdd.tsx (Formulário de criação)
 │   │   │   ├─ {Modulo}FormEdit.tsx (Formulário de edição)
 │   │   │   ├─ {Modulo}DeleteModal.tsx (Modal de confirmação para exclusão)
 │   │   │   ├─ {Modulo}Filters.tsx (Filtros da listagem)
 │   │   │   └─ {Modulo}Kpis.tsx (Indicadores/KPIs do módulo)
 │   │   │
 │   │   ├─ {modulo}.page.tsx (Orquestrador do módulo)
 │   │   ├─ {modulo}.service.ts (Lógica de dados - Supabase)
 │   │   └─ {modulo}.types.ts (Tipos e interfaces do módulo)
```

**Responsabilidades de Arquivo:**

*   **`{modulo}.page.tsx`**: O orquestrador do módulo. Controla o estado da página, chama os serviços de dados e passa as informações para os componentes visuais.
*   **`{modulo}.service.ts`**: A camada de dados. É o **ÚNICO** local que acessa o Supabase. Contém as funções de CRUD e qualquer lógica de manipulação de dados relacionada ao módulo.
*   **`components/*.tsx`**: A camada visual. Componentes "burros" que apenas recebem dados via `props` e disparam eventos. Eles não devem ter lógica de negócio complexa ou acesso direto a dados.

### 9.5. Supabase Rules: Diretrizes de Interação

*   O único cliente Supabase é o que está em `src/lib/supabase.ts`. **Importe-o de lá.**
*   **PROIBIDO** acessar o Supabase diretamente de qualquer arquivo `.tsx`. Todas as interações devem passar pela camada de serviço (`.service.ts`).
*   Todas as tabelas devem ter `id (uuid)`, `user_id (uuid)` e `created_at` para padronização e auditoria.
*   **RLS (Row Level Security) é OBRIGATÓRIO** para todas as tabelas. A policy padrão é `auth.uid() = user_id` (ou `is_member_of(organization_id)` para multitenancy).
*   **NUNCA** use a `service_role` key no frontend.

### 9.6. Workflow and Output: Protocolos de Interação

#### Natural Language Interpretation Protocol

O usuário não é programador. Ele descreverá as tarefas em linguagem natural, referindo-se a "telas" e "botões". Sua **PRIMEIRA TAREFA** ao receber um pedido de modificação, adição ou correção é **TRADUZIR** o pedido do usuário para um plano técnico.

*   **Exemplo de Tradução:** Se o usuário disser "Na tela de clientes, mude o botão de salvar para verde", você deve usar a `<architecture_definition>` para deduzir que o arquivo a ser alterado é `src/modules/clientes/components/ClientesFormAdd.tsx`.
*   Após traduzir, você seguirá o fluxo `MODIFY_EXISTING_CODE` normalmente: apresentará seu plano (o arquivo que você deduziu) e pedirá confirmação antes de codificar.

#### Task Flow (CREATE_NEW_MODULE)

1.  Você receberá uma tag `<task>` com a instrução para "CRIAR" um novo módulo.
2.  Responda listando **TODOS** os arquivos que você irá criar, com seus paths completos.
3.  Aguarde a confirmação do usuário ("Pode prosseguir" ou similar).
4.  Após a confirmação, gere o código para **CADA ARQUIVO**, um por um, em blocos de código separados e identificados pelo path completo do arquivo.

#### Task Flow (MODIFY_EXISTING_CODE)

1.  Você receberá uma tag `<task>` com uma instrução para "MODIFICAR", "ADICIONAR" ou "CORRIGIR".
2.  Siga o `natural_language_interpretation_protocol` para identificar o(s) arquivo(s) correto(s).
3.  Apresente seu plano de ataque, declarando o(s) arquivo(s) que você identificou e um resumo da mudança.
4.  **CONFIRME** que nenhum outro arquivo será afetado e aguarde a confirmação do usuário.
5.  Após a confirmação, gere **APENAS** o bloco de código alterado. **NÃO** reescreva o arquivo inteiro.

#### Output Format

*   Sempre que gerar código, coloque-o dentro de um bloco de código cercado por ````typescript`.
*   Antes de cada bloco de código, coloque um comentário com o path completo do arquivo. Ex: `// File: src/modules/clientes/clientes.page.tsx`

#### Self-Correction Check

*   Antes de finalizar sua resposta, revise **TODAS** as regras nesta instrução, especialmente a `MINIMAL_SCOPE_MODIFICATION`.
*   Se você detectar que sua resposta viola alguma regra, pare, descarte a resposta e comece de novo, seguindo as regras corretamente.

### 9.7. Perguntas de Revisão para o Canonico

*   **Conformidade:** A alteração que estou prestes a fazer viola alguma das `Absolute Rules` (especialmente `MINIMAL_SCOPE_MODIFICATION`)?
*   **Interpretação:** Entendi o pedido do usuário literalmente, ou adicionei alguma funcionalidade ou melhoria não solicitada?
*   **Assunções:** Estou assumindo a existência de alguma tabela, coluna ou função que não foi explicitamente definida ou fornecida no contexto?
*   **Arquitetura:** A estrutura de pastas ou a responsabilidade de algum arquivo foi alterada?
*   **Legibilidade:** Os campos de entrada de texto que estou criando ou modificando seguem o padrão de legibilidade (fundo claro, fonte escura)?

---

## 10. Otimizações Avançadas de Inicialização e Fluxo de Dados

Para sistemas de grande escala, como ERPs, a performance na inicialização e a resiliência do fluxo de dados em tempo real são cruciais. Um desenvolvedor sênior não se contenta com o básico, mas busca estratégias que garantam uma experiência de usuário impecável, mesmo sob condições adversas ou com grandes volumes de dados.

### 10.1. Estratégia de Bootstrapping: Carregamento Inicial Otimizado

O "waterfall" de requisições na inicialização da aplicação pode ser um gargalo significativo. Em vez de carregar dados essenciais (informações do usuário, configurações da organização, permissões) em requisições separadas e sequenciais, a estratégia de bootstrapping visa consolidar e otimizar este processo.

#### 10.1.1. Consolidação de Dados Essenciais

Ao invés de:

```javascript
// Requisições sequenciais e independentes
const user = await supabase.auth.getUser();
const organization = await supabase.from("organizations").select("*").eq("id", user.organization_id);
const settings = await supabase.from("settings").select("*").eq("organization_id", organization.id);
```

Considere uma única Edge Function ou RPC que retorna todos os dados essenciais em um único payload:

```typescript
// Edge Function ou RPC: api/bootstrap-data
// Retorna { user, organization, settings, permissions, etc. }

// No frontend:
const bootstrapData = useQuery(["bootstrapData"], () => api.getBootstrapData());
```

Esta abordagem reduz a latência de rede e o número de handshakes HTTP, acelerando a inicialização da aplicação. O `useQuery` do TanStack Query pode gerenciar o cache desses dados, garantindo que sejam buscados apenas uma vez e revalidados conforme necessário.

#### 10.1.2. Prefetching de Módulos Adjacentes

Antecipe as necessidades do usuário. Se o usuário está no módulo de `Vendas`, é provável que ele vá para `Clientes` ou `Produtos` em seguida. Utilize o TanStack Query para pré-carregar dados de módulos adjacentes em segundo plano.

```javascript
// No módulo de Vendas, após o carregamento inicial
queryClient.prefetchQuery(["clientes", organizationId], () => clienteService.getAll(organizationId));
queryClient.prefetchQuery(["produtos", organizationId], () => produtoService.getAll(organizationId));
```

Isso torna a navegação entre módulos quase instantânea, pois os dados já estarão no cache quando o usuário acessar a próxima tela. O `staleTime` e `cacheTime` do TanStack Query devem ser configurados para equilibrar a frescura dos dados com o consumo de recursos.

### 10.2. Otimização de Payload Realtime: Trafegando Apenas o Essencial

Embora o Supabase Realtime seja eficiente, trafegar o payload completo de uma linha alterada pode ser excessivo, especialmente para tabelas com muitas colunas ou dados grandes. Otimize o payload para reduzir o tráfego de rede e o processamento no cliente.

#### 10.2.1. Filtros de Coluna no Realtime

O Supabase permite filtrar as colunas que são transmitidas via Realtime. Em vez de `event: '*'`, que envia todas as colunas, especifique apenas as colunas que o frontend realmente precisa para atualizar a UI.

```javascript
supabase
  .channel("realtime-lancamentos")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "lancamentos",
      filter: `organization_id=eq.${organizationId}`,
      // Adicione a lista de colunas que você realmente precisa
      columns: ["id", "valor", "descricao", "data_transacao"]
    },
    (payload) => {
      // ... lógica de atualização da UI
    }
  )
  .subscribe();
```

Esta otimização é feita no lado do servidor (PostgreSQL) e reduz significativamente o volume de dados trafegados via WebSocket, melhorando a performance e reduzindo o consumo de banda.

#### 10.2.2. Atualização Parcial do Cache

Em vez de invalidar a query inteira e refetchar todos os dados, considere atualizar o cache do TanStack Query com o payload parcial recebido do Realtime. Isso é útil para atualizações de campos específicos que não afetam a estrutura geral da lista.

```javascript
queryClient.setQueryData(["lancamentos", organizationId], (oldData) => {
  if (!oldData) return [];
  // Lógica para encontrar e atualizar o item específico no array oldData
  return oldData.map(item => item.id === payload.new.id ? { ...item, ...payload.new } : item);
});
```

### 10.3. Resiliência de Conexão Realtime: Lidando com Desconexões

Conexões WebSocket podem cair. Um sistema sênior deve ser resiliente a essas falhas, garantindo que a UI se recupere e se resincronize sem a intervenção do usuário.

#### 10.3.1. Reconexão Automática e Backoff

O Supabase Realtime já possui mecanismos de reconexão automática com backoff exponencial. No entanto, é importante garantir que o `useEffect` que gerencia o canal do Supabase esteja configurado para lidar com essas reconexões, invalidando o cache do TanStack Query para garantir que os dados sejam revalidados após a reconexão.

```javascript
useEffect(() => {
  const channel = supabase
    .channel("realtime-channel")
    .on("system", { event: "RECONNECT" }, () => {
      console.log("Realtime reconnected, invalidating queries...");
      queryClient.invalidateQueries(); // Invalida todas as queries relevantes
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [queryClient]);
```

#### 10.3.2. Sincronização Otimista e Rollback

Para operações críticas, considere a **sincronização otimista**. A UI é atualizada imediatamente, assumindo que a operação será bem-sucedida. Se a operação falhar no backend, a UI é revertida para o estado anterior. O TanStack Query oferece suporte nativo para mutações otimistas, o que melhora a percepção de velocidade da aplicação.

```javascript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    // Cancela quaisquer refetches pendentes para evitar sobrescrever a atualização otimista
    await queryClient.cancelQueries({ queryKey: ["todos"] });

    // Snapshot do valor anterior
    const previousTodos = queryClient.getQueryData(["todos"]);

    // Atualiza otimisticamente
    queryClient.setQueryData(["todos"], (old) => [...old, newTodo]);

    return { previousTodos };
  },
  onError: (err, newTodo, context) => {
    // Reverte para o valor anterior em caso de erro
    queryClient.setQueryData(["todos"], context.previousTodos);
  },
  onSettled: () => {
    // Sempre revalida após a mutação, seja sucesso ou falha
    queryClient.invalidateQueries({ queryKey: ["todos"] });
  },
});
```

### 10.4. Perguntas de Revisão para Otimizações Avançadas

*   **Latência de Inicialização:** A aplicação está realizando múltiplas requisições sequenciais na inicialização? Há uma Edge Function/RPC de bootstrapping consolidando esses dados?
*   **Navegação Fluida:** O prefetching está sendo utilizado para carregar dados de módulos adjacentes, tornando a navegação mais rápida?
*   **Eficiência do Realtime:** O payload do Realtime está otimizado com filtros de coluna? Estou atualizando o cache parcialmente em vez de refetchar tudo?
*   **Resiliência:** A aplicação lida graciosamente com desconexões e reconexões do Realtime? Há um mecanismo de sincronização otimista para operações críticas?
*   **Monitoramento:** Estou monitorando a performance de carregamento inicial e a latência das requisições para identificar gargalos?

---

## 11. Checklist Final do Desenvolvedor Sênior

Antes de considerar uma funcionalidade "pronta", o desenvolvedor sênior deve submeter seu trabalho a um crivo final, garantindo que todos os pilares de qualidade foram atendidos.

- [ ] **Estrutura:** O código está no lugar certo, seguindo a arquitetura modular definida?
- [ ] **Segurança:** A política de RLS está implementada, correta e testada para o cenário de multitenancy?
- [ ] **Lógica de Negócio:** A fonte da verdade para cálculos e regras críticas reside inquestionavelmente no banco de dados (via RPCs/Triggers)?
- [ ] **Tempo Real:** A interface reage a mudanças de outros usuários onde é necessário? As subscrições são eficientes e devidamente encerradas?
- [ ] **Testes:** A lógica crítica e os fluxos de usuário mais importantes estão cobertos por testes automatizados?
- [ ] **Tratamento de Erros:** O que acontece se a chamada de rede falhar ou a conexão WebSocket cair? A UI lida com isso de forma graciosa?
- [ ] **Performance:** A query principal usa índices? Os dados são paginados? As otimizações avançadas de bootstrapping, prefetching e payload de realtime foram aplicadas?
- [ ] **Backup e Recuperação:** Estou confiante de que posso recuperar os dados desta funcionalidade em caso de desastre?

---

## 12. Referências

[1] Conteúdo fornecido pelo usuário (pasted_content.txt)
