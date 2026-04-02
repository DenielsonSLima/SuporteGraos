# Visão Geral do Sistema — Suporte Grãos ERP

## Produto
ERP para trading/corretagem de grãos (milho, soja, arroz), focado no gerenciamento de contratos de compra/venda e logística de transporte. Sem estoque próprio (compra do produtor → carrega → envia ao comprador).

## Módulos do Sistema
| Módulo | Função |
|---|---|
| Parceiros | Cadastro de produtores, transportadoras, compradores |
| Ped. Compra | Contratos de compra com produtores |
| Ped. Venda | Contratos de venda para compradores |
| Logística | Gestão de fretes e transportadoras |
| Financeiro | Central de fluxo de caixa |
| Performance | Indicadores e KPIs |

## Fluxo Central de Negócio
PRODUTOR → [Pedido de Compra] → [Carregamento / Romaneio] → [Pedido de Venda] → [Entrega] → [Peso de Descarga] → [Financeiro].

### Regras Críticas
- Carregamento vincula Compra ↔ Venda.
- Gatilho Financeiro: Somente no `peso_descarga` registrado no romaneio.
- Faturamento: Baseado no **peso de destino confirmado**.
