// modules/Partners/PartnersModule.tsx
// Re-exporta de partners.page.tsx para compatibilidade com App.tsx
// (SKILL §9.4: nome canônico é partners.page.tsx)
export { default } from './partners.page';

// ============================================================================
// ARQUIVO LEGADO — mantido apenas como re-export.
// Toda a lógica agora reside em partners.page.tsx
// ============================================================================

// Imports abaixo foram removidos — a implementação está em partners.page.tsx
import React from 'react';

// O componente é exportado acima via re-export de partners.page.tsx
