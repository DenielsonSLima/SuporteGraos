/**
 * SERVIÇO DE VEÍCULOS
 * 
 * REFACTOR: Este arquivo agora é um barrel export que delega para a estrutura modular
 * em ./vehicle/. Isso mantém a compatibilidade com o restante do sistema.
 */

export * from './vehicle/types';
export { vehicleService } from './vehicle';
