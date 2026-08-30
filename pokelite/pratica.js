// ---------- Modo Prática: tamanho do time + seleção de monstros ----------

const NIVEL_PADRAO_PRATICA = 10;

let tamanhoTimeEscolhido = 1;
let ladoSelecaoAtual = null; // "jogador" | "oponente"
let indiceSelecaoAtual = 0;
let timeJogadorEscolhido = [];
let timeOponenteEscolhido = [];

document.querySelectorAll("[data-tamanho]").forEach((btn) => {
  btn.addEventListener("click", () => {
    tamanhoTimeEscolhido = Number(btn.dataset.tamanho);
    mostrarTela("tela-selecao-pratica");
  });
});

async function iniciarTelaPratica() {
  document.getElementById("titulo-selecao-pratica").textContent = "Carregando dados...";
  try {
    await carregarDadosComRetentativas();
  } catch (erro) {
    document.getElementById("titulo-selecao-pratica").textContent =
      "Não consegui carregar os dados (veja o console).";
    console.error(erro);
    return;
  }

  ladoSelecaoAtual = "jogador";
  indiceSelecaoAtual = 0;
  timeJogadorEscolhido = [];
  timeOponenteEscolhido = [];
  atualizarTituloSelecao();
  renderizarGridPratica();
}

function atualizarTituloSelecao() {
  const ladoTexto = ladoSelecaoAtual === "jogador" ? "seu Time" : "Time do Oponente";
  const contagem = tamanhoTimeEscolhido > 1 ? ` (${indiceSelecaoAtual + 1} de ${tamanhoTimeEscolhido})` : "";
  document.getElementById("titulo-selecao-pratica").textContent = `Escolha ${ladoTexto}${contagem}`;
}

function renderizarGridPratica() {
  const grid = document.getElementById("grid-selecao-pratica");
  grid.innerHTML = "";

  DADOS_MONSTROS.forEach((m) => {
    const card = document.createElement("div");
    card.className = "card-monstro";

    const imgHtml = m.png
      ? `<img class="thumb" src="PNG/${m.png}" alt="${m.nome}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb thumb-vazio',textContent:'?'}))">`
      : `<div class="thumb thumb-vazio">?</div>`;

    card.innerHTML = `
      ${imgHtml}
      <div class="num">#${String(m.numero).padStart(3, "0")}</div>
      <div class="nome">${m.nome}</div>
      <div class="tipo">${m.tipo}</div>
    `;
    card.addEventListener("click", () => escolherMonstroPratica(m.numero));
    grid.appendChild(card);
  });
}

function escolherMonstroPratica(numero) {
  const nivel = Number(document.getElementById("nivel-pratica").value) || NIVEL_PADRAO_PRATICA;
  const instancia = criarInstanciaMonstro(numero, nivel);

  if (ladoSelecaoAtual === "jogador") {
    timeJogadorEscolhido.push(instancia);
  } else {
    timeOponenteEscolhido.push(instancia);
  }

  indiceSelecaoAtual++;

  if (indiceSelecaoAtual >= tamanhoTimeEscolhido) {
    if (ladoSelecaoAtual === "jogador") {
      ladoSelecaoAtual = "oponente";
      indiceSelecaoAtual = 0;
    } else {
      contextoBatalhaAtual = "pratica";
      mostrarTela("tela-batalha");
      iniciarBatalha(timeJogadorEscolhido, timeOponenteEscolhido);
      return;
    }
  }

  atualizarTituloSelecao();
  renderizarGridPratica();
}

document.addEventListener("nexoria:tela-mudou", (e) => {
  if (e.detail.tela === "tela-selecao-pratica") iniciarTelaPratica();
});
