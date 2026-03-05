/**
 * SkeletonCards.tsx
 *
 * Esqueleto animado para grids de cards (ex.: Tipos de Produto, Tipos de Parceiro, Sócios).
 * Substitui o spinner centralizado, mantendo o layout da tela preenchida enquanto carrega.
 *
 * Uso:
 *   import { SkeletonCards } from '../../../components/ui/SkeletonCards';
 *   {isLoading && <SkeletonCards count={6} />}
 */

import React from 'react';

interface Props {
  /** Quantidade de cards fantasma a exibir (default 6) */
  count?: number;
  /** Colunas do grid — deve bater com o grid real da tela */
  cols?: 2 | 3 | 4;
}

export const SkeletonCards: React.FC<Props> = ({ count = 6, cols = 3 }) => {
  const colClass =
    cols === 2 ? 'sm:grid-cols-2' :
    cols === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' :
    'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid gap-4 ${colClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 animate-pulse"
        >
          {/* Ícone placeholder */}
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-xl bg-slate-100" />
            <div className="w-12 h-4 rounded bg-slate-100" />
          </div>
          {/* Título */}
          <div className="h-5 w-3/4 rounded-lg bg-slate-100" />
          {/* Descrição */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-5/6 rounded bg-slate-100" />
          </div>
          {/* Ações */}
          <div className="mt-auto pt-4 border-t border-slate-50 flex justify-end gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100" />
            <div className="w-8 h-8 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
};
