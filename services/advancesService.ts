/**
 * Service para Adiantamentos
 * 
 * REFACTOR: Este arquivo agora é um barrel export que delega para a estrutura modular
 * em ./advances/. Isso mantém a compatibilidade com o restante do sistema.
 */

export * from './advances/types';
export { advancesService } from './advances';
