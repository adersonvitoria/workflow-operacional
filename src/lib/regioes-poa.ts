// Regiões para o campo Região dos cards: Porto Alegre + Região Metropolitana
// (municípios) + todos os bairros de Porto Alegre.

/** Municípios da Região Metropolitana de Porto Alegre (inclui a capital). */
export const MUNICIPIOS_RMPA: string[] = [
  "Porto Alegre", "Alvorada", "Araricá", "Arroio dos Ratos", "Cachoeirinha", "Campo Bom", "Canoas",
  "Capela de Santana", "Charqueadas", "Dois Irmãos", "Eldorado do Sul", "Estância Velha", "Esteio",
  "Glorinha", "Gravataí", "Guaíba", "Igrejinha", "Ivoti", "Montenegro", "Nova Hartz", "Nova Santa Rita",
  "Novo Hamburgo", "Parobé", "Portão", "Rolante", "Santo Antônio da Patrulha", "São Jerônimo",
  "São Leopoldo", "São Sebastião do Caí", "Sapiranga", "Sapucaia do Sul", "Taquara", "Triunfo", "Viamão",
];

/** Bairros de Porto Alegre. */
export const BAIRROS_POA: string[] = [
  "Aberta dos Morros", "Agronomia", "Anchieta", "Arquipélago", "Auxiliadora", "Azenha", "Bela Vista",
  "Belém Novo", "Belém Velho", "Boa Vista", "Bom Fim", "Bom Jesus", "Camaquã", "Campo Novo", "Cascata",
  "Cavalhada", "Centro Histórico", "Chácara das Pedras", "Chapéu do Sol", "Cidade Baixa",
  "Coronel Aparício Borges", "Cristal", "Cristo Redentor", "Espírito Santo", "Extrema", "Farrapos",
  "Farroupilha", "Floresta", "Glória", "Guarujá", "Higienópolis", "Hípica", "Humaitá", "Independência",
  "Ipanema", "Jardim Botânico", "Jardim Carvalho", "Jardim do Salso", "Jardim Europa", "Jardim Floresta",
  "Jardim Itu", "Jardim Leopoldina", "Jardim Lindóia", "Jardim Sabará", "Jardim São Pedro", "Lageado",
  "Lami", "Lomba do Pinheiro", "Mário Quintana", "Medianeira", "Menino Deus", "Moinhos de Vento",
  "Mont'Serrat", "Morro Santana", "Nonoai", "Partenon", "Passo da Areia", "Passo das Pedras",
  "Pedra Redonda", "Petrópolis", "Ponta Grossa", "Praia de Belas", "Protásio Alves", "Restinga",
  "Rio Branco", "Rubem Berta", "Santa Cecília", "Santa Maria Goretti", "Santa Rosa de Lima",
  "Santa Tereza", "Santana", "Santo Antônio", "São Caetano", "São Geraldo", "São João", "São José",
  "São Sebastião", "Sarandi", "Sétimo Céu", "Teresópolis", "Três Figueiras", "Tristeza",
  "Vila Assunção", "Vila Conceição", "Vila Ipiranga", "Vila Jardim", "Vila João Pessoa", "Vila Nova",
  "Vila São José",
];

/** Lista combinada (sem duplicados), ordenada — usada no campo Região. */
export const REGIOES_POA: string[] = Array.from(new Set([...MUNICIPIOS_RMPA, ...BAIRROS_POA])).sort((a, b) => a.localeCompare(b, "pt-BR"));

/** Conjunto (minúsculas) dos municípios — para o geocode distinguir cidade x bairro. */
export const SET_MUNICIPIOS_RMPA = new Set(MUNICIPIOS_RMPA.map((s) => s.toLowerCase()));
