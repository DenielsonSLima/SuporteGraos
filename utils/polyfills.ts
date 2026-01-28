// Polyfill de crypto.randomUUID para navegadores que não suportam nativamente
(() => {
  const hasGlobal = typeof globalThis !== 'undefined';
  if (!hasGlobal) return;

  const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
  if (!cryptoObj) return;

  if (typeof cryptoObj.randomUUID !== 'function') {
    (cryptoObj as any).randomUUID = () => {
      const bytes = new Uint8Array(16);
      if (typeof cryptoObj.getRandomValues === 'function') {
        cryptoObj.getRandomValues(bytes);
      } else {
        for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
      }

      // Ajusta bits para versão 4 e variante RFC 4122
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
      return [
        hex.slice(0, 4).join(''),
        hex.slice(4, 6).join(''),
        hex.slice(6, 8).join(''),
        hex.slice(8, 10).join(''),
        hex.slice(10, 16).join('')
      ].join('-');
    };
  }
})();
