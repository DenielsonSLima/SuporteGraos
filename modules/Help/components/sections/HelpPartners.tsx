import React from 'react';
import { Users, Play, Edit, Trash2, Link } from 'lucide-react';
import { SectionTitle, GoldenRule, FieldTable, SubModule, ExampleBox, WarningBox, InfoBox } from '../HelpSharedComponents';

export const HelpPartners: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
        <SectionTitle title="Gestão de Parceiros" icon={Users} />
        
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Centralize todos os stakeholders da sua cadeia comercial: produtores rurais, clientes (indústrias/compradores),
            transportadoras e corretores de grãos. O sistema permite que um mesmo parceiro pertença a múltiplas categorias.
        </p>

        <GoldenRule text="Cadastre o parceiro ANTES de operar outros módulos. O sistema exige a vinculação de parceiros pré-cadastrados para garantir a consistência das faturas e contratos." />

        {/* COMO LANÇAR / CADASTRAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Play size={16} className="text-emerald-600" />
                Como Cadastrar um Parceiro
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>1. Acesse o menu <strong>Parceiros</strong> no painel lateral.</p>
                <p>2. Clique no botão <strong>+ Novo Parceiro</strong> no canto superior direito.</p>
                <p>3. Selecione o tipo de pessoa (**Jurídica** ou **Física**).</p>
                <p>4. Insira o documento (CNPJ ou CPF). Caso seja Jurídica, você pode digitar o CNPJ e clicar em **Consultar** para preencher os dados automaticamente via ReceitaWS.</p>
                <p>5. Marque as **Categorias** do parceiro (ex: Produtor Rural, Cliente, Transportadora). *Atenção: É obrigatório selecionar pelo menos uma.*</p>
                <p>6. Preencha o Nome/Razão Social, Apelido, Telefone e Endereço, e clique em **Salvar**.</p>
            </div>
        </div>

        {/* COMO EDITAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Edit size={16} className="text-amber-600" />
                Como Editar Dados do Parceiro
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>1. Localize o parceiro na listagem (use a busca por nome ou filtros de categoria).</p>
                <p>2. Clique no botão de **Lápis (Editar)** no card do parceiro.</p>
                <p>3. Altere as informações de cadastro, categorias ou dados de contato/endereço e clique em **Salvar**.</p>
                <p className="text-amber-700 italic">
                    💡 Dica: Você pode ativar ou inativar o parceiro diretamente pelo botão tipo interruptor (switch) no card, suspendendo novos lançamentos sem perder o histórico do parceiro.
                </p>
            </div>
        </div>

        {/* COMO APAGAR */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Trash2 size={16} className="text-rose-600" />
                Como Apagar Parceiros (Regra de Exclusão Segura)
            </h4>
            <div className="text-xs text-slate-600 space-y-3 font-medium">
                <p>• Para remover um parceiro, localize-o na listagem e clique no botão de **Lixeira (Excluir)**.</p>
                <p className="text-rose-700 font-bold">
                    ⚠ REGRA DE INTEGRIDADE: O sistema bloqueia a exclusão física de parceiros que já possuem qualquer vínculo com Pedidos de Compra, Pedidos de Venda ou Cargas na Logística. Isso evita a quebra de dados históricos e relatórios DRE. Nesses casos, a alternativa correta é apenas **Inativar** o parceiro.
                </p>
            </div>
        </div>

        {/* INTERLIGAÇÃO */}
        <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
            <h4 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2">
                <Link size={16} className="text-indigo-600" />
                Interligação e Impactos no Sistema
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                A categoria selecionada determina onde o parceiro aparecerá nas outras telas:
            </p>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-1 mt-2 font-medium">
                <li><strong>Produtor Rural:</strong> Habilita o parceiro para ser selecionado como vendedor em **Pedidos de Compra**.</li>
                <li><strong>Cliente / Indústria:</strong> Habilita o parceiro como comprador em **Pedidos de Venda**.</li>
                <li><strong>Transportadora:</strong> Habilita o parceiro na seleção de transporte na **Logística** e libera a tela de detalhes de transportadora (para cadastrar **Motoristas** e **Veículos** da frota).</li>
                <li><strong>Corretor:</strong> Habilita a vinculação de taxas de corretagem em contratos comerciais.</li>
            </ul>
        </div>

        <FieldTable fields={[
            { campo: 'Tipo Pessoa', tipo: 'PJ / PF', obs: 'Pessoa Jurídica (CNPJ) ou Física (CPF)' },
            { campo: 'Documento', tipo: 'CNPJ ou CPF', obs: 'Validado automaticamente. Opção "Não informado" para parceiros sem documento local' },
            { campo: 'Categorias', tipo: 'Multi-seleção', obs: 'Produtor Rural, Cliente, Transportadora, Corretor (pode marcar mais de uma)' },
            { campo: 'Nome / Razão Social', tipo: 'Texto', obs: 'Razão social oficial (CNPJ) ou Nome Civil (CPF)' },
            { campo: 'Apelido', tipo: 'Texto', obs: 'Nome curto amigável exibido nas tabelas rápidas do sistema' },
        ]} />

        <InfoBox text="Ao inativar um parceiro, ele deixa de aparecer nos seletores de novos contratos e novas cargas, mas todas as faturas e relatórios antigos dele permanecem preservados no Caixa e no DRE." />
    </div>
);
