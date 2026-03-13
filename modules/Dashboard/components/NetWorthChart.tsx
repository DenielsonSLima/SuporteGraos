
import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

interface NetWorthData {
  name: string;
  netWorth: number;
  recebido: number;
  aReceber: number;
  pago: number;
  aPagar: number;
  monthlyChange: number;
}

interface Props {
  data: NetWorthData[];
  growthPercent: number;
}

const NetWorthChart: React.FC<Props> = React.memo(({ data, growthPercent }) => {
  const CHART_HEIGHT = 300;
  const chartRef = useRef<HTMLDivElement>(null);
  const [midLabels, setMidLabels] = useState<{ x: number; y: number; label: string; positive: boolean }[]>([]);

  // Após o chart renderizar, extrair coordenadas dos dots da Line
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!chartRef.current) return;
      const dots = chartRef.current.querySelectorAll('.recharts-line-dots .recharts-dot');
      if (!dots.length) return;

      const containerRect = chartRef.current.getBoundingClientRect();
      const coords: { x: number; y: number }[] = [];

      dots.forEach((dot) => {
        const cx = parseFloat(dot.getAttribute('cx') || '0');
        const cy = parseFloat(dot.getAttribute('cy') || '0');
        coords.push({ x: cx, y: cy });
      });

      const labels: typeof midLabels = [];
      for (let i = 1; i < coords.length; i++) {
        const change = data[i]?.monthlyChange || 0;

        labels.push({
          x: (coords[i - 1].x + coords[i].x) / 2,
          y: Math.min(coords[i - 1].y, coords[i].y) - 18,
          label: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
          positive: change >= 0,
        });
      }
      setMidLabels(labels);
    }, 300);

    return () => clearTimeout(timer);
  }, [data]);

  // Custom Tooltip com variação mensal
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-xl">
          <p className="font-bold text-slate-700 mb-2">{d.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex gap-4 mb-2 pb-2 border-b border-slate-200">
              <div className="flex-1">
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                  <span className="text-slate-600 text-xs">Recebido:</span>
                  <span className="font-bold text-emerald-800 text-xs">{formatMoney(d.recebido)}</span>
                </p>
                <p className="flex items-center gap-2 mt-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-300"></span>
                  <span className="text-slate-600 text-xs">A Receber:</span>
                  <span className="font-bold text-emerald-600 text-xs">{formatMoney(d.aReceber)}</span>
                </p>
              </div>
              <div className="flex-1">
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-600"></span>
                  <span className="text-slate-600 text-xs">Pago:</span>
                  <span className="font-bold text-rose-800 text-xs">{formatMoney(d.pago)}</span>
                </p>
                <p className="flex items-center gap-2 mt-1">
                  <span className="w-3 h-3 rounded-full bg-rose-300"></span>
                  <span className="text-slate-600 text-xs">A Pagar:</span>
                  <span className="font-bold text-rose-600 text-xs">{formatMoney(d.aPagar)}</span>
                </p>
              </div>
            </div>
            <p className="flex items-center gap-2 pt-1 border-slate-200">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-slate-600">Patrimônio Líquido:</span>
              <span className="font-bold text-purple-700">{formatMoney(d.netWorth)}</span>
            </p>
            {d.monthlyChange !== 0 && (
              <p className={`text-xs font-bold pt-1 ${(d.monthlyChange || 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(d.monthlyChange || 0) > 0 ? '+' : ''}${(d.monthlyChange || 0).toFixed(1)}% vs mês anterior
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const isPositiveGrowth = growthPercent >= 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-purple-500" />
            Evolução Patrimonial (Últimos 6 Meses)
          </h3>
          <p className="text-xs text-slate-500 mt-1">Geração de Patrimônio, Contas a Receber e a Pagar</p>
        </div>

        {/* Badge de Crescimento */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${isPositiveGrowth
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {isPositiveGrowth ? (
            <TrendingUp size={18} />
          ) : (
            <TrendingDown size={18} />
          )}
          <span>
            {isPositiveGrowth ? '+' : ''}{(growthPercent || 0).toFixed(1)}%
          </span>
          <span className="text-xs font-medium opacity-70">no período</span>
        </div>
      </div>

      <div ref={chartRef} style={{ height: CHART_HEIGHT, width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT} minWidth={0}>
          <ComposedChart data={data} margin={{ top: 25, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
              dy={10}
            />

            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
            />

            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ zIndex: 50 }}
            />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />

            {/* Barras: Entrada Empilhada (a) */}
            <Bar yAxisId="left" stackId="a" dataKey="recebido" name="Recebido no Mês" fill="#059669" barSize={20} />
            <Bar yAxisId="left" stackId="a" dataKey="aReceber" name="A Receber (Fim do Mês)" fill="#6ee7b7" radius={[4, 4, 0, 0]} barSize={20} />
            
            {/* Barras: Saída Empilhada (b) */}
            <Bar yAxisId="left" stackId="b" dataKey="pago" name="Pago no Mês" fill="#e11d48" barSize={20} />
            <Bar yAxisId="left" stackId="b" dataKey="aPagar" name="A Pagar (Fim do Mês)" fill="#fda4af" radius={[4, 4, 0, 0]} barSize={20} />

            {/* Linha: Net Worth */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="netWorth"
              name="Patrimônio Líquido"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 5, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Badges de % entre os meses — posicionamento absoluto sobre o SVG */}
        {midLabels.map((ml, i) => (
          <div
            key={`ml-${i}`}
            style={{
              position: 'absolute',
              left: ml.x,
              top: ml.y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${ml.positive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
                }`}
            >
              {ml.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default NetWorthChart;
