// Tabela de efetividade de tipos — inspirada no sistema clássico de Pokémon.
// TABELA_TIPOS[tipoAtacante][tipoDefensor] = multiplicador.
// Combinações não listadas valem 1x (dano normal).

const TABELA_TIPOS = {
  Normal:   { Pedra: 0.5, Fantasma: 0, Aço: 0.5 },
  Fogo:     { Fogo: 0.5, Água: 0.5, Planta: 2, Gelo: 2, Inseto: 2, Pedra: 0.5, Dragão: 0.5, Aço: 2 },
  Água:     { Fogo: 2, Água: 0.5, Planta: 0.5, Terra: 2, Pedra: 2, Dragão: 0.5 },
  Elétrico: { Água: 2, Elétrico: 0.5, Planta: 0.5, Terra: 0, Voador: 2, Dragão: 0.5 },
  Planta:   { Fogo: 0.5, Água: 2, Planta: 0.5, Veneno: 0.5, Terra: 2, Voador: 0.5, Inseto: 0.5, Pedra: 2, Dragão: 0.5, Aço: 0.5 },
  Gelo:     { Fogo: 0.5, Água: 0.5, Planta: 2, Gelo: 0.5, Terra: 2, Voador: 2, Dragão: 2, Aço: 0.5 },
  Lutador:  { Normal: 2, Gelo: 2, Veneno: 0.5, Voador: 0.5, Psíquico: 0.5, Inseto: 0.5, Pedra: 2, Fantasma: 0, Dark: 2, Aço: 2, Fada: 0.5 },
  Veneno:   { Planta: 2, Veneno: 0.5, Terra: 0.5, Pedra: 0.5, Fantasma: 0.5, Aço: 0, Fada: 2 },
  Terra:    { Fogo: 2, Elétrico: 2, Planta: 0.5, Veneno: 2, Voador: 0, Inseto: 0.5, Pedra: 2, Aço: 2 },
  Voador:   { Elétrico: 0.5, Planta: 2, Lutador: 2, Inseto: 2, Pedra: 0.5, Aço: 0.5 },
  Psíquico: { Lutador: 2, Veneno: 2, Psíquico: 0.5, Dark: 0, Aço: 0.5 },
  Inseto:   { Fogo: 0.5, Planta: 2, Lutador: 0.5, Veneno: 0.5, Voador: 0.5, Psíquico: 2, Fantasma: 0.5, Dark: 2, Aço: 0.5, Fada: 0.5 },
  Pedra:    { Fogo: 2, Gelo: 2, Lutador: 0.5, Terra: 0.5, Voador: 2, Inseto: 2, Aço: 0.5 },
  Fantasma: { Normal: 0, Psíquico: 2, Fantasma: 2, Dark: 0.5 },
  Dragão:   { Dragão: 2, Aço: 0.5, Fada: 0 },
  Dark:     { Lutador: 0.5, Psíquico: 2, Fantasma: 2, Dark: 0.5, Fada: 0.5 },
  Aço:      { Fogo: 0.5, Água: 0.5, Elétrico: 0.5, Gelo: 2, Pedra: 2, Aço: 0.5, Fada: 2 },
  Fada:     { Fogo: 0.5, Lutador: 2, Veneno: 0.5, Dragão: 2, Dark: 2, Aço: 0.5 },
  // Vento ainda não tem efetividade definida — fica neutro (1x) contra tudo por enquanto.
  Fofo: {}, // tipo neutro por enquanto.
};

// tiposDefensorTexto pode ser um tipo só ("Fogo") ou dois separados por "/" ("Fogo/Terra").
// Em monstros com 2 tipos, os multiplicadores dos dois tipos se multiplicam entre si
// (é assim que "4x de dano" acontece em Pokémon — dois tipos fracos pro mesmo ataque).
function calcularEfetividade(tipoAtaque, tiposDefensorTexto) {
  const tipos = tiposDefensorTexto.split("/").map((t) => t.trim());
  return tipos.reduce((mult, tipoDef) => {
    const linha = TABELA_TIPOS[tipoAtaque];
    const fator = linha && linha[tipoDef] !== undefined ? linha[tipoDef] : 1;
    return mult * fator;
  }, 1);
}

// Cores por tipo, estilo Pokémon — usadas nas badges de tipo em vários cards.
const CORES_TIPO = {
  Normal: "#A8A878", Fogo: "#F08030", Água: "#6890F0", Elétrico: "#F8D030",
  Planta: "#78C850", Gelo: "#98D8D8", Lutador: "#C03028", Veneno: "#A040A0",
  Terra: "#E0C068", Voador: "#A890F0", Psíquico: "#F85888", Inseto: "#A8B820",
  Pedra: "#B8A038", Fantasma: "#705898", Dragão: "#7038F8", Dark: "#705848",
  Fofo: "#F6A6D7",
  Aço: "#B8B8D0", Fada: "#EE99AC", Vento: "#70C8D8",
};

window.CORES_TIPO = CORES_TIPO;

function criarBadgeTipo(tipo) {
  const cor = CORES_TIPO[tipo] || "#888";
  return `<span class="badge-tipo" style="background:${cor}">${tipo.toUpperCase()}</span>`;
}
