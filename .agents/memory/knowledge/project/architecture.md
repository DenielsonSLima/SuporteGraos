# Architecture and Tech Stack — Suporte Grãos ERP

## O que é este projeto
Sistema de Gestão Empresarial (ERP) especializado para trading e corretagem de grãos (milho, soja, arroz), focado no gerenciamento de contratos de compra/venda e logística de transporte.

## Stack tecnológica
- **Frontend**: React (Vite) + TypeScript
- **Backend / DB**: Supabase (PostgreSQL + RLS + Edge Functions)
- **Estilização**: Tailwind CSS / Vanilla CSS
- **Hospedagem**: Vercel

## Arquitetura e estrutura de pastas
- `modules/`: Componentes e lógica por domínio (Financeiro, Logística, Pedidos, etc.)
- `services/`: Comunicação com Supabase e lógica de negócio.
- `hooks/`: Custom hooks para gestão de estado.
- `supabase/`: Migrações e definições do banco de dados.

## Decisões técnicas importantes
- **Paginação Manual no PDF**: Para contornar limitações do Puppeteer.
- **Integração com API Brasil**: Obtenção de dados de veículos.
- **Acesso ao Supabase**: Uso direto via MCP (`supabase-mcp-server`).
