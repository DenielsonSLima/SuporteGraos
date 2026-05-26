# Relatório de Pré-Validação e Diagnóstico de Dados para Migração

Este relatório foi gerado automaticamente pelo script de auditoria para identificar inconsistências entre as tabelas da planilha legado e preparar a limpeza de dados.

## 1. Estatísticas de Registros

| Tabela / Aba | Quantidade de Registros no Excel |
| :--- | :---: |
| **Clientes** | 116 |
| **Produtores** | 212 |
| **Compras** | 226 |
| **Vendas** | 265 |
| **Cargas** | 1377 |
| **Pag_produtores** | 1582 |
| **Rec_vendas** | 2408 |
| **Comissoes** | 28 |
| **Pag_comissoes** | 30 |
| **Transfers** | 78 |

## 2. Resultados do Diagnóstico (Alertas e Erros)

Foram encontrados **378** alertas e inconsistências que devem ser tratados no processo de migração:

### 🚨 Erros Críticos (Precisam de Mapeamento/Ajuste de Relacionamento)
- ❌ [Financeiro - PagProdutor] Lançamento de pagamento ID **a5694fa5** refere-se ao contrato de compra legado '**None**', que não existe.
- ❌ [Financeiro - PagProdutor] Lançamento de pagamento ID **9dfb6299** refere-se ao contrato de compra legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **6467d4a3** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **a9d7c7b4** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **0e8818d4** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **075fec85** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **56105ae6** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **40288375** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **7578b042** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **27b4663c** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **fa1254be** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **4df254bc** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **8c92c34d** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **5f819fd6** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **8d10ac0c** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **92e9a4ee** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **dcd7e016** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **09fb8fee** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **94247925** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **50a7d52a** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **97ca3339** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **9a6810f0** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **75109592** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **2145d7bf** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **9ca66908** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **37b97189** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **e430fafe** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **6d4b3d2a** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **c457ae87** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **1be0e895** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **4bfb35a9** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **c2c4393f** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **b80cf4d2** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **ba59b123** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **16ce57a0** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **c2b117cb** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **13529613** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **b76fe316** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **e5dcefd6** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **cb289fad** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **63b60ddd** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **d6aaf61e** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **de80203b** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **b31fc77b** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **b907e07c** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **3617355e** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **91ca6d4b** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **500971df** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **e8c85028** refere-se ao contrato de venda legado '**None**', que não existe.
- ❌ [Financeiro - RecebimentoVenda] Recebimento ID **d2be57ae** refere-se ao contrato de venda legado '**None**', que não existe.

### ⚠️ Avisos de Qualidade de Dados (Valores em Branco ou Duplicados)
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Adailton**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Alianca**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Corretor**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Cajazeirinhas**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Caruaru J2**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Clodoaldo Corretor**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Cooperflores**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Diego Atacadao Racao**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ducampo Campina**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Fernando Vilela**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Granja Canaa**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Granja Kumamoto**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Guaraves**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Japones**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Matildes**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Michael Campina Grande**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ovos Sao Tome**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Pesqueira**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Rei Do Ouro**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Reinaldo**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Rural Log Pedro Falcao**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Sao Bento Branco**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Sr. Pedro São Bento**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Sr. Pedro Vitoria**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Thiago Garanhuns**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ana Maria Laroche**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Timbauba**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Canguaretama**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Santa Cruz - RN**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Frei Damião**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Mamanguape**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Macaíbas**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ilario Campina Grande**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Pombal**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Natto Branco**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Michel Campina Grande / Azevem**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Natto Newtinho**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Andre Brejinho**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Andre JP**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Nova Cruz**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Julia Igarassu**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Três Corações**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Copeavi Espirito Santo**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Andre Sapé**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Granja Vitoria**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Natto/Newtinho**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Silva e Melo**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Fabio Mossoró**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Pindorama**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Andé Caruaru**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Andée Caruaru**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Thiago Feira Nova**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Andre Natal**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ernesto SW4**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Jorge Amarok**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Vanilson Caruaru**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Sr Pedro Bonito**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Caruaru**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Mari**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Felipe Aguiar**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **São Braz Bahia**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ingredion**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Igredion**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Santo Antonio**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Michel Pocinhos**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Pedro Caruaru**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Confinamento São Pedro**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Thiago Barros**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Marcelo Cumbe**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Diego Cajazeirinhas**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Peterson**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **André Juripiranga**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Netto Serra talhada**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Bruno JP**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Frango da Roça**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Edenilson Balsas**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Michael Ovos Enaves**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **São Braz/Branco**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Barretinho**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Granja Farias Macaiba**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Granja Vilela**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **TESTE**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Wendoly**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ilario Paulista**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Zé Arnaldo**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Rodrigo Gargamel**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Rodrigo Garmamel**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Pedro Falcão**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Pedro Falcão Kumamoto**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Granja Cajueiro**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Nutrane**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Ilario Gravatá**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Sabormill**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Bezerros**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Frango Dourado**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Boi Nelore**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Pedro Bozerro**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **São José do Egito**
- ⚠️ [Cadastro - Cliente] Documento em branco para parceiro: **Pedro Bezerros**

*... e outros 221 avisos de qualidade não listados.*

### ℹ️ Informações e Sugestões de Agrupamento (Deduplicação de Parceiros)
- ℹ️ [Duplicidade] Nome '**Edenilson Balsas**' cadastrado tanto em Cliente quanto em Produtor. Serão mesclados.
- ℹ️ [Duplicidade] Nome '**TESTE**' cadastrado tanto em Cliente quanto em Produtor. Serão mesclados.
- ℹ️ [Duplicidade] Nome '**Reinaldo**' cadastrado tanto em Cliente quanto em Produtor. Serão mesclados.
- ℹ️ [Duplicidade] Nome '**Thiago Feira Nova**' cadastrado tanto em Cliente quanto em Produtor. Serão mesclados.
- ℹ️ [Duplicidade] Nome '**Marcelo Cumbe**' cadastrado tanto em Cliente quanto em Produtor. Serão mesclados.
- ℹ️ [Duplicidade] Nome '**Peterson**' cadastrado tanto em Cliente quanto em Produtor. Serão mesclados.
- ℹ️ [Duplicidade] Nome '**André**' cadastrado tanto em Cliente quanto em Produtor. Serão mesclados.

## 3. Resolução Recomendada no Script de Migração

1. **Criação de Clientes/Produtores Órfãos:** Para os contratos de compra/venda que citam parceiros inexistentes nas abas `Cliente` e `Produtor`, o script de migração criará automaticamente os registros do parceiro usando apenas o nome e definindo dados como documento e endereço em branco.
2. **Limpeza de Documentos:** Todos os caracteres não numéricos de CPF/CNPJ serão removidos. Registros vazios ou com tamanho inválido serão gravados como `NULL` no banco de dados, evitando erros de restrição de integridade.
3. **Mesclagem automática de Parceiros:** O script de inserção irá verificar se o nome ou CPF já existe na base antes de inserir um novo parceiro. Se encontrar, ele reutilizará o mesmo ID do parceiro e adicionará a nova categoria (ex: um produtor que também é cliente).
