
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalCount,
    pageSize,
    onPageChange,
    isLoading
}) => {
    const totalPages = Math.ceil(totalCount / pageSize);

    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            if (endPage === totalPages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) pages.push(i);
        }
        return pages;
    };

    const buttonClass = (active: boolean) => `
    flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold transition-all
    ${active
            ? 'bg-slate-900 text-white shadow-lg scale-110 z-10'
            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}
    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
  `;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-slate-100 mt-6">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                Mostrando <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}</span> a{' '}
                <span className="text-slate-900">{Math.min(currentPage * pageSize, totalCount)}</span> de{' '}
                <span className="text-slate-900">{totalCount}</span> registros
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1 || isLoading}
                    className={`${buttonClass(false)} w-9 h-9 border-none`}
                >
                    <ChevronsLeft size={16} />
                </button>

                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className={buttonClass(false)}
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={buttonClass(currentPage === page)}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className={buttonClass(false)}
                >
                    <ChevronRight size={18} />
                </button>

                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || isLoading}
                    className={`${buttonClass(false)} w-9 h-9 border-none`}
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    );
};
