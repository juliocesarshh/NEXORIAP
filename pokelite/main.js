// Controlador central da SPA: decide qual tela fica visível.
// Nenhuma outra tela deve navegar sozinha — tudo passa por aqui.

const TELAS = [
  "tela-inicial",
  "tela-modos",
  "tela-multiplayer",
  "tela-monsterpedia",
  "tela-selecao-starter",
  "tela-mapa",
  "tela-tamanho-time",
  "tela-dificuldade",
  "tela-selecao-pratica",
  "tela-gerenciamento-time",
  "tela-batalha",
];

const FUNDO_NOITE = "img/bg-nexoria.jpg";
const FUNDO_DIA = "img/campo-modos.png";

function mostrarTela(id) {
  TELAS.forEach((t) => {
    document.getElementById(t).hidden = t !== id;
  });

  const imgFundo = document.getElementById("fundo-jogo-img");
  imgFundo.src = id === "tela-inicial" ? FUNDO_NOITE : FUNDO_DIA;

  document.dispatchEvent(new CustomEvent("nexoria:tela-mudou", { detail: { tela: id } }));
}

document.addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-acao]");
  if (!alvo || alvo.disabled) return;
  const acao = alvo.dataset.acao;

  switch (acao) {
    case "play":
      mostrarTela("tela-modos");
      break;

    case "abrir-monsterpedia":
      mostrarTela("tela-monsterpedia");
      break;

    case "voltar-inicial":
      e.preventDefault();
      mostrarTela("tela-inicial");
      break;

    case "voltar-modos":
      e.preventDefault();
      mostrarTela("tela-modos");
      break;

    case "voltar-mapa":
      e.preventDefault();
      mostrarTela("tela-mapa");
      if (typeof renderizarMapa === "function") renderizarMapa();
      break;

    case "config":
      abrirModalConfig();
      break;

    case "conquistas":
      abrirConquistas();
      break;

    case "mudo":
      alternarMudoUI();
      break;

    case "modo-roguelike":
      nexoriaModoDificuldade = "roguelike"; mostrarTela("tela-dificuldade");
      break;

    case "ir-para-mapa":
      mostrarTela("tela-mapa");
      break;

    case "roguelike-continuar":
      if (ultimoVencedorRoguelike === "jogador") {
        if (recompensaNivelPendente > 0) {
          subirNivelTime(recompensaNivelPendente);
          recompensaNivelPendente = 0;
        }
        if (lutandoContraGinasio) {
          if (typeof desbloquearConquista === "function") { desbloquearConquista("primeiro-ginasio"); if ((estadoRun.badges||[]).length >= 5) desbloquearConquista("cinco-ginasios"); }
          ginasioConcluido = true;
          lutandoContraGinasio = false;

          // Vencer um Ginásio marca a transição para a próxima Parte.
          // Ao entrar nela, todo o time deve começar com HP completo.
          if (typeof restaurarTimeCompleto === "function") restaurarTimeCompleto();
          if (typeof estadoRun !== "undefined" && Array.isArray(estadoRun.time)) estadoRun.time.forEach((m) => { delete m._bonusEvento; });

          if (typeof estadoRun !== "undefined" && Array.isArray(estadoRun.badges) && ginasioAtualIndex >= 0) {
            if (!estadoRun.badges.includes(ginasioAtualIndex + 1)) estadoRun.badges.push(ginasioAtualIndex + 1);
          }
          ginasioAtualIndex = -1;
        }
        if (typeof chefaoAtual !== "undefined" && chefaoAtual) {
          if (typeof desbloquearConquista === "function") desbloquearConquista("campeao");
          chefaoAtual = false;
          mostrarMensagemMapa("🏆 EVERTON DERROTADO! VOCÊ CONQUISTOU NEXORIA! 🔥");
          document.getElementById("modal-final-roguelike")?.removeAttribute("hidden");
        }
        mostrarTela("tela-mapa");
      } else {
        lutandoContraGinasio = false;
        mostrarTela("tela-modos"); // derrota: por enquanto só encerra a run
      }
      break;

    case "loja":
      console.log("[NEXORIA] Loja ainda não implementada.");
      break;

    case "final-voltar-modos":
      document.getElementById("modal-final-roguelike")?.setAttribute("hidden", "");
      mostrarTela("tela-modos");
      break;

    case "hospital":
      estadoRun._usouHospital = true;
      estadoRun.time.forEach((m) => {
        m.hpAtual = m.status.hpMax;
        m.statusAlterado = null;
      });
      mostrarMensagemMapa("Todo o time foi curado no Centro de Recuperação!");
      break;

    case "modo-multiplayer":
      mostrarTela("tela-multiplayer");
      prepararTelaMultiplayer();
      break;

    case "mp-criar":
      abrirPainelCriarSala();
      break;

    case "mp-procurar":
      abrirPainelProcurarSala();
      break;

    case "mp-voltar-menu":
      mostrarMenuMultiplayer();
      break;

    case "mp-entrar":
      entrarNaSalaMultiplayer();
      break;

    case "mp-sair-sala":
      sairDaSalaMultiplayer();
      break;

    case "mp-revanche":
      solicitarRevancheMultiplayer();
      break;

    case "mp-sair-batalha":
      sairDaBatalhaMultiplayer();
      break;

    case "abrir-menu-time":
      abrirMenuTime();
      break;

    case "modo-pratica":
      nexoriaModoDificuldade = "pratica"; mostrarTela("tela-dificuldade");
      break;

    case "pratica-de-novo":
      mostrarTela("tela-tamanho-time");
      break;
    case "confirmar-gerenciamento-time":
      confirmarGerenciamentoTime();
      break;
  }
});

let nexoriaModoDificuldade = "roguelike";
document.addEventListener("click", (e)=>{
  const b=e.target.closest("[data-dificuldade]"); if(!b)return;
  window.NEXORIA_DIFICULDADE=b.dataset.dificuldade;
  if(nexoriaModoDificuldade==="roguelike") mostrarTela("tela-selecao-starter");
  else mostrarTela("tela-tamanho-time");
});
// Tela inicial ao carregar o jogo
mostrarTela("tela-inicial");
