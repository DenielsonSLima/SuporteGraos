/**
 * Service do submódulo API/Integrações.
 * Isola as chamadas de diagnóstico de serviços externos fora do componente visual.
 */
import { GoogleGenAI } from '@google/genai';

interface DiagnosticResult {
  status: 'online' | 'offline' | 'degraded';
  latency: number | null;
  message: string;
}

/**
 * Verifica a disponibilidade da Vercel Edge Network / Frontend.
 */
export const checkVercelEdge = async (): Promise<DiagnosticResult> => {
  const startTime = performance.now();

  try {
    const response = await fetch(window.location.origin + '/metadata.json');
    if (!response.ok) throw new Error('CDN não respondeu');

    const latency = Math.round(performance.now() - startTime);
    const isVercel = window.location.hostname.includes('vercel.app');

    return {
      status: 'online',
      latency,
      message: isVercel ? 'Edge Network Ativo' : 'Localhost (Dev Mode)',
    };
  } catch {
    return {
      status: 'degraded',
      latency: null,
      message: 'CDN Inacessível',
    };
  }
};

/**
 * Verifica a conectividade com a API Google Gemini.
 */
export const checkGemini = async (): Promise<DiagnosticResult> => {
  const startTime = performance.now();

  try {
    if (!process.env.API_KEY) throw new Error('Chave de API não encontrada');

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    await ai.models.countTokens({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: 'ping' }] },
    });

    const latency = Math.round(performance.now() - startTime);
    return {
      status: 'online',
      latency,
      message: 'Operacional (Autenticado)',
    };
  } catch (error: any) {
    return {
      status: 'offline',
      latency: null,
      message: error.message || 'Falha na conexão',
    };
  }
};
