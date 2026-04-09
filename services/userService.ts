/**
 * userService.ts
 *
 * REFACTOR: Este arquivo agora é um barrel export que delega para a estrutura modular
 * em ./user/. Isso mantém a compatibilidade com o restante do sistema.
 */

export * from './user/types';
export { userService } from './user';
