// Lista de faixas do NEXORIA.
//
// Como adicionar uma música nova:
// 1) Jogue o arquivo (mp3 ou ogg) dentro da pasta /Som
// 2) Adicione uma linha aqui embaixo com um id único, o nome que quer que apareça
//    nas Configurações, e o caminho do arquivo (sempre começando com "Som/")
// 3) Pronto — ela aparece sozinha na lista de Soundtrack, sem mexer em mais nada.

const FAIXAS_SOM = [
  { id: "faixa-01", nome: "Cidade Inicial", arquivo: "Som/faixa-01-cidade-inicial.mp3" },
];

// Precisa ficar explícito em "window" — uma const no topo do arquivo não vira
// propriedade de window sozinha, e trilha.js/tela-inicial.js leem window.FAIXAS_SOM.
window.FAIXAS_SOM = FAIXAS_SOM;
