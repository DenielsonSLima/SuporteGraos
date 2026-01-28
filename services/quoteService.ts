
export interface Quote {
  text: string;
  author: string;
}

const MOTIVATIONAL_QUOTES: Quote[] = [
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { text: "A persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { text: "O único lugar onde o sucesso vem antes do trabalho é no dicionário.", author: "Vidal Sassoon" },
  { text: "Não espere por oportunidades, crie-as.", author: "George Bernard Shaw" },
  { text: "A gratidão transforma o que temos em suficiente.", author: "Melody Beattie" },
  { text: "Olhe para frente. O para-brisa é maior que o retrovisor por um motivo.", author: "Desconhecido" },
  { text: "Foco é dizer não para as centenas de outras boas ideias que existem.", author: "Steve Jobs" },
  { text: "Não importa o quão devagar você vá, desde que você não pare.", author: "Confúcio" },
  { text: "A coragem não é a ausência do medo, mas o triunfo sobre ele.", author: "Nelson Mandela" },
  { text: "Seja grato pelo que você tem; você acabará tendo mais.", author: "Oprah Winfrey" },
  { text: "Acredite que você pode, assim você já está no meio do caminho.", author: "Theodore Roosevelt" },
  { text: "Dificuldades preparam pessoas comuns para destinos extraordinários.", author: "C.S. Lewis" },
  { text: "O segredo do futuro é focar toda a sua energia não em brigar com o velho, mas em construir o novo.", author: "Sócrates" },
  { text: "A única maneira de fazer um excelente trabalho é amar o que você faz.", author: "Steve Jobs" },
  { text: "Nunca desista de um sonho apenas por causa do tempo que levará para realizá-lo. O tempo passará de qualquer maneira.", author: "Earl Nightingale" },
  { text: "A resiliência é a capacidade de recuperar-se das adversidades e continuar avançando.", author: "Desconhecido" },
  { text: "Grandes coisas nunca vêm de zonas de conforto.", author: "Neil Strauss" },
  { text: "A vida é 10% o que acontece com você e 90% como você reage a isso.", author: "Charles R. Swindoll" },
  { text: "Se você não pode voar, corra. Se não pode correr, ande. Se não pode andar, rasteje, mas continue em frente.", author: "Martin Luther King Jr." },
  { text: "Comece onde você está. Use o que você tem. Faça o que você pode.", author: "Arthur Ashe" }
];

export const quoteService = {
  getDailyQuote: (): Quote => {
    // Obtém a data atual como string única (ex: "2023-10-27")
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    // Gera um hash numérico simples a partir da string da data
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Garante que o hash seja positivo
    const positiveHash = Math.abs(hash);
    
    // Usa o operador módulo (%) para garantir um índice válido dentro do array
    const index = positiveHash % MOTIVATIONAL_QUOTES.length;
    
    return MOTIVATIONAL_QUOTES[index];
  }
};
