// ---------- Multiplayer / salas ----------
let mpSocket = null;
let mpConectado = false;
let mpPapel = null; // "host" | "guest"
let mpSalaId = null;
let mpNivel = 10;
let mpTamanho = 1;
let mpTimeEscolhido = [];
let mpServidorPronto = false;

function mpUrlWebSocket() {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  const host = location.hostname || "localhost";
  const porta = location.port ? `:${location.port}` : "";
  return `${protocolo}//${host}${porta}`;
}

function mpStatus(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

function prepararTelaMultiplayer() {
  mostrarMenuMultiplayer();
  if (!mpSocket || mpSocket.readyState > 1) conectarMultiplayer();
}

function conectarMultiplayer() {
  if (mpSocket && (mpSocket.readyState === WebSocket.OPEN || mpSocket.readyState === WebSocket.CONNECTING)) return;

  mpSocket = new WebSocket(mpUrlWebSocket());

  mpSocket.addEventListener("open", () => {
    mpConectado = true;
    mpServidorPronto = true;
    mpStatus("mp-procurar-status", "");
  });

  mpSocket.addEventListener("message", (evento) => {
    try {
      tratarMensagemMultiplayer(JSON.parse(evento.data));
    } catch (erro) {
      console.error("[NEXORIA] Mensagem multiplayer inválida:", erro);
    }
  });

  mpSocket.addEventListener("close", () => {
    mpConectado = false;
    mpServidorPronto = false;
    if (mpSalaId) mpStatus("mp-sala-status", "A conexão com a sala foi encerrada.");
  });

  mpSocket.addEventListener("error", () => {
    mpConectado = false;
    mpServidorPronto = false;
    mpStatus("mp-procurar-status", "Não foi possível conectar ao servidor multiplayer.");
  });
}

function mpEnviar(tipo, dados = {}) {
  if (!mpSocket || mpSocket.readyState !== WebSocket.OPEN) {
    alert("O servidor multiplayer não está conectado.");
    return false;
  }
  mpSocket.send(JSON.stringify({ tipo, ...dados }));
  return true;
}

function mostrarMenuMultiplayer() {
  ["multiplayer-menu", "mp-criar-painel", "mp-procurar-painel", "mp-sala-painel", "mp-selecao-painel"]
    .forEach((id) => { document.getElementById(id).hidden = true; });
  document.getElementById("multiplayer-menu").hidden = false;
}

function abrirPainelCriarSala() {
  conectarMultiplayer();
  document.getElementById("multiplayer-menu").hidden = true;
  document.getElementById("mp-criar-painel").hidden = false;
  mpStatus("mp-criar-status", "Escolha o formato para gerar o ID da sala.");
}

function abrirPainelProcurarSala() {
  conectarMultiplayer();
  document.getElementById("multiplayer-menu").hidden = true;
  document.getElementById("mp-procurar-painel").hidden = false;
  document.getElementById("mp-id").value = "";
  mpStatus("mp-procurar-status", "");
  setTimeout(() => document.getElementById("mp-id").focus(), 0);
}

function criarSalaMultiplayer(tamanho) {
  mpNivel = Math.max(1, Math.min(105, Number(document.getElementById("mp-nivel").value) || 10));
  mpTamanho = tamanho;
  if (!mpEnviar("create-room", { nivel: mpNivel, tamanho: mpTamanho })) return;

  mpPapel = "host";
  document.getElementById("mp-criar-painel").hidden = true;
  document.getElementById("mp-sala-painel").hidden = false;
  mpStatus("mp-sala-status", "Gerando sala...");
}

function entrarNaSalaMultiplayer() {
  const id = document.getElementById("mp-id").value.trim();
  if (!/^\d{4}$/.test(id)) {
    mpStatus("mp-procurar-status", "Digite exatamente 4 dígitos.");
    return;
  }
  if (!mpEnviar("join-room", { id })) return;
  mpStatus("mp-procurar-status", "Procurando sala...");
}

function sairDaSalaMultiplayer() {
  if (mpSocket && mpSocket.readyState === WebSocket.OPEN) mpEnviar("leave-room");
  mpSalaId = null;
  mpPapel = null;
  mpTimeEscolhido = [];
  mostrarMenuMultiplayer();
}

function abrirSelecaoMultiplayer() {
  document.getElementById("multiplayer-menu").hidden = true;
  document.getElementById("mp-criar-painel").hidden = true;
  document.getElementById("mp-procurar-painel").hidden = true;
  document.getElementById("mp-sala-painel").hidden = true;
  document.getElementById("mp-selecao-painel").hidden = false;

  document.getElementById("mp-config-resumo").textContent =
    `Sala ${mpSalaId} · ${mpNivel} Nv. · ${mpTamanho}×${mpTamanho}`;
  document.getElementById("mp-selecao-titulo").textContent =
    `Escolha seu time (1 de ${mpTamanho})`;
  mpTimeEscolhido = [];
  renderizarGridMultiplayer();
}

async function iniciarSelecaoMultiplayer() {
  try {
    await carregarDadosComRetentativas();
    abrirSelecaoMultiplayer();
  } catch (erro) {
    console.error(erro);
    mpStatus("mp-selecao-status", "Não consegui carregar os monstros.");
  }
}

function renderizarGridMultiplayer() {
  const grid = document.getElementById("grid-selecao-multiplayer");
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
    card.addEventListener("click", () => escolherMonstroMultiplayer(m.numero));
    grid.appendChild(card);
  });
}

function escolherMonstroMultiplayer(numero) {
  if (mpTimeEscolhido.length >= mpTamanho) return;

  const instancia = criarInstanciaMonstro(numero, mpNivel);
  if (!instancia) return;

  mpTimeEscolhido.push(instancia);
  const faltam = mpTamanho - mpTimeEscolhido.length;

  if (faltam > 0) {
    document.getElementById("mp-selecao-titulo").textContent =
      `Escolha seu time (${mpTimeEscolhido.length + 1} de ${mpTamanho})`;
    mpStatus("mp-selecao-status", `Você já escolheu ${mpTimeEscolhido.length}. Faltam ${faltam}.`);
  } else {
    mpStatus("mp-selecao-status", "Time enviado. Aguardando o outro jogador...");
    mpEnviar("team-ready", { time: mpTimeEscolhido });
    document.getElementById("grid-selecao-multiplayer").style.pointerEvents = "none";
  }
}

function solicitarRevancheMultiplayer() {
  if (!mpSalaId) return;
  // Volta à seleção imediatamente para permitir escolher outros monstros.
  estadoBatalha = null;
  mpTimeEscolhido = [];
  document.getElementById("painel-fim-batalha")?.setAttribute("hidden", "");
  mostrarTela("tela-multiplayer");
  document.getElementById("multiplayer-menu").hidden = true;
  document.getElementById("mp-criar-painel").hidden = true;
  document.getElementById("mp-procurar-painel").hidden = true;
  document.getElementById("mp-sala-painel").hidden = true;
  document.getElementById("mp-selecao-painel").hidden = false;
  document.getElementById("mp-config-resumo").textContent =
    `Revanche · Sala ${mpSalaId} · ${mpNivel} Nv. · ${mpTamanho}×${mpTamanho}`;
  document.getElementById("mp-selecao-titulo").textContent =
    `Escolha seu time (1 de ${mpTamanho})`;
  mpStatus("mp-selecao-status", "Escolha novamente seu time. O adversário também precisa confirmar a revanche.");
  renderizarGridMultiplayer();
  mpEnviar("rematch-ready");
}

function sairDaBatalhaMultiplayer() {
  sairDaSalaMultiplayer();
  mostrarTela("tela-modos");
}

function tratarMensagemMultiplayer(msg) {
  switch (msg.tipo) {
    case "room-created":
      mpSalaId = msg.id;
      mpNivel = msg.nivel;
      mpTamanho = msg.tamanho;
      document.getElementById("mp-id-exibicao").textContent = mpSalaId;
      document.getElementById("mp-sala-config").textContent =
        `${mpNivel} Nv. · ${mpTamanho}×${mpTamanho}`;
      mpStatus("mp-sala-status", "Aguardando o outro jogador...");
      break;

    case "room-joined":
      mpSalaId = msg.id;
      mpPapel = "guest";
      mpNivel = msg.nivel;
      mpTamanho = msg.tamanho;
      document.getElementById("mp-procurar-painel").hidden = true;
      document.getElementById("mp-sala-painel").hidden = false;
      document.getElementById("mp-id-exibicao").textContent = msg.id;
      document.getElementById("mp-sala-config").textContent =
        `${mpNivel} Nv. · ${mpTamanho}×${mpTamanho}`;
      mpStatus("mp-sala-status", "Sala encontrada! Preparando a seleção...");
      break;

    case "room-ready":
      mpNivel = msg.nivel;
      mpTamanho = msg.tamanho;
      mpStatus("mp-sala-status", "Jogador encontrado! Escolha seu time.");
      iniciarSelecaoMultiplayer();
      break;

    case "player-status":
      if (msg.ready) mpStatus("mp-selecao-status", "O outro jogador já escolheu o time. Aguarde...");
      break;

    case "battle-start":
      iniciarBatalhaMultiplayer(msg.hostTeam, msg.guestTeam);
      break;

    case "rematch-ready":
      mpStatus("mp-selecao-status", "O adversário também aceitou a revanche! Escolha seu time.");
      break;

    case "rematch-waiting":
      mpStatus("mp-selecao-status", "Time enviado. Aguardando o adversário aceitar a revanche...");
      break;

    case "battle-state":
      aplicarEstadoMultiplayer(msg.estado);
      break;

    case "remote-action":
      receberAcaoMultiplayer(msg.acao);
      break;

    case "room-error":
      mpStatus("mp-procurar-status", msg.mensagem || "Sala não encontrada.");
      mpStatus("mp-criar-status", msg.mensagem || "Não foi possível criar a sala.");
      break;

    case "opponent-left":
      alert("O outro jogador saiu da sala.");
      mostrarTela("tela-multiplayer");
      prepararTelaMultiplayer();
      break;

    case "server-error":
      console.error("[NEXORIA] Multiplayer:", msg.mensagem);
      break;
  }
}

function iniciarBatalhaMultiplayer(hostTeam, guestTeam) {
  const souHost = mpPapel === "host";
  const meuTime = souHost ? hostTeam : guestTeam;
  const rivalTime = souHost ? guestTeam : hostTeam;

  contextoBatalhaAtual = "multiplayer";
  mpTimeEscolhido = [];
  document.getElementById("mp-selecao-painel").hidden = true;
  mostrarTela("tela-batalha");
  iniciarBatalha(meuTime, rivalTime, true, souHost);
}

function enviarAcaoMultiplayer(acao) {
  mpEnviar("battle-action", { acao });
}

function informarAcaoMultiplayerLocal(acao) {
  if (!estadoBatalha || estadoBatalha.terminou) return;

  if (mpPapel === "guest") {
    enviarAcaoMultiplayer(acao);
    return;
  }

  // O host é o árbitro: guarda sua ação até receber a do convidado.
  if (!estadoBatalha.multiplayerAcoes) estadoBatalha.multiplayerAcoes = {};
  estadoBatalha.multiplayerAcoes.host = acao;
  tentarResolverTurnoMultiplayer();
}

function receberAcaoMultiplayer(acao) {
  if (!estadoBatalha || mpPapel !== "host" || estadoBatalha.terminou) return;

  if (acao.tipo === "troca-forcada") {
    if (!estadoBatalha.aguardandoTrocaOponente) return;
    trocarAtivo("oponente", acao.indice);
    estadoBatalha.aguardandoTrocaOponente = false;
    renderizarBatalha();
    if (mpSocket && mpSocket.readyState === WebSocket.OPEN) {
      mpEnviar("battle-state", { estado: estadoBatalha });
    }
    return;
  }

  if (!estadoBatalha.multiplayerAcoes) estadoBatalha.multiplayerAcoes = {};
  estadoBatalha.multiplayerAcoes.guest = acao;
  tentarResolverTurnoMultiplayer();
}

function tentarResolverTurnoMultiplayer() {
  if (!estadoBatalha || mpPapel !== "host" || estadoBatalha.terminou) return;
  const acoes = estadoBatalha.multiplayerAcoes || {};
  if (!acoes.host || !acoes.guest) {
    renderizarBatalha();
    return;
  }

  const hostAction = acoes.host;
  const guestAction = acoes.guest;
  estadoBatalha.multiplayerAcoes = {};
  processarTurno(hostAction, guestAction);
  if (mpSocket && mpSocket.readyState === WebSocket.OPEN) {
    mpEnviar("battle-state", { estado: estadoBatalha });
  }
}

function aplicarEstadoMultiplayer(estado) {
  if (mpPapel !== "guest") return;

  // O host manda o estado sempre da perspectiva dele (timeJogador = time do host).
  // Pro convidado, precisa inverter: o time do host é o "oponente" na tela dele.
  estadoBatalha = {
    ...estado,
    timeJogador: estado.timeOponente,
    timeOponente: estado.timeJogador,
    ativoJogador: estado.ativoOponente,
    ativoOponente: estado.ativoJogador,
    aguardandoTrocaJogador: !!estado.aguardandoTrocaOponente,
    aguardandoTrocaOponente: !!estado.aguardandoTrocaJogador,
    vencedor:
      estado.vencedor === "jogador" ? "oponente" : estado.vencedor === "oponente" ? "jogador" : estado.vencedor,
    multiplayerAcoes: {},
  };
  renderizarBatalha();
}

document.addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-mp-tamanho]");
  if (!alvo || alvo.disabled) return;
  criarSalaMultiplayer(Number(alvo.dataset.mpTamanho));
});

document.addEventListener("nexoria:tela-mudou", (e) => {
  if (e.detail.tela === "tela-multiplayer") prepararTelaMultiplayer();
});
