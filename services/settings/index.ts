import { state } from './store';
import { loadFromSupabase } from './loader';
import {
  updateCompanyData,
  updateWatermark,
  updateLoginSettings,
  getActiveLoginImage,
  getAgroPrompts
} from './actions';
import { startCompanyRealtime, startWatermarkRealtime, stopRealtime } from './realtime';
import type { CompanyListener, WatermarkListener } from './types';

export const settingsService = {
  loadFromSupabase,
  startRealtime: () => {
    startCompanyRealtime();
    startWatermarkRealtime();
  },
  stopRealtime,
  // --- DADOS DA EMPRESA ---
  getCompanyData: () => state.companyData,
  onCompanyChange: (listener: CompanyListener) => {
    state.companyListeners.push(listener);
    return () => {
      const index = state.companyListeners.indexOf(listener);
      if (index >= 0) state.companyListeners.splice(index, 1);
    };
  },
  updateCompanyData,
  // --- MARCA D'ÁGUA ---
  getWatermark: () => state.watermarkSettings,
  onWatermarkChange: (listener: WatermarkListener) => {
    state.watermarkListeners.push(listener);
    return () => {
      const index = state.watermarkListeners.indexOf(listener);
      if (index >= 0) state.watermarkListeners.splice(index, 1);
    };
  },
  updateWatermark,
  // --- TELA DE LOGIN ---
  getLoginSettings: () => state.loginScreenSettings,
  updateLoginSettings,
  getActiveLoginImage,
  getAgroPrompts
};
