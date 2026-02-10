
import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { OrderItem } from '../../types';
import { classificationService } from '../../../../services/classificationService';

interface Props {
  items: OrderItem[];
  onChange: (items: OrderItem[], totalValue: number) => void;
}

const OrderItemsSection: React.FC<Props> = ({ items, onChange }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [newItem, setNewItem] = useState<Partial<OrderItem>>({ productName: '', quantity: 0, unit: 'SC', unitPrice: 0 });
  const [displayPrice, setDisplayPrice] = useState('');

  useEffect(() => {
    // Carregar produtos do sistema
    const allProducts = classificationService.getProductTypes();
    setProducts(allProducts);
    if (allProducts.length > 0) {
      setNewItem({ ...newItem, productName: allProducts[0].name });
    }
  }, []);

  const formatBRL = (val: number) => {
    const normalized = Math.abs(val) < 0.01 ? 0 : val;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(normalized);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = Number(raw) / 100;
    setNewItem({ ...newItem, unitPrice: num });
    setDisplayPrice(formatBRL(num));
  };

  const handleAddItem = () => {
    if (!newItem.productName) return;
    const qty = Number(newItem.quantity) || 0;
    const price = Number(newItem.unitPrice) || 0;
    const item: OrderItem = {
      id: Math.random().toString(36).substr(2, 9),
      productName: newItem.productName!,
      quantity: qty,
      unit: newItem.unit || 'SC',
      unitPrice: price,
      total: qty * price
    };
    const updated = [...items, item];
    onChange(updated, updated.reduce((acc, i) => acc + i.total, 0));
    if (products.length > 0) {
      setNewItem({ productName: products[0].name, quantity: 0, unit: 'SC', unitPrice: 0 });
    } else {
      setNewItem({ productName: '', quantity: 0, unit: 'SC', unitPrice: 0 });
    }
    setDisplayPrice('');
  };

  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest ml-1';
  const inputClass = 'w-full border-2 border-slate-200 rounded-xl bg-white text-slate-900 font-bold px-3 py-2 focus:border-blue-600 outline-none transition-all text-sm';

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
      <h3 className="mb-6 flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-tighter">
        <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
        Itens do Pedido
      </h3>

      <div className="flex flex-col lg:flex-row gap-4 mb-8 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
        <div className="flex-1">
          <label className={labelClass}>Produto</label>
          <select className={inputClass} value={newItem.productName} onChange={e => setNewItem({...newItem, productName: e.target.value})}>
            <option value="">Selecione um produto</option>
            {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        <div className="w-full lg:w-32">
          <label className={labelClass}>Qtd.</label>
          <input type="number" className={inputClass} value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: parseFloat(e.target.value)})} />
        </div>

        <div className="w-full lg:w-44">
          <label className={labelClass}>V. Unitário (R$)</label>
          <input type="text" className={`${inputClass} text-emerald-700 font-black`} value={displayPrice} onChange={handlePriceChange} placeholder="R$ 0,00" />
        </div>

        <div className="flex items-end">
          <button type="button" onClick={handleAddItem} className="h-11 w-full lg:w-14 flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-95">
            <Plus size={24} />
          </button>
        </div>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
            <th className="px-6 py-3">Produto</th>
            <th className="px-6 py-3 text-center">Volume</th>
            <th className="px-6 py-3 text-right">Preço</th>
            <th className="px-6 py-3 text-right">Subtotal</th>
            <th className="px-6 py-3 text-center w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 font-bold text-slate-700 uppercase">
          {items.map(item => (
            <tr key={item.id} className="hover:bg-slate-50/50">
              <td className="px-6 py-4 text-slate-900 font-black">{item.productName}</td>
              <td className="px-6 py-4 text-center">{item.quantity.toLocaleString()} {item.unit}</td>
              <td className="px-6 py-4 text-right">{formatBRL(item.unitPrice)}</td>
              <td className="px-6 py-4 text-right font-black text-slate-900">{formatBRL(item.total)}</td>
              <td className="px-6 py-4 text-center">
                <button onClick={() => onChange(items.filter(i => i.id !== item.id), items.filter(i => i.id !== item.id).reduce((acc, x) => acc + x.total, 0))} className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg"><Trash2 size={16}/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderItemsSection;
