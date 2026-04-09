/**
 * SERVIÇO DE MOTORISTAS
 * 
 * REFACTOR: Este arquivo agora é um barrel export que delega para a estrutura modular
 * em ./driver/. Isso mantém a compatibilidade com o restante do sistema.
 */

export * from './driver/types';
export { driverService } from './driver';
