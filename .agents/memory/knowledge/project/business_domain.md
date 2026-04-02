# Domínio de Negócio e Fluxos — Suporte Grãos ERP

## 🚜 CORE BUSINESS
O sistema é um ERP para **Trading e Corretagem de Grãos**. A empresa atua como intermediária: compra do produtor → contrata frete → entrega ao comprador. **Não há estoque próprio**; o lucro vem do spread entre compra e venda, descontando custos logísticos.

---

## 🔄 FLUXO CENTRAL (Lifecycle da Operação)

1. **NEGOCIAÇÃO**:
   - `Pedido de Compra`: Contrato com o produtor (Ex: 5000 SC de Milho).
   - `Pedido de Venda`: Contrato com o comprador (Ex: 5000 SC de Milho).
   - O sistema permite o vínculo 1:1 ou N:N entre contratos.

2. **LOGÍSTICA (O Pulmão do Negócio)**:
   - `Carregamento / Romaneio`: Registro de cada caminhão que sai.
   - **Gatilhos Financeiros**: Ao salvar o carregamento, o sistema gera automaticamente o **Contas a Pagar** (Produtor) e o frete.

3. **CONFERÊNCIA (Gatilho de Receita)**:
   - `Peso Origem`: Peso na saída (balança do produtor).
   - `Peso Destino`: Peso na entrega (balança do comprador).
   - **Gatilho Crítico**: Somente ao preencher o `peso_descarga` é que o **Contas a Receber** do comprador é gerado.

4. **ENCERRAMENTO**:
   - Cálculo de **Quebra/Ganho**: Diferença entre origem e destino.
   - Apuração do **Lucro Líquido** da carga.

---

## 💰 REGRAS FINANCEIRAS CRÍTICAS

- **Adiantamentos**: Muito comuns. Produtores e transportadoras frequentemente pedem adiantamentos antes da descarga. Devem ser sempre vinculados via `parent_id` para abater o saldo final.
- **Base de Cálculo do Frete**: Pode ser por Peso Origem ou Peso Destino (definido no contrato).
- **Faturamento da Venda**: SEMPRE baseado no peso de destino confirmado.

---

## 📖 GLOSSÁRIO TÉCNICO
- **SC (Saca)**: 60kg. Unidade padrão de milho/soja.
- **TON (Tonelada)**: 1000kg. Unidade padrão para frete e grandes volumes.
- **Quebra**: Quando o peso destino < origem. Se exceder a tolerância (ex: 0.25%), o excesso é descontado do frete.
- **Adiantamento (Ades)**: Pagamento prévio.
- **Baixa / Quitação**: Liquidação total de um débito financeiro.
