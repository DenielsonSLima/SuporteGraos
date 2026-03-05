/**
 * Service do submódulo Empresa.
 * Isola chamadas de API externas (ReceitaWS) fora do componente visual.
 */

interface ReceitaWSData {
  status?: string;
  message?: string;
  nome?: string;
  fantasia?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  telefone?: string;
  email?: string;
}

/**
 * Consulta dados de CNPJ na ReceitaWS via JSONP (bypass CORS).
 * @param cnpj CNPJ limpo (apenas números, 14 dígitos)
 */
export const fetchCnpjData = (cnpj: string): Promise<ReceitaWSData> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callbackName = 'receitaws_callback_' + Math.round(100000 * Math.random());

    // Define global callback
    (window as any)[callbackName] = (data: ReceitaWSData) => {
      delete (window as any)[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    script.src = `https://www.receitaws.com.br/v1/cnpj/${cnpj}?callback=${callbackName}`;
    script.onerror = () => {
      delete (window as any)[callbackName];
      document.body.removeChild(script);
      reject(new Error('Falha na conexão com a ReceitaWS'));
    };

    document.body.appendChild(script);
  });
};
