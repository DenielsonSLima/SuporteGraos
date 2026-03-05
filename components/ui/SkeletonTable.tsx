/**
 * SkeletonTable.tsx
 *
 * Esqueleto animado para tabelas (ex.: Usuários).
 * Substitui o spinner centralizado, mantendo o layout da tabela preenchida enquanto carrega.
 *
 * Uso dentro de <tbody>:
 *   import { SkeletonTableRows } from '../../../components/ui/SkeletonTable';
 *   {isLoading && <SkeletonTableRows rows={5} cols={5} />}
 */

import React from 'react';

interface Props {
  /** Quantidade de linhas fantasma (default 5) */
  rows?: number;
  /** Quantidade de colunas (default 5) */
  cols?: number;
}

/**
 * Linhas fantasma para uso dentro de um <tbody> existente.
 */
export const SkeletonTableRows: React.FC<Props> = ({ rows = 5, cols = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <tr key={rowIdx} className="border-b border-slate-100">
        {/* Primeira coluna: avatar + dois textos */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-32 rounded bg-slate-100" />
              <div className="h-2.5 w-24 rounded bg-slate-100" />
            </div>
          </div>
        </td>

        {/* Colunas intermediárias: duas linhas de texto */}
        {Array.from({ length: cols - 2 }).map((_, colIdx) => (
          <td key={colIdx} className="px-6 py-4">
            <div className="space-y-2 animate-pulse">
              <div className="h-3 w-28 rounded bg-slate-100" />
              <div className="h-2.5 w-20 rounded bg-slate-100" />
            </div>
          </td>
        ))}

        {/* Última coluna: botões de ação */}
        <td className="px-6 py-4">
          <div className="flex justify-end gap-2 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-slate-100" />
            <div className="w-8 h-8 rounded-lg bg-slate-100" />
          </div>
        </td>
      </tr>
    ))}
  </>
);
