
import { FunctionDeclaration, Type } from '@google/genai';
import { financialActionService } from '../../../services/financialActionService';
import { financialService } from '../../../services/financialService';
import { partnerService } from '../../../services/partnerService';
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { financialIntegrationService } from '../../../services/financialIntegrationService';
import { loadingService } from '../../../services/loadingService';
import { aiMemoryService } from './aiMemoryService';
import { aiContextCache } from './aiContextCache';

export const aiTools: FunctionDeclaration[] = [
  {
    name: 'save_learned_rule',
    description: 'Salvar uma preferência ou correção do usuário na memória.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        rule: { type: Type.STRING, description: 'A regra. Ex: "Classifique Uber como Transporte".' }
      },
      required: ['rule']
    }
  },
  {
    name: 'delete_record',
    description: 'Excluir um registro (Parceiro ou Financeiro).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ['partner', 'financial'] },
        search_term: { type: Type.STRING }
      },
      required: ['type', 'search_term']
    }
  },
  {
    name: 'update_record',
    description: 'Editar um campo de um registro.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: { type: Type.STRING, enum: ['partner', 'financial'] },
        search_term: { type: Type.STRING },
        field: { type: Type.STRING },
        new_value: { type: Type.STRING }
      },
      required: ['type', 'search_term', 'field', 'new_value']
    }
  },
  {
    name: 'create_expense',
    description: 'Lançar despesa ou conta a pagar.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        category: { type: Type.STRING },
        account_name: { type: Type.STRING }
      },
      required: ['description', 'amount', 'account_name']
    }
  },
  {
    name: 'get_balance',
    description: 'Consultar saldo atual de caixa.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'settle_financial_record',
    description: 'Baixar (pagar/receber) título existente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        search_term: { type: Type.STRING },
        amount: { type: Type.NUMBER },
        account_name: { type: Type.STRING }
      },
      required: ['search_term']
    }
  },
  {
    name: 'create_partner',
    description: 'Cadastrar novo parceiro.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['PJ', 'PF'] },
            document: { type: Type.STRING },
            city: { type: Type.STRING },
            state: { type: Type.STRING }
        },
        required: ['name', 'type', 'document']
    }
  },
  {
    name: 'create_order',
    description: 'Criar pedido de compra ou venda.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: ['compra', 'venda'] },
            partner_name: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
            price: { type: Type.NUMBER }
        },
        required: ['type', 'partner_name', 'quantity', 'price']
    }
  },
  {
    name: 'search_history',
    description: 'Buscar histórico detalhado de operações, carregamentos e pendências financeiras.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            category: { 
              type: Type.STRING, 
              enum: ['purchases', 'sales', 'loadings', 'payables', 'receivables', 'all'],
              description: 'Categoria de dados para buscar'
            },
            limit: { 
              type: Type.NUMBER,
              description: 'Número máximo de registros (padrão: 20)'
            }
        },
        required: ['category']
    }
  }
];

export const executeToolAction = (toolName: string, args: any, userName: string) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    switch (toolName) {
      case 'save_learned_rule':
        // 🔴 VALIDAÇÕES
        if (!args.rule?.trim()) {
          return { success: false, message: "❌ Regra não pode ser vazia." };
        }
        
        if (args.rule.length > 200) {
          return { success: false, message: "❌ Regra muito longa (máximo 200 caracteres)." };
        }
        
        aiMemoryService.addMemory(args.rule.trim());
        return { success: true, message: `✅ Regra memorizada: "${args.rule.trim()}".` };

      case 'delete_record':
        if (args.type === 'partner') {
            const p = partnerService.getAll().find(i => i.name.toLowerCase().includes(args.search_term.toLowerCase()));
            if (!p) return { success: false, message: "❌ Parceiro não encontrado." };
            
            // 🔴 Pedir confirmação se ainda não foi confirmado
            if (!args.confirmed) {
              return { success: false, message: `⚠️ Você tem certeza que quer DELETAR o parceiro "${p.name}"? Responda "SIM" para confirmar.` };
            }
            
            partnerService.delete(p.id);
            aiContextCache.invalidateAll();
            return { success: true, message: `✅ Parceiro "${p.name}" foi excluído.` };
        } 
        else if (args.type === 'financial') {
            const rec = financialActionService.getStandaloneRecords().find(r => r.description.toLowerCase().includes(args.search_term.toLowerCase()));
            if (!rec) return { success: false, message: "❌ Lançamento não encontrado." };
            
            // 🔴 Pedir confirmação se ainda não foi confirmado
            if (!args.confirmed) {
              return { success: false, message: `⚠️ Você tem certeza que quer DELETAR o lançamento "${rec.description}" de R$ ${rec.originalValue.toLocaleString('pt-BR')}? Responda "SIM" para confirmar.` };
            }
            
            financialActionService.deleteStandaloneRecord(rec.id);
            aiContextCache.invalidateAll();
            return { success: true, message: `✅ Lançamento "${rec.description}" foi excluído.` };
        }
        return { success: false, message: "❌ Tipo inválido. Use 'partner' ou 'financial'." };

      case 'update_record':
        // 🔴 VALIDAÇÕES
        if (!args.type) {
          return { success: false, message: "❌ Tipo é obrigatório (partner ou financial)." };
        }
        
        if (!args.search_term?.trim()) {
          return { success: false, message: "❌ Termo de busca é obrigatório." };
        }
        
        if (!args.field?.trim()) {
          return { success: false, message: "❌ Campo a editar é obrigatório." };
        }
        
        if (!args.new_value?.trim()) {
          return { success: false, message: "❌ Novo valor é obrigatório." };
        }
        
        if (args.type === 'partner') {
            const p = partnerService.getAll().find(i => i.name.toLowerCase().includes(args.search_term.toLowerCase()));
            if (!p) return { success: false, message: `❌ Parceiro não encontrado com termo "${args.search_term}".` };
            
            const fieldMap: any = { 'telefone': 'phone', 'email': 'email', 'nome': 'name', 'documento': 'document' };
            const field = fieldMap[args.field.toLowerCase()] || args.field;
            
            try {
              partnerService.update({ ...p, [field]: args.new_value.trim() });
              aiContextCache.invalidateAll();
              return { success: true, message: `✅ Parceiro "${p.name}" teve ${args.field} atualizado para "${args.new_value.trim()}".` };
            } catch (e: any) {
              return { success: false, message: `❌ Erro ao atualizar: ${e.message}` };
            }
        }
        return { success: false, message: "❌ Edição via IA suportada apenas para parceiros." };

      case 'create_expense':
        // 🔴 VALIDAÇÕES
        if (!args.description?.trim()) {
          return { success: false, message: "❌ Descrição da despesa é obrigatória." };
        }
        
        const expenseAmount = parseFloat(args.amount);
        if (isNaN(expenseAmount) || expenseAmount <= 0) {
          return { success: false, message: `❌ Valor deve ser um número positivo. Recebido: "${args.amount}"` };
        }
        
        // Buscar conta bancária
        const bank = financialService.getBankAccounts().find(b => 
            b.bankName.toLowerCase().includes((args.account_name || '').toLowerCase())
        );
        
        if (!bank && args.account_name) {
          return { success: false, message: `❌ Conta bancária "${args.account_name}" não encontrada. Contas disponíveis: ${financialService.getBankAccounts().map(b => b.bankName).join(', ')}` };
        }
        
        // ✅ Criar despesa com validações
        financialActionService.addAdminExpense({
            id: Math.random().toString(36).substr(2, 9),
            description: args.description.trim(),
            entityName: 'Lançamento IA',
            category: args.category || 'Outros',
            originalValue: expenseAmount,
            paidValue: expenseAmount,
            status: 'paid',
            dueDate: today,
            issueDate: today,
            subType: 'admin',
            bankAccount: bank ? bank.bankName : 'Caixa'
        });
        
        // 🟢 Invalidar cache para refletir nova despesa
        aiContextCache.invalidateAll();
        
        return { success: true, message: `✅ Despesa de R$ ${expenseAmount.toLocaleString('pt-BR')} lançada em ${bank?.bankName || 'Caixa'}.` };

      case 'get_balance':
        try {
          const accounts = financialService.getBankAccountsWithBalances();
          
          if (!accounts || accounts.length === 0) {
            return { success: false, message: "❌ Nenhuma conta bancária configurada." };
          }
          
          const total = accounts.reduce((acc, a) => acc + a.currentBalance, 0);
          const accountDetails = accounts.map(a => `• ${a.bankName}: R$ ${a.currentBalance.toLocaleString('pt-BR')}`).join('\n');
          
          return { 
              success: true, 
              message: `✅ Saldo Total: R$ ${total.toLocaleString('pt-BR')}\n\nDetalhes por Banco:\n${accountDetails}`
          };
        } catch (e: any) {
          return { success: false, message: `❌ Erro ao consultar saldo: ${e.message}` };
        }

      case 'create_partner':
        // 🔴 VALIDAÇÕES
        if (!args.name?.trim()) {
          return { success: false, message: "❌ Nome do parceiro é obrigatório." };
        }
        
        if (!args.document?.trim()) {
          return { success: false, message: "❌ Documento (CPF/CNPJ) é obrigatório." };
        }
        
        if (args.type !== 'PJ' && args.type !== 'PF') {
          return { success: false, message: "❌ Tipo deve ser 'PJ' (Empresa) ou 'PF' (Pessoa Física)." };
        }
        
        // Validar duplicata
        const existingPartner = partnerService.getAll().find(p => 
          p.document === args.document.trim()
        );
        
        if (existingPartner) {
          return { success: false, message: `❌ Parceiro com documento "${args.document}" já existe: "${existingPartner.name}".` };
        }
        
        // ✅ Criar parceiro com validações
        partnerService.add({
            id: Math.random().toString(36).substr(2, 9),
            name: args.name.trim(),
            document: args.document.trim(),
            type: args.type,
            categories: ['1'],
            createdAt: new Date().toISOString(),
            address: { city: args.city || '', state: args.state || '', street: '', number: '', neighborhood: '', zip: '' }
        });
        
        aiContextCache.invalidateAll();
        return { success: true, message: `✅ Parceiro "${args.name.trim()}" (${args.type}) foi cadastrado.` };

      case 'create_order':
        // 🔴 VALIDAÇÕES
        if (!args.partner_name?.trim()) {
          return { success: false, message: "❌ Nome do parceiro é obrigatório." };
        }
        
        if (args.type !== 'compra' && args.type !== 'venda') {
          return { success: false, message: "❌ Tipo deve ser 'compra' ou 'venda'." };
        }
        
        const orderQuantity = parseFloat(args.quantity);
        if (isNaN(orderQuantity) || orderQuantity <= 0) {
          return { success: false, message: `❌ Quantidade deve ser um número positivo. Recebido: "${args.quantity}"` };
        }
        
        const orderPrice = parseFloat(args.price);
        if (isNaN(orderPrice) || orderPrice <= 0) {
          return { success: false, message: `❌ Preço deve ser um número positivo. Recebido: "${args.price}"` };
        }
        
        // ✅ Criar pedido com validações
        const isBuy = args.type === 'compra';
        const orderData = {
            id: Math.random().toString(36).substr(2, 9),
            number: `${isBuy?'PC':'PV'}-IA-${Math.floor(Math.random()*999)}`,
            date: today,
            status: 'approved',
            consultantName: userName,
            totalValue: orderQuantity * orderPrice,
            paidValue: 0
        };
        
        try {
          if (isBuy) {
              purchaseService.add({ ...orderData, partnerName: args.partner_name.trim(), partnerId: 'temp', partnerDocument: '000', partnerCity: '', partnerState: '', items: [], transactions: [], useRegisteredLocation: true, loadingCity: '', loadingState: '', harvest: 'Atual', hasBroker: false } as any);
          } else {
              salesService.add({ ...orderData, customerName: args.partner_name.trim(), customerId: 'temp', customerDocument: '000', customerCity: '', customerState: '', productName: 'Grãos', quantity: orderQuantity, unitPrice: orderPrice, transactions: [], loadings: [] } as any);
          }
          
          aiContextCache.invalidateAll();
          const totalValue = orderQuantity * orderPrice;
          return { success: true, message: `✅ Pedido de ${args.type} criado. Quantidade: ${orderQuantity} | Total: R$ ${totalValue.toLocaleString('pt-BR')}` };
        } catch (e: any) {
          return { success: false, message: `❌ Erro ao criar pedido: ${e.message}` };
        }

      case 'settle_financial_record':
        // 🔴 VALIDAÇÕES
        if (!args.search_term?.trim()) {
          return { success: false, message: "❌ Descrição do título é obrigatória." };
        }
        
        const payables = financialIntegrationService.getPayables();
        const target = payables.find(p => p.description.toLowerCase().includes(args.search_term.toLowerCase()) || p.entityName.toLowerCase().includes(args.search_term.toLowerCase()));
        
        if (!target) {
          return { success: false, message: `❌ Título não encontrado com termo "${args.search_term}".` };
        }
        
        // Validar amount se fornecido
        let settleAmount = args.amount;
        if (args.amount) {
          const parsedAmount = parseFloat(args.amount);
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return { success: false, message: `❌ Valor deve ser um número positivo. Recebido: "${args.amount}"` };
          }
          
          const remainingValue = target.originalValue - target.paidValue;
          if (parsedAmount > remainingValue) {
            return { success: false, message: `❌ Valor R$ ${parsedAmount.toLocaleString('pt-BR')} é maior que o saldo devido R$ ${remainingValue.toLocaleString('pt-BR')}.` };
          }
          
          settleAmount = parsedAmount;
        } else {
          settleAmount = target.originalValue - target.paidValue;
        }
        
        // ✅ Processar baixa com validações
        try {
          financialActionService.processRecord(target.id, {
              date: today,
              amount: settleAmount,
              discount: 0,
              accountId: 'virtual',
              accountName: args.account_name || 'Caixa',
              notes: 'Baixa via IA'
          }, target.subType);
          
          aiContextCache.invalidateAll();
          return { success: true, message: `✅ Baixa de R$ ${settleAmount.toLocaleString('pt-BR')} aplicada em "${target.description}".` };
        } catch (e: any) {
          return { success: false, message: `❌ Erro ao processar baixa: ${e.message}` };
        }

      case 'search_history':
        try {
          const limit = args.limit || 20;
          const formatMoney = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
          const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('pt-BR');
          
          let results: string[] = [];
          
          switch (args.category) {
            case 'purchases':
              const purchases = purchaseService.getAll()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, limit);
              
              results = purchases.map(p => 
                `📦 COMPRA #${p.orderNumber || p.id.slice(0,8)} - ${p.partnerName} | ${formatDate(p.date)} | ${p.quantity}kg × ${formatMoney(p.price)}/kg = ${formatMoney((p.quantity || 0) * (p.price || 0))} | Status: ${p.status}`
              );
              break;
              
            case 'sales':
              const sales = salesService.getAll()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, limit);
              
              results = sales.map(s => 
                `💰 VENDA #${s.orderNumber || s.id.slice(0,8)} - ${s.partnerName} | ${formatDate(s.date)} | ${s.quantity}kg × ${formatMoney(s.price)}/kg = ${formatMoney((s.quantity || 0) * (s.price || 0))} | Status: ${s.status}`
              );
              break;
              
            case 'loadings':
              const loadings = loadingService.getAll()
                .filter(l => l.status !== 'canceled')
                .sort((a, b) => new Date(b.unloadDate || b.loadDate).getTime() - new Date(a.unloadDate || a.loadDate).getTime())
                .slice(0, limit);
              
              results = loadings.map(l => 
                `🚛 CARREGAMENTO - ${l.driver || 'Sem motorista'} | Placa: ${l.vehiclePlate || 'N/A'} | ${formatDate(l.unloadDate || l.loadDate)} | Peso Bruto: ${l.grossWeightKg || 0}kg | Peso Líquido: ${l.netWeightKg || 0}kg | Quebra: ${l.breakageKg || 0}kg (${l.breakagePercent || 0}%)`
              );
              break;
              
            case 'payables':
              const payables = financialIntegrationService.getPayables()
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, limit);
              
              results = payables.map(p => {
                const remaining = p.originalValue - p.paidValue;
                return `📤 A PAGAR - ${p.entityName} | "${p.description}" | Vence: ${formatDate(p.dueDate)} | Original: ${formatMoney(p.originalValue)} | Pago: ${formatMoney(p.paidValue)} | Restante: ${formatMoney(remaining)} | Status: ${p.status}`;
              });
              break;
              
            case 'receivables':
              const receivables = financialIntegrationService.getReceivables()
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, limit);
              
              results = receivables.map(r => {
                const remaining = r.originalValue - r.paidValue;
                return `📥 A RECEBER - ${r.entityName} | "${r.description}" | Vence: ${formatDate(r.dueDate)} | Original: ${formatMoney(r.originalValue)} | Recebido: ${formatMoney(r.paidValue)} | Restante: ${formatMoney(remaining)} | Status: ${r.status}`;
              });
              break;
              
            case 'all':
              const allPurchases = purchaseService.getAll().length;
              const allSales = salesService.getAll().length;
              const allLoadings = loadingService.getAll().filter(l => l.status !== 'canceled').length;
              const allPayables = financialIntegrationService.getPayables().filter(p => p.status !== 'paid').length;
              const allReceivables = financialIntegrationService.getReceivables().filter(r => r.status !== 'paid').length;
              
              results = [
                `📊 RESUMO GERAL DO SISTEMA:`,
                `• Total de Compras: ${allPurchases}`,
                `• Total de Vendas: ${allSales}`,
                `• Total de Carregamentos: ${allLoadings}`,
                `• Contas a Pagar Pendentes: ${allPayables}`,
                `• Contas a Receber Pendentes: ${allReceivables}`
              ];
              break;
              
            default:
              return { success: false, message: `❌ Categoria inválida: "${args.category}". Use: purchases, sales, loadings, payables, receivables ou all.` };
          }
          
          if (results.length === 0) {
            return { success: true, message: `ℹ️ Nenhum registro encontrado na categoria "${args.category}".` };
          }
          
          return { 
            success: true, 
            message: `✅ Histórico (${results.length} registros):\n\n${results.join('\n\n')}`
          };
          
        } catch (e: any) {
          return { success: false, message: `❌ Erro ao buscar histórico: ${e.message}` };
        }

      default:
        return { success: false, message: "Comando desconhecido." };
    }
  } catch (e: any) {
    console.error("AI Tool Error", e);
    return { success: false, message: `Erro na execução: ${e.message}` };
  }
};
