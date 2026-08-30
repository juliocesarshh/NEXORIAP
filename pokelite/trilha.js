// Player de trilha sonora compartilhado entre as telas do NEXORIA.
// Carregue som.js ANTES deste arquivo em qualquer página que use música.

const CHAVE_STORAGE_SOM = "nexoria_config";

function nexoriaCarregarConfigSom() {
  const faixas = window.FAIXAS_SOM || [];
  const padrao = {
    mudo: false,
    faixasAtivas: Object.fromEntries(faixas.map((f) => [f.id, true])),
  };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE_SOM));
    if (!salvo) return padrao;
    return {
      mudo: !!salvo.mudo,
      faixasAtivas: { ...padrao.faixasAtivas, ...(salvo.faixasAtivas || {}) },
    };
  } catch {
    return padrao;
  }
}

const nexoriaConfigSom = nexoriaCarregarConfigSom();

function nexoriaSalvarConfigSom() {
  localStorage.setItem(CHAVE_STORAGE_SOM, JSON.stringify(nexoriaConfigSom));
}

const nexoriaPlayer = new Audio();
nexoriaPlayer.volume = 0.6;
let nexoriaIndiceAtual = -1;
let nexoriaJaComecou = false;

function nexoriaFaixasHabilitadas() {
  return (window.FAIXAS_SOM || []).filter((f) => nexoriaConfigSom.faixasAtivas[f.id]);
}

function nexoriaTocarProxima() {
  const ativas = nexoriaFaixasHabilitadas();
  if (ativas.length === 0) {
    console.warn("[NEXORIA] Nenhuma faixa ativa em som.js / Configurações.");
    return;
  }

  nexoriaIndiceAtual = (nexoriaIndiceAtual + 1) % ativas.length;
  const faixa = ativas[nexoriaIndiceAtual];
  nexoriaPlayer.src = faixa.arquivo;
  nexoriaPlayer.loop = ativas.length === 1; // só 1 faixa ativa -> repete ela mesma
  nexoriaPlayer.muted = nexoriaConfigSom.mudo;

  nexoriaPlayer
    .play()
    .then(() => {
      // só marca como "já começou" quando realmente tocar — se falhar,
      // a próxima interação do usuário tenta de novo.
      nexoriaJaComecou = true;
      window.removeEventListener("pointerdown", nexoriaIniciarSeNecessario, true);
    })
    .catch((erro) => {
      console.warn("[NEXORIA] Ainda não consegui tocar a música:", erro.message);
    });

  document.dispatchEvent(new CustomEvent("nexoria:faixa-mudou", { detail: { id: faixa.id } }));
}

nexoriaPlayer.addEventListener("ended", () => {
  if (!nexoriaPlayer.loop) nexoriaTocarProxima();
});

function nexoriaIniciarSeNecessario() {
  if (nexoriaJaComecou) return;
  nexoriaTocarProxima();
}

// pointerdown (em vez de click) pega o primeiro toque/clique o quanto antes,
// em qualquer lugar da página — é o único jeito de "ligar" o som, por regra do navegador.
// Sem "once: true": se a 1ª tentativa falhar (ex: arquivo ainda carregando), tenta de novo no próximo clique.
window.addEventListener("pointerdown", nexoriaIniciarSeNecessario, { capture: true });

function nexoriaAplicarMudo() {
  nexoriaPlayer.muted = nexoriaConfigSom.mudo;
}
nexoriaAplicarMudo();

function nexoriaAlternarMudo() {
  nexoriaConfigSom.mudo = !nexoriaConfigSom.mudo;
  nexoriaAplicarMudo();
  nexoriaSalvarConfigSom();
  return nexoriaConfigSom.mudo;
}

function nexoriaDefinirFaixaAtiva(id, ativa) {
  nexoriaConfigSom.faixasAtivas[id] = ativa;
  nexoriaSalvarConfigSom();
  const ativas = nexoriaFaixasHabilitadas();
  const faixaAtualAindaAtiva = ativas.some((x) => nexoriaPlayer.src.endsWith(x.arquivo));
  if (nexoriaJaComecou && !faixaAtualAindaAtiva) {
    nexoriaIndiceAtual = -1;
    nexoriaTocarProxima();
  } else if (ativas.length === 1) {
    nexoriaPlayer.loop = ativas.some((x) => nexoriaPlayer.src.endsWith(x.arquivo));
  }
}
