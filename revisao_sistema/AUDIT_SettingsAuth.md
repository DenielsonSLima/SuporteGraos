# 📊 Auditoria de Módulo: Settings & Auth (Seguranca e Configuracoes)

**Status:** 🟡 AMARELO (Funcional, mas com dependência local)

## 🎯 Resumo Executivo
O módulo de Autenticação e Configurações é robusto em termos de integração com o Supabase Auth, mas ainda apresenta características de "Single User" em algumas áreas de configuração. A dependência excessiva do `localStorage` e `sessionStorage` para configurações de interface impede uma experiência multi-dispositivo consistente.

## ✅ O que está de acordo (Standards)
- **Integração Auth Real:** O login utiliza o `signInWithPassword` nativo do Supabase, garantindo que a segurança JWT e o hashing de senhas sejam tratados pelo provider especializado.
- **Sincronização de Cadastro:** Dados críticos da empresa (CNPJ, Razão Social) são persistidos na tabela `companies` com validações básicas no banco.
- **Audit Trail:** Cada login e alteração de configuração é registrado no `logService`, mantendo o histórico de conformidade.

## ⚠️ Resíduos Identificados (A Mudar)
- **Customização Volátil:** As configurações da tela de login (fundo, frequência) existem apenas no `localStorage`. Se o usuário trocar de navegador, as imagens e preferências desaparecem. 
    - *Sugestão:* Criar uma tabela `app_settings` vinculada ao `company_id`.
- **Efeito Colateral em Updates:** O serviço de marca d'água (`updateWatermark`) e dados da empresa atualizam o cache local antes da confirmação do banco. Em caso de erro de rede, o usuário terá uma falsa percepção de sucesso.
- **Normalização no Frontend:** A conversão de rôles (ex: 'Gerente' -> 'manager') ocorre no código JS. Isso deveria ser reforçado por uma `CHECK CONSTRAINT` no PostgreSQL para evitar dados inválidos.

## 🛠️ Plano de Ação Recomendado
1. **Persistência de Preferências:** Mover o `LoginScreenSettings` para o banco de dados.
2. **Refatoração para Pessimismo Construtivo:** Só atualizar o estado local/localStorage após o retorno de sucesso do Supabase nas funções de `update`.
3. **Trigger de Proteção:** Garantir que o `company_id` em tabelas de configuração não possa ser alterado por usuários sem permissão `admin` via RLS (Row Level Security).

---
*Auditoria realizada por: Senior Architect & Paulo (Architect)*
