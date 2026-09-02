// Cenários de fundo da arena de batalha.
//
// Como adicionar um cenário novo ou uma combinação que falta:
// 1) Jogue a imagem em /img/campos
// 2) Adicione uma linha aqui com a chave certa (veja o padrão abaixo)
//
// Chaves possíveis (combine com hífen, sempre nesta ordem: florido-estrelado-chuva):
//   "normal", "chuva", "florido", "estrelado",
//   "florido-estrelado", "florido-chuva", "estrelado-chuva", "florido-estrelado-chuva"
//
// Hoje faltam "florido-chuva" e "estrelado-chuva" — sem eles, o jogo cai automaticamente
// pra a versão sem chuva mais parecida (ver resolverImagemCampo em batalha.js).

const CAMPOS_IMAGENS = {
  normal: "img/campos/normal.png",
  chuva: "img/campos/chuva.png",
  florido: "img/campos/florido.png",
  estrelado: "img/campos/estrelado.png",
  "florido-estrelado": "img/campos/florido-estrelado.png",
  "florido-estrelado-chuva": "img/campos/florido-estrelado-chuva.png",
  "deus-da-guerra": "img/campos/deus-da-guerra.png",
};

window.CAMPOS_IMAGENS = CAMPOS_IMAGENS;

// Escolhe a imagem de fundo mais próxima do estado atual do campo.
// Se a combinação exata não existir (ex: chuva+estrelado sem imagem própria),
// cai pra versão sem chuva — chuva é clima passageiro, os outros dois são mais raros/especiais.
function resolverImagemCampo(chuva, estrelado, florido, campoBatalha = false) {
  if (campoBatalha && CAMPOS_IMAGENS["deus-da-guerra"]) return CAMPOS_IMAGENS["deus-da-guerra"];

  const partes = [];
  if (florido) partes.push("florido");
  if (estrelado) partes.push("estrelado");
  if (chuva) partes.push("chuva");

  const chave = partes.length ? partes.join("-") : "normal";
  if (CAMPOS_IMAGENS[chave]) return CAMPOS_IMAGENS[chave];

  if (chuva) {
    const semChuva = partes.filter((p) => p !== "chuva");
    const chaveSemChuva = semChuva.length ? semChuva.join("-") : "normal";
    if (CAMPOS_IMAGENS[chaveSemChuva]) return CAMPOS_IMAGENS[chaveSemChuva];
  }

  return CAMPOS_IMAGENS.normal;
}
