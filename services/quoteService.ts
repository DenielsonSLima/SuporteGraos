import quotesData from '../data/quotes.json';

export interface Quote {
  text: string;
  author: string;
}

const MOTIVATIONAL_QUOTES: Quote[] = quotesData;

export const quoteService = {
  getDailyQuote: (): Quote => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Usa o dia do ano para garantir uma rotação sequencial diária pelas 366 frases
    const index = dayOfYear % MOTIVATIONAL_QUOTES.length;

    return MOTIVATIONAL_QUOTES[index];
  }
};
