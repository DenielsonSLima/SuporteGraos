
import React from 'react';
import { Users } from 'lucide-react';
import { SectionTitle, GoldenRule, FieldTable, SubModule, ExampleBox, WarningBox, InfoBox } from '../HelpSharedComponents';

export const HelpPartners: React.FC = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4">
        <SectionTitle title="Gestão de Parceiros" icon={Users} />
        <p className="text-slate-600 mb-6 leading-relaxed font-medium">
            Centralize todos os stakeholders da sua cadeia: produtores rurais, clientes (indústrias),
            transportadoras e corretores. Um parceiro pode ter múltiplas categorias simultâneas.
        </p>

        <GoldenRule text="Cadastre o parceiro ANTES de criar pedidos. O sistema só permite vincular parceiros já cadastrados nas telas de Compra, Venda e Logística." />

        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Campos do Formulário de Cadastro</h3>
        <FieldTable fields={[
            { campo: 'Tipo Pessoa', tipo: 'PJ / PF', obs: 'Pessoa Jurídica (CNPJ) ou Física (CPF)' },
            { campo: 'Documento', tipo: 'CNPJ ou CPF', obs: 'Validado automaticamente. Opção "Não informado" para estrangeiros' },
            { campo: 'Categorias', tipo: 'Multi-seleção', obs: 'OBRIGATÓRIO ao menos 1: Produtor Rural, Cliente, Transportadora, Corretor, etc.' },
            { campo: 'Razão Social / Nome', tipo: 'Texto', obs: 'Nome oficial do parceiro' },
            { campo: 'Nome Fantasia', tipo: 'Texto', obs: 'Apenas para PJ — nome comercial' },
            { campo: 'Apelido', tipo: 'Texto', obs: 'Nome curto para uso interno (ex: "Seu João da Fazenda")' },
            { campo: 'Telefone', tipo: 'Telefone', obs: 'Contato principal' },
            { campo: 'E-mail', tipo: 'E-mail', obs: 'Para comunicação' },
            { campo: 'Endereço', tipo: 'CEP + Rua + Nº + Bairro + Cidade + UF', obs: 'Preenchimento automático pelo CEP' },
        ]} />

        <SubModule name="Busca Inteligente por CNPJ (ReceitaWS)" desc="Ao cadastrar um PJ, digite o CNPJ e clique em 'Consultar'. O sistema busca na ReceitaWS e preenche automaticamente: Razão Social, Nome Fantasia, Endereço completo, Telefone e E-mail. Isso evita erros de digitação." />

        <ExampleBox title="Exemplo Prático: Cadastrando um Produtor">
            <p>1. Clique em <strong>+ Novo Parceiro</strong></p>
            <p>2. Selecione <strong>Pessoa Física</strong></p>
            <p>3. Digite o CPF: <strong>123.456.789-00</strong></p>
            <p>4. Categoria: marque <strong>Produtor Rural</strong></p>
            <p>5. Nome: <strong>João da Silva</strong></p>
            <p>6. Apelido: <strong>Seu João</strong></p>
            <p>7. Endereço: Fazenda Boa Vista, Rio Verde - GO</p>
            <p>8. Clique <strong>Salvar</strong></p>
            <p className="mt-2 text-blue-700 italic">→ Agora "Seu João" aparecerá como opção ao criar Pedidos de Compra.</p>
        </ExampleBox>

        <SubModule name="Ficha 360° (Dossiê)" desc="No card de cada parceiro, clique no ícone de impressora. Será gerado um PDF com: dados cadastrais, histórico completo de compras, vendas, fretes e saldo financeiro atualizado." />

        <SubModule name="Sub-módulo: Motoristas" desc="Ao acessar o detalhe de uma Transportadora, há a seção de Motoristas. Cadastre nome, CPF, CNH (número e categoria) e vincule a Veículos (placa, modelo, cor). Isso cria 'Conjuntos' usados no lançamento de cargas." />

        <SubModule name="Sub-módulo: Veículos" desc="Cadastre a frota da transportadora: placa, marca, modelo, cor e ano. Vincule motoristas aos veículos para agilizar o preenchimento de cargas na Logística." />

        <WarningBox text="Cada CNPJ/CPF é único no sistema. Se tentar cadastrar um documento que já existe, o sistema bloqueará e mostrará o parceiro existente." />

        <InfoBox text="Um mesmo parceiro pode ser simultaneamente Produtor e Cliente. Basta marcar ambas as categorias. Ele aparecerá nas telas de compra E de venda." />
    </div>
);
