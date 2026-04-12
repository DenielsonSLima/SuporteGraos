import { useState, useEffect, useMemo } from 'react';

/**
 * Hook que gerencia o relógio e localização da tela de login.
 */
export function useLoginClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(
    () => currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    [currentTime],
  );

  const formattedDate = useMemo(
    () => currentTime.toLocaleDateString('pt-BR'),
    [currentTime],
  );

  return { formattedTime, formattedDate, location: 'Acesso Seguro' as string };
}
