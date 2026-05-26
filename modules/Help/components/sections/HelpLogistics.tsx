import React from 'react';
import { Truck, Scale, Package, Play, Edit, Trash2, Link } from 'lucide-react';
import { SectionTitle, GoldenRule, FieldTable, StatusFlow, StepBox, ExampleBox, SubModule, WarningBox, InfoBox } from '../HelpSharedComponents';

export const HelpLogistics: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
        <SectionTitle title="Logística, Cargas & Fretes" icon={Truck} />
        
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Este é o **coração operacional** do sistema. Cada carga conecta um Pedido de Compra
            (origem/fazenda) a um Pedido de Venda (destino/indústria), controlando pesagens, quebras de transporte e tarifas de frete.
        </p>

        <GoldenRule text="A diferença entre o peso de origem e o peso de destino é a QUEBRA física. O financeiro do grão é gerado com base no Peso de Origem, e o frete e faturamento com base no Peso de Destino." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 relative overflow-hidden">
                <Scale size={32} className="absolute -right-2 -bottom-2 text-blue-200" />
                <h4 className="font-black text-blue-800 text-xs uppercase mb-2">Peso de Origem (Fazenda)</h4>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">Peso aferido no carregamento do produtor. Serve de base para calcular as sacas líquidas a pagar ao produtor rural.</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 relative overflow-hidden">
                <Package size={32} className="absolute -right-2 -bottom-2 text-emerald-200" />
                <h4 className="font-black text-emerald-800 text-xs uppercase mb-2">Peso de Destino (Indústria)</h4>
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">Peso aferido na entrega do cliente. Serve de base para calcular o faturamento da venda e o valor final do frete.</p>
            </div>
        </div>

        {/* COMO LANÇAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Play size={16} className="text-emerald-600" />
                Como Lançar um Carregamento
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>1. Vá em <strong>Logística</strong> e clique em <strong>+ Nova Carga</strong>.</p>
                <p>2. Selecione o <strong>Pedido de Venda (Destino)</strong>. O sistema listará os Pedidos de Compra (Origem) que possuem o mesmo produto para você vincular.</p>
                <p>3. Informe a <strong>Transportadora</strong>, a <strong>Placa</strong> e o <strong>Motorista</strong> (caso seja Frete FOB/Cliente retira, marque a caixinha correspondente e o motorista ficará opcional).</p>
                <p>4. Insira a <strong>Data de Carregamento</strong>, o <strong>Peso de Origem (KG)</strong> e o valor negociado do frete (**R$/TON**).</p>
                <p>5. Clique em **Salvar**. A carga entrará em trânsito e o saldo físico de saca será descontado do pedido de compra.</p>
            </div>
        </div>

        {/* COMO EDITAR / FINALIZAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Edit size={16} className="text-amber-600" />
                Como Editar, Descarregar e Finalizar
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>• <strong>Descarregar (Dar Entrada no Destino):</strong> Na lista de cargas em trânsito, clique no botão do caminhão para **Registrar Pesagem de Destino**. Digite o peso de chegada (indústria) e confirme. O sistema calcula a quebra física e gera as faturas financeiras de compra, venda e frete automaticamente.</p>
                <p>• <strong>Correção Estrutural (Editar Dados):</strong> Se digitou a data errada, motorista errado ou peso incorreto, abra o caminhão e clique em **Edição Estrutural**. Altere os valores desejados e salve. O banco de dados atualizará as pesagens e recalculará os valores monetários das contas a pagar e receber vinculadas instantaneamente.</p>
            </div>
        </div>

        {/* COMO APAGAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Trash2 size={16} className="text-rose-600" />
                Como Apagar e Estornar
            </h4>
            <div className="text-xs text-slate-600 space-y-2 font-medium">
                <p>• Para excluir uma carga lançada incorretamente ou cancelada pelo cliente, clique no caminhão correspondente e selecione o botão de **Excluir** (ícone de lixeira).</p>
                <p className="text-rose-700 italic font-black">
                    ⚠ IMPACTO: A exclusão de uma carga desfaz todos os vínculos. Ela devolve o volume de sacas para o saldo disponível dos Pedidos de Compra e Venda originais, e apaga de forma permanente as contas a pagar (grão e frete) e receber geradas por ela no financeiro.
                </p>
            </div>
        </div>

        {/* INTERLIGAÇÃO */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Link size={16} className="text-indigo-600" />
                Interligação e Impactos Financeiros
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                A Logística serve como gatilho do Financeiro. Quando você insere o peso de destino e conclui o descarregamento, o sistema gera:
            </p>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 mt-2 font-medium">
                <li><strong>Conta a Pagar (Grão)</strong> para o Produtor Rural (baseado no peso de origem e preço de compra).</li>
                <li><strong>Conta a Pagar (Frete)</strong> para a Transportadora (baseado no peso de destino e preço por tonelada).</li>
                <li><strong>Conta a Receber (Venda)</strong> para a Indústria (baseado no peso de destino e preço de venda).</li>
            </ul>
        </div>

        <ExampleBox title="Exemplo: Cálculo de Quebra no Transporte">
            <p>• <strong>Peso Origem:</strong> 40.000 KG (666.67 SC)</p>
            <p>• <strong>Peso Destino:</strong> 39.800 KG (663.33 SC)</p>
            <p>• <strong>Quebra Tolerada (0.25%):</strong> 100 KG</p>
            <p>• <strong>Excesso de Quebra (Real - Tolerado):</strong> 100 KG descontados do frete do motorista.</p>
        </ExampleBox>

        <WarningBox text="Cargas finalizadas que já possuem baixas parciais ou totais de pagamento no caixa não podem ser editadas estruturalmente até que as baixas financeiras sejam estornadas, garantindo a consistência contábil do caixa." />
    </div>
);
