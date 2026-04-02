import { InitDiagnostics, ServiceLoadMetric } from './initTypes';

let _initDiagnostics: InitDiagnostics | null = null;
let _initCriticalCompleted = false;
let _initFullCompleted = false;

export const initDiagnostics = {
  start: () => {
    _initDiagnostics = {
      startedAt: new Date().toISOString(),
      services: []
    };
    if (typeof window !== 'undefined') {
      (window as any).__initDiagnostics = _initDiagnostics;
    }
  },

  recordMetric: (metric: ServiceLoadMetric) => {
    if (_initDiagnostics) {
      _initDiagnostics.services.push(metric);
    }
  },

  get: () => _initDiagnostics,

  setPhase1Time: (ms: number) => {
    if (_initDiagnostics) _initDiagnostics.phase1Ms = Math.round(ms);
  },

  setCriticalTime: (ms: number) => {
    if (_initDiagnostics) _initDiagnostics.criticalMs = Math.round(ms);
  },

  setBackgroundTime: (ms: number) => {
    if (_initDiagnostics) _initDiagnostics.backgroundMs = Math.round(ms);
  },

  emitEvent: (name: string, detail?: any) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  },

  setCriticalCompleted: (val: boolean) => { _initCriticalCompleted = val; },
  setFullCompleted: (val: boolean) => { _initFullCompleted = val; },
  
  isCriticalCompleted: () => _initCriticalCompleted,
  isFullCompleted: () => _initFullCompleted
};
