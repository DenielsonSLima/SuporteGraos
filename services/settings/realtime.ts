import { supabase } from '../supabase';
import {
  state,
  mapCompanyRecord,
  mapWatermarkRecord,
  notifyCompanyListeners,
  notifyWatermarkListeners,
  COMPANY_KEY,
  WATERMARK_KEY
} from './store';

let companyChannel: any = null;
let watermarkChannel: any = null;

export const startCompanyRealtime = () => {
  if (companyChannel) return;
  companyChannel = supabase.channel('realtime:companies')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, payload => {
      const record = payload.new || payload.old;
      if (record) {
        state.companyId = record.id;
        state.companyData = mapCompanyRecord(record);
        localStorage.setItem(COMPANY_KEY, JSON.stringify(state.companyData));
        notifyCompanyListeners();
      }
    }).subscribe();
};

export const startWatermarkRealtime = () => {
  if (watermarkChannel) return;
  watermarkChannel = supabase.channel('realtime:watermarks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'watermarks' }, payload => {
      const record = payload.new || payload.old;
      if (record) {
        state.watermarkId = record.id;
        state.watermarkSettings = mapWatermarkRecord(record);
        localStorage.setItem(WATERMARK_KEY, JSON.stringify(state.watermarkSettings));
        notifyWatermarkListeners();
      }
    }).subscribe();
};

export const stopRealtime = () => {
  if (companyChannel) { supabase.removeChannel(companyChannel); companyChannel = null; }
  if (watermarkChannel) { supabase.removeChannel(watermarkChannel); watermarkChannel = null; }
};
