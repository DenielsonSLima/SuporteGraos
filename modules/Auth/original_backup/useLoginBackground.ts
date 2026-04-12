import { useState, useEffect } from 'react';
import { loginScreenService } from '../services/loginScreenService';
import { settingsService } from '../services/settingsService';

const DEFAULT_BG = 'https://images.unsplash.com/photo-1551467013-eb30663473f6?q=80&w=1600';
const PUBLIC_IMAGES = ['/login-images/login.jpg'];

/**
 * Hook que gerencia o carregamento da imagem de fundo da tela de login.
 * Ordem: Supabase → Imagens Públicas → localStorage → Padrão
 */
export function useLoginBackground() {
  const [backgroundImage, setBackgroundImage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Tentar Supabase (pode falhar sem auth)
        try {
          const screens = await Promise.race([
            loginScreenService.loadActiveScreens(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500)),
          ]) as any[];

          if (screens?.length > 0) {
            const first = screens[0];
            if (first?.image_url) { setBackgroundImage(first.image_url); return; }
            if (first?.image_data) { setBackgroundImage(first.image_data); return; }
          }
        } catch {
          // Supabase não disponível — ok, fallback
        }

        // 2. Imagens públicas (sem auth)
        if (PUBLIC_IMAGES.length > 0) {
          const now = new Date();
          const dayOfYear = Math.floor(
            (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
          );
          setBackgroundImage(PUBLIC_IMAGES[dayOfYear % PUBLIC_IMAGES.length]);
          return;
        }

        // 3. Fallback localStorage
        const fallback = settingsService.getActiveLoginImage();
        if (fallback) { setBackgroundImage(fallback); return; }

        // 4. Padrão
        setBackgroundImage(DEFAULT_BG);
      } catch {
        setBackgroundImage(DEFAULT_BG);
      }
    };

    load();

    const handleUpdate = () => { load(); };
    window.addEventListener('login_screens:updated', handleUpdate);
    return () => { window.removeEventListener('login_screens:updated', handleUpdate); };
  }, []);

  return backgroundImage;
}
