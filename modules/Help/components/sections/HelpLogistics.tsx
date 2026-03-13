
import React from 'react';
import { Truck, Scale, Package } from 'lucide-react';
import { SectionTitle, GoldenRule, FieldTable, StatusFlow, StepBox, ExampleBox, SubModule, WarningBox } from '../HelpSharedComponents';

export const HelpLogistics: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Logística, Cargas & Fretes" icon={Truck} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Este é o <strong>coração operacional</strong> do sistema. Cada carga conecta um Pedido de Compra
            (origem/fazenda) a um Pedido de Venda (destino/indústria), com pesagem, frete e motorista.
        </p>

        <GoldenRule text="A diferença entre peso de origem e peso de destino é a QUEBRA de transporte. Quebras acima de 0,25% exigem auditoria interna." />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 relative overflow-hidden">
                <Scale size={32} className="absolute -right-2 -bottom-2 text-blue-200" />
                <h4 className="font-black text-blue-800 text-xs uppercase mb-2">Peso de Origem</h4>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">Balança da fazenda. Referência para PAGAR o Produtor.</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 relative overflow-hidden">
                <Package size={32} className="absolute -right-2 -bottom-2 text-emerald-200" />
                <h4 className="font-black text-emerald-800 text-xs uppercase mb-2">Peso de Destino</h4>
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">Balança da indústria. Referência para COBRAR o Cliente.</p>
            </div>
        </div>

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário de Carga</h3>
        <FieldTable fields={[
            { campo: 'Pedido de Venda (destino)', tipo: 'Busca', obs: 'Selecione o PV ativo para onde a carga vai' },
            { campo: 'Transportadora', tipo: 'Seleção', obs: 'Parceiro categoria TRANSPORTADORA' },
            { campo: 'Motorista', tipo: 'Seleção', obs: 'Motorista cadastrado na transportadora' },
            { campo: 'Placa', tipo: 'Texto', obs: 'Placa do veículo' },
            { campo: 'Peso Origem (KG)', tipo: 'Número', obs: 'Peso bruto da balança de origem' },
            { campo: 'Preço Frete (R$/TON)', tipo: 'Moeda', obs: 'Valor por tonelada a pagar ao transportador' },
        ]} />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Ciclo de Status da Carga</h3>
        <StatusFlow statuses={['Em Trânsito', 'Descarregando', 'Concluída']} />

        <StepBox
            title="Fluxo Completo de uma Carga"
            steps={[
                "Na tela de Logística, clique em '+ Nova Carga'.",
                "Selecione o Pedido de Venda de destino.",
                "Informe a transportadora, motorista e placa do veículo.",
                "Preencha o peso de origem e o preço de compra R$/SC.",
                "Preencha o preço do frete R$/TON.",
                "Salve. A carga entra em status 'Em Trânsito'.",
                "Quando o caminhão chegar na indústria, insira o Peso de Destino. A carga é 'Concluída'."
            ]}
        />

        <ExampleBox title="Exemplo: Carga de 30 TON de Milho">
            <p>• <strong>Peso Origem:</strong> 30.000 KG</p>
            <p>• <strong>Frete:</strong> R$ 120,00/TON --- Total: R$ 3.600,00</p>
            <p>• <strong>Peso Destino (indústria):</strong> 29.850 KG</p>
            <p>• <strong>Quebra:</strong> 150 KG (0,5%)</p>
        </ExampleBox>

        <SubModule name="Redirecionamento de Carga" desc="Se o destino muda após o carregamento, é possível redirecionar a carga para outro Pedido de Venda." />
        <WarningBox text="Ao excluir uma carga, todas as transações financeiras vinculadas são estornadas automaticamente." />
    </div>
);
