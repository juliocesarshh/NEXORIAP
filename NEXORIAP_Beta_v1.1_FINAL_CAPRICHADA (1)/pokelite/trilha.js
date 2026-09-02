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
let nexoriaEmBatalha = false;
let nexoriaEstadoExploracao = null;
const nexoriaEfeitosAtivos = new Set();

function nexoriaFaixasHabilitadas() {
  return (window.FAIXAS_SOM || []).filter((f) => nexoriaConfigSom.faixasAtivas[f.id]);
}

function nexoriaTocarProxima() {
  nexoriaEmBatalha = false;
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

function nexoriaTocarBatalha(tipo = "selvagem") {
  const arquivo = (window.FAIXAS_BATALHA || {})[tipo] || (window.FAIXAS_BATALHA || {}).selvagem;
  if (!arquivo) return;

  if (!nexoriaEmBatalha) {
    nexoriaEstadoExploracao = {
      src: nexoriaPlayer.src,
      currentTime: Number.isFinite(nexoriaPlayer.currentTime) ? nexoriaPlayer.currentTime : 0,
      estavaTocando: !nexoriaPlayer.paused,
    };
  }

  nexoriaEmBatalha = true;
  nexoriaPlayer.pause();
  nexoriaPlayer.src = arquivo;
  nexoriaPlayer.currentTime = 0;
  nexoriaPlayer.loop = true;
  nexoriaPlayer.muted = nexoriaConfigSom.mudo;
  nexoriaPlayer.play().catch((erro) => console.warn("[NEXORIA] Não consegui tocar a música de batalha:", erro.message));
}

function nexoriaRestaurarExploracao() {
  if (!nexoriaEmBatalha) return;
  const anterior = nexoriaEstadoExploracao;
  nexoriaEmBatalha = false;
  nexoriaEstadoExploracao = null;

  if (anterior?.src) {
    nexoriaPlayer.src = anterior.src;
    nexoriaPlayer.loop = false;
    try { nexoriaPlayer.currentTime = anterior.currentTime || 0; } catch {}
    nexoriaPlayer.muted = nexoriaConfigSom.mudo;
    if (anterior.estavaTocando) {
      nexoriaPlayer.play().catch((erro) => console.warn("[NEXORIA] Não consegui retomar a trilha:", erro.message));
    }
  } else {
    nexoriaIndiceAtual = -1;
    nexoriaTocarProxima();
  }
}

function nexoriaTocarEfeito(arquivo, volume = 0.8) {
  if (nexoriaConfigSom.mudo || !arquivo) return;
  const efeito = new Audio(arquivo);
  efeito.volume = volume;
  nexoriaEfeitosAtivos.add(efeito);
  efeito.addEventListener("ended", () => nexoriaEfeitosAtivos.delete(efeito), { once: true });
  efeito.play().catch(() => nexoriaEfeitosAtivos.delete(efeito));
}

// Efeito sonoro padrão dos botões. O arquivo foi fornecido para o NEXORIA e
// está em /Som/batalha/pokebola.mp3 (mesmo áudio de botão do material enviado).
const NEXORIA_EFEITO_BOTAO = "Som/batalha/pokebola.mp3";

function nexoriaTocarEfeitoBotao() {
  nexoriaTocarEfeito(NEXORIA_EFEITO_BOTAO, 0.55);
}

document.addEventListener("click", (e) => {
  const alvo = e.target.closest("button, a, [role=button]");
  if (!alvo || alvo.disabled || alvo.getAttribute("aria-disabled") === "true") return;
  nexoriaTocarEfeitoBotao();
});

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

document.addEventListener("nexoria:tela-mudou", (e) => {
  if (e.detail?.tela !== "tela-batalha") nexoriaRestaurarExploracao();
});

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
