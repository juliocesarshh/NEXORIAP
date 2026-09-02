// ---------- Estado da Run ----------
// Isso é o "cérebro" do Modo Roguelike: o que existe durante uma tentativa.
// Zera toda vez que uma nova run começa.

let estadoRun = null;

function novaRun() {
  return {
    time: [], // até 6 monstros
    mochila: [], // códigos B001, B002...
    itensEquipados: [],
    badges: [], // ginásios vencidos (ainda não implementado)
  };
}

// ---------- Cálculo de status por nível ----------
// Fórmula real de Pokémon, simplificada (sem IV/EV — pode virar profundidade futura).
function calcularStatus(base, nivel) {
  const s = base.statusBase;
  const porNivel = (valorBase) => Math.floor((2 * valorBase * nivel) / 100) + 5;

  return {
    hpMax: Math.floor((2 * s.hp * nivel) / 100) + nivel + 10,
    ataque: porNivel(s.ataque),
    defesa: porNivel(s.defesa),
    ataqueEspecial: porNivel(s.ataqueEspecial),
    defesaEspecial: porNivel(s.defesaEspecial),
    velocidade: porNivel(s.velocidade),
  };
}

const NIVEL_MAXIMO = 105;

// O jogador pode conhecer muitos golpes, mas batalha sempre com no máximo 4.
// Priorizamos STAB, golpe assinatura, poder e variedade física/especial.
function selecionarQuatroGolpes(codigos, base) {
  const unicos=[...new Set((codigos||[]).filter(Boolean))];
  if(unicos.length<=4) return unicos;
  const tipos=String(base?.tipo||"").split("/").map(x=>x.trim());
  const dados=unicos.map((codigo,ordem)=>{
    const g=typeof buscarGolpe==="function"?buscarGolpe(codigo):null;
    if(!g) return {codigo,score:-999,ordem};
    const stab=tipos.includes(String(g.tipo||"").trim())?35:0;
    const poder=Number(g.poder)||0;
    const variedade=g.categoria==="Especial"?8:g.categoria==="Físico"?6:4;
    const assinatura=base?.golpeAssinatura===codigo?50:0;
    return {codigo,score:assinatura+stab+poder+variedade,ordem};
  });
  const escolhidos=[];
  for(const cat of ["Físico","Especial"]){
    const x=dados.filter(d=>{const g=typeof buscarGolpe==="function"?buscarGolpe(d.codigo):null; return g?.categoria===cat;}).sort((a,b)=>b.score-a.score||b.ordem-a.ordem)[0];
    if(x) escolhidos.push(x);
  }
  dados.sort((a,b)=>b.score-a.score||b.ordem-a.ordem);
  for(const x of dados){if(escolhidos.length>=4)break;if(!escolhidos.some(y=>y.codigo===x.codigo))escolhidos.push(x);}
  return escolhidos.slice(0,4).map(x=>x.codigo);
}
window.selecionarQuatroGolpes=selecionarQuatroGolpes;

// Evolução automática por nível. Quando o arquivo de dados não informa um
// nível específico, usamos a progressão padrão da NEXORIA: primeira evolução
// no Lv.20 e segunda/final no Lv.40. Evoluções alternativas (ex.: Cabrito)
// continuam sendo sorteadas entre as formas possíveis.
const NIVEL_EVOLUCAO_PADRAO_PRIMEIRA = 20;
const NIVEL_EVOLUCAO_PADRAO_SEGUNDA = 40;

function numeroProximaEvolucaoPorNivel(base, nivel) {
  const evo = base?.evolucao || {};
  if (Array.isArray(evo.evolucoesPossiveis) && evo.evolucoesPossiveis.length) {
    const nivelEvo = Number(base.levelevo) || NIVEL_EVOLUCAO_PADRAO_PRIMEIRA;
    return nivel >= nivelEvo ? evo.evolucoesPossiveis[Math.floor(Math.random() * evo.evolucoesPossiveis.length)] : null;
  }
  if (!evo.evoluiPara) return null;
  const nivelEvo = Number(base.levelevo) || (evo.evoluiDe ? NIVEL_EVOLUCAO_PADRAO_SEGUNDA : NIVEL_EVOLUCAO_PADRAO_PRIMEIRA);
  return nivel >= nivelEvo ? Number(evo.evoluiPara) : null;
}

function aplicarEvolucaoDeNivel(monstro) {
  const base = DADOS_MONSTROS.find((m) => m.numero === monstro.numero);
  if (!base) return false;
  const destinoNumero = numeroProximaEvolucaoPorNivel(base, monstro.nivel);
  if (!destinoNumero) return false;
  const destino = DADOS_MONSTROS.find((m) => m.numero === Number(destinoNumero));
  if (!destino) return false;

  const hpMaxAnterior = Number(monstro.status?.hpMax) || 0;
  const hpAnterior = Number.isFinite(Number(monstro.hpAtual)) ? Number(monstro.hpAtual) : hpMaxAnterior;
  const itemAnterior = monstro.item || null;

  monstro.numero = destino.numero;
  monstro.nome = destino.nome;
  monstro.tipo = destino.tipo;
  monstro.png = destino.png;
  monstro.habilidade = destino.habilidade || null;
  monstro.statusBase = destino.statusBase;
  monstro.golpesConhecidos = selecionarQuatroGolpes((destino.golpes || [])
    .filter((g) => g.nivel <= monstro.nivel)
    .map((g) => g.codigo), destino);
  monstro.item = itemAnterior;

  let status = calcularStatus(destino, monstro.nivel);
  if (typeof aplicarNatureza === "function" && monstro.natureza) aplicarNatureza(status, monstro.natureza);
  if (typeof aplicarMultiplicadoresItem === "function") status = aplicarMultiplicadoresItem(monstro, status);
  monstro.status = status;
  monstro.statusOriginal = { ...status };
  const ganhoHp = Math.max(0, status.hpMax - hpMaxAnterior);
  monstro.hpAtual = Math.max(0, Math.min(status.hpMax, Math.floor(hpAnterior + ganhoHp)));
  monstro.statusAlterado = null;

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexoria:monstro-evoluiu", {
      detail: { de: base, para: destino, monstro }
    }));
    // A evolução por nível também recebe a mesma apresentação visual das
    // evoluções por item: forma antiga → brilho/flash → forma nova.
    if (typeof animarEvolucao === "function") {
      animarEvolucao(monstro, base.png, destino.png, base.nome, destino.nome);
    }
  }
  console.log(`[NEXORIA] ${base.nome} evoluiu para ${destino.nome} no Lv.${monstro.nivel}`);
  return true;
}

function verificarEvolucaoPorNivel(monstro) {
  let evoluiu = false;
  // Permite mais de uma evolução quando o jogador sobe vários níveis de uma vez.
  for (let tentativas = 0; tentativas < 3; tentativas++) {
    if (!aplicarEvolucaoDeNivel(monstro)) break;
    evoluiu = true;
  }
  return evoluiu;
}

// Monta uma "instância de batalha" de um monstro: nível atual, status calculado,
// HP atual e quais golpes ele já sabe nesse nível.
function recalcularStatusDaInstancia(monstro) {
  const base = DADOS_MONSTROS.find((m) => m.numero === monstro.numero);
  if (!base) return;

  // HP é persistente entre batalhas: ao subir de nível ou equipar item,
  // preservamos o HP absoluto em que o monstro terminou, apenas limitando
  // ao novo HP máximo. Não convertemos para porcentagem.
  const hpAnterior = Number.isFinite(Number(monstro.hpAtual)) ? Number(monstro.hpAtual) : 0;
  let status = calcularStatus(base, monstro.nivel);
  if (typeof aplicarNatureza === "function" && monstro.natureza) aplicarNatureza(status, monstro.natureza);
  if (typeof aplicarMultiplicadoresItem === "function") status = aplicarMultiplicadoresItem(monstro, status);
  monstro.status = status;
  monstro.statusOriginal = { ...status };
  monstro.hpAtual = Math.max(0, Math.min(status.hpMax, Math.floor(hpAnterior)));
}

// Prepara o time para uma NOVA batalha do Roguelike.
// Mantém exatamente o HP restante da batalha anterior, mas remove tudo que
// pertence apenas àquela batalha: buffs/nerfs, status alterados, contadores
// de habilidades e transformações temporárias (BattleForm/Boto Rosa).
function prepararTimeParaNovaBatalha() {
  if (!estadoRun?.time) return;

  estadoRun.time.forEach((monstro) => {
    const hpPersistente = Number.isFinite(Number(monstro.hpAtual)) ? Number(monstro.hpAtual) : 0;
    const base = DADOS_MONSTROS.find((m) => m.numero === monstro.numero);
    if (!base) return;

    // Restaura identidade original para evitar que uma transformação de uma
    // batalha contamine a próxima.
    monstro.nome = base.nome;
    monstro.tipo = base.tipo;
    monstro.png = base.png;
    monstro.habilidade = base.habilidade || null;
    monstro.statusBase = base.statusBase;
    monstro.golpesConhecidos = selecionarQuatroGolpes((base.golpes || [])
      .filter((g) => g.nivel <= monstro.nivel).map((g) => g.codigo), base);

    let status = calcularStatus(base, monstro.nivel);
    if (typeof aplicarNatureza === "function" && monstro.natureza) aplicarNatureza(status, monstro.natureza);
    if (typeof aplicarMultiplicadoresItem === "function") {
      status = aplicarMultiplicadoresItem(monstro, status);
    }
    monstro.status = status;
    monstro.statusOriginal = { ...status };
    monstro.hpAtual = Math.max(0, Math.min(status.hpMax, Math.floor(hpPersistente)));

    // Efeitos temporários de batalha.
    monstro.statusAlterado = null;
    delete monstro._starPlatinum;
    delete monstro._despertou;
    delete monstro._vidasUsadas;
    delete monstro._estadoLunar;
    delete monstro._turnosInvencivel;
    delete monstro._invencivelAtivado;
    delete monstro._itemAgamotoUsado;
    delete monstro._lastDanceUsado;
    delete monstro._battleForm;
    delete monstro._contraAtaqueNocaute;
    delete monstro._brechaNocaute;
    delete monstro.formaAnterior;
    delete monstro.formaAnteriorNome;
  });
}

function criarInstanciaMonstro(numero, nivel, natureza = null) {
  const base = DADOS_MONSTROS.find((m) => m.numero === numero);
  if (!base) return null;

  const nivelFinal = Math.max(1, Math.min(NIVEL_MAXIMO, nivel));
  const naturezaFinal = natureza || (typeof naturezaAleatoria === "function" ? naturezaAleatoria().id : null);

  const golpesConhecidos = selecionarQuatroGolpes((base.golpes || [])
    .filter((g) => g.nivel <= nivelFinal).map((g) => g.codigo), base);

  let status = calcularStatus(base, nivelFinal);
  if (typeof aplicarNatureza === "function") aplicarNatureza(status, naturezaFinal);

  const instancia = {
    numero: base.numero,
    nome: base.nome,
    tipo: base.tipo,
    png: base.png,
    habilidade: base.habilidade || null,
    item: base.item || null,
    nivel: nivelFinal,
    natureza: naturezaFinal,
    statusBase: base.statusBase,
    status,
    statusOriginal: { ...status },
    hpAtual: status.hpMax,
    statusAlterado: null,
    golpesConhecidos,
  };
  if (typeof aplicarMultiplicadoresItem === "function") {
    instancia.status = aplicarMultiplicadoresItem(instancia, instancia.status);
    instancia.statusOriginal = { ...instancia.status };
    instancia.hpAtual = instancia.status.hpMax;
  }

  // Se um monstro for criado/capturado já em um nível alto, ele não fica preso
  // na forma inicial. Aplica todas as evoluções que já deveriam ter ocorrido.
  if (typeof verificarEvolucaoPorNivel === "function") {
    verificarEvolucaoPorNivel(instancia);
  }
  return instancia;
}

const NIVEL_INICIAL_STARTER = 5;
const TAMANHO_MAX_TIME_ROGUELIKE = 6;

// Estágio evolutivo: 1 = primeira forma, 2 = forma do meio, 3 = forma final.
function estagioEvolucao(m) {
  const evo = m.evolucao || {};
  if (!evo.evoluiDe) return 1;
  if (!evo.evoluiPara) return 3;
  return 2;
}

// Evoluções alternativas podem ser definidas como uma lista (ex: Cabrito).
// A escolha fica disponível pra quando o sistema de evolução usar isso.
function escolherEvolucaoAleatoria(base) {
  const evo = base && base.evolucao;
  if (!evo) return null;
  if (Array.isArray(evo.evolucoesPossiveis) && evo.evolucoesPossiveis.length) {
    return evo.evolucoesPossiveis[Math.floor(Math.random() * evo.evolucoesPossiveis.length)];
  }
  return evo.evoluiPara || null;
}

// Pool de monstros selvagens disponível agora: só "Comum", e o estágio evolutivo
// máximo cresce conforme o time sobe de nível (nada de monstro na forma final
// aparecendo logo nos primeiros Matinhos).
function poolSelvagemAtual() {
  const nivelMedioTime = Math.round(
    estadoRun.time.reduce((soma, m) => soma + m.nivel, 0) / estadoRun.time.length
  );
  const estagioMaximo = nivelMedioTime < 20 ? 1 : nivelMedioTime < 40 ? 2 : 3;
  const pool = DADOS_MONSTROS.filter(
    (m) => m.raridade === "Comum" && estagioEvolucao(m) <= estagioMaximo
  );
  return { nivelMedioTime, pool };
}

// Gera um monstro selvagem em nível parecido com o do seu time (variação de -2 a +2),
// só entre os de raridade "Comum" — lendários/míticos nunca aparecem como encontro comum.
function gerarMonstroSelvagem() {
  const { nivelMedioTime, pool } = poolSelvagemAtual();
  const variacao = Math.floor(Math.random() * 5) - 2; // -2 a +2
  const nivelSelvagem = Math.max(1, Math.min(NIVEL_MAXIMO, nivelMedioTime + variacao));
  const escolhido = pool[Math.floor(Math.random() * pool.length)];
  return criarInstanciaMonstro(escolhido.numero, nivelSelvagem);
}

function gerarCandidatosCaptura(quantidade) {
  const candidatos = [];
  for (let i = 0; i < quantidade; i++) candidatos.push(gerarMonstroSelvagem());
  return candidatos;
}

// Encontro com nível controlado pela Parte/Rota do mapa.
function gerarMonstroSelvagemNivel(nivelMin, nivelMax) {
  const poolBase = DADOS_MONSTROS.filter((m) => m.raridade === "Comum");
  const pool = poolBase.length ? poolBase : DADOS_MONSTROS;
  const min = Math.max(1, Number(nivelMin) || 1);
  const max = Math.max(min, Number(nivelMax) || min);
  const nivel = Math.floor(Math.random() * (max - min + 1)) + min;
  const escolhido = pool[Math.floor(Math.random() * pool.length)];
  return criarInstanciaMonstro(escolhido.numero, nivel);
}

function iniciarRunComStarter(numero) {
  estadoRun = novaRun();
  mapaAtual = null; // garante mapa novo a cada run
  const inicial = criarInstanciaMonstro(numero, NIVEL_INICIAL_STARTER);
  estadoRun.time.push(inicial);
  console.log("[NEXORIA] Run iniciada:", estadoRun);
  mostrarConfirmacaoStarter(inicial);
}

// ---------- Tela: Seleção de Starter ----------

function renderizarSelecaoStarters() {
  const grid = document.getElementById("grade-starters");
  const confirmacao = document.getElementById("confirmacao-starter");
  confirmacao.hidden = true;
  grid.hidden = false;
  grid.innerHTML = "";

  const MAX_BARRA_STAT = 150;

  (window.STARTERS_NUMEROS || []).forEach((numero) => {
    const m = DADOS_MONSTROS.find((x) => x.numero === numero);
    if (!m) return;

    const instancia = criarInstanciaMonstro(numero, NIVEL_INICIAL_STARTER);
    const s = instancia.status;

    const imgHtml = m.png
      ? `<img class="starter-imagem" src="PNG/${m.png}" alt="${m.nome}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'starter-imagem starter-imagem-vazia',textContent:'?'}))">`
      : `<div class="starter-imagem starter-imagem-vazia">?</div>`;

    const badgesTipo = m.tipo
      .split("/")
      .map((t) => criarBadgeTipo(t.trim()))
      .join("");

    const linhasStat = [
      ["SP.A", s.ataqueEspecial],
      ["SPE", s.velocidade],
      ["HP", s.hpMax],
      ["DEF", s.defesa],
      ["SP.D", s.defesaEspecial],
    ]
      .map(
        ([label, valor]) => `
        <div class="linha-stat">
          <span class="stat-label">${label}</span>
          <div class="barra-stat"><div class="barra-stat-preench" style="width:${Math.min(100, (valor / MAX_BARRA_STAT) * 100)}%"></div></div>
        </div>`
      )
      .join("");

    const primeiroGolpe = instancia.golpesConhecidos[0] ? buscarGolpe(instancia.golpesConhecidos[0]) : null;
    const golpeHtml = primeiroGolpe
      ? `
      <div class="golpe-preview">
        <div class="golpe-preview-nome">${primeiroGolpe.nome}</div>
        <div class="golpe-preview-badges">
          <span class="badge-categoria">${primeiroGolpe.categoria.toUpperCase()}</span>
          ${criarBadgeTipo(primeiroGolpe.tipo)}
        </div>
        <div class="golpe-preview-poder">${primeiroGolpe.poder} PWR</div>
      </div>`
      : "";

    const card = document.createElement("button");
    card.className = "card-starter";
    card.type = "button";

    card.innerHTML = `
      ${imgHtml}
      <span class="starter-nome">${m.nome}</span>
      <span class="starter-nivel">Lv. ${instancia.nivel}</span>
      <div class="starter-tipos">${badgesTipo}</div>
      <div class="stats-starter">${linhasStat}</div>
      <div class="barra-hp"><div class="hp-fundo"><div class="hp-preenchimento" style="width:100%"></div></div></div>
      <span class="starter-hp-texto">${instancia.hpAtual}/${s.hpMax}</span>
      ${golpeHtml}
    `;
    card.addEventListener("click", () => iniciarRunComStarter(m.numero));
    grid.appendChild(card);
  });
}

function mostrarConfirmacaoStarter(inicial) {
  const grid = document.getElementById("grade-starters");
  const confirmacao = document.getElementById("confirmacao-starter");
  grid.hidden = true;

  const imgHtml = inicial.png
    ? `<img class="starter-imagem" src="PNG/${inicial.png}" alt="${inicial.nome}">`
    : `<div class="starter-imagem starter-imagem-vazia">?</div>`;

  confirmacao.innerHTML = `
    ${imgHtml}
    <p>Você escolheu <strong>${inicial.nome}</strong> (nível ${inicial.nivel})!</p>
    <button class="botao botao-play" type="button" data-acao="ir-para-mapa">
      <span>Continuar</span>
    </button>
  `;
  confirmacao.hidden = false;
}

async function iniciarTelaSelecaoStarter() {
  try {
    await carregarDadosComRetentativas();
  } catch (erro) {
    console.error(erro);
    document.getElementById("grade-starters").innerHTML =
      '<p class="vazio">Não consegui carregar os dados (veja o console).</p>';
    return;
  }
  renderizarSelecaoStarters();
}

document.addEventListener("nexoria:tela-mudou", (e) => {
  if (e.detail.tela === "tela-selecao-starter") iniciarTelaSelecaoStarter();
});
