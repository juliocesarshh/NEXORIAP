// ---------- Tipos de nó ----------
const TIPOS_NO = {
  captura: { nome: "Capturar", icone: "🔴" },
  capturaRara: { nome: "Capturar Raro", icone: "🟣" },
  matinho: { nome: "Matinho", icone: "🌿" },
  itens: { nome: "Itens", icone: "🎒" },
  treinador: { nome: "Treinador", icone: "🧑" },
  casinha: { nome: "Casinha", icone: "🏠" },
  evento: { nome: "Evento", icone: "❓" },
  loja: { nome: "Loja", icone: "🏪" },
  hospital: { nome: "Hospital", icone: "🏥" },
  ginasio: { nome: "Ginásio", icone: "🏆" },
  chefao: { nome: "CHEFÃO", icone: "💀" },
};

// Cada Parte possui 7 linhas de exploração e, nas Partes 1–8, um Ginásio.
// A Parte 9 é o trecho final: somente Treinadores e, no fim, Everton.
const QUANTIDADE_LINHAS = [2, 3, 4, 4, 3, 4, 3];

// Cada Parte possui exatamente 7 linhas de exploração e, nas Partes 1–8,
// um Ginásio no final. A Parte 9 possui 7 linhas somente de Treinadores e
// termina no Chefão.
const PARTES_ROGUELIKE = [
  { parte: 1, nome: "Parte 1", niveis: [[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11]], tipoFim: "ginasio", lider: 0 },
  { parte: 2, nome: "Parte 2", niveis: [[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18]], tipoFim: "ginasio", lider: 1 },
  { parte: 3, nome: "Parte 3", niveis: [[18,19],[19,20],[20,21],[21,22],[22,23],[23,24],[24,25]], tipoFim: "ginasio", lider: 2 },
  { parte: 4, nome: "Parte 4", niveis: [[25,26],[26,27],[27,28],[28,29],[29,30],[30,31],[31,32]], tipoFim: "ginasio", lider: 3 },
  { parte: 5, nome: "Parte 5", niveis: [[32,33],[33,34],[34,35],[35,36],[36,37],[37,38],[38,39]], tipoFim: "ginasio", lider: 4 },
  { parte: 6, nome: "Parte 6", niveis: [[39,40],[40,41],[41,42],[42,43],[43,44],[44,45],[45,46]], tipoFim: "ginasio", lider: 5 },
  { parte: 7, nome: "Parte 7", niveis: [[46,47],[47,48],[48,49],[49,50],[50,51],[51,52],[52,53]], tipoFim: "ginasio", lider: 6 },
  { parte: 8, nome: "Parte 8", niveis: [[53,54],[54,55],[55,56],[56,57],[57,58],[58,59],[59,60]], tipoFim: "ginasio", lider: 7 },
  { parte: 9, nome: "Parte 9 — Caminho Final", niveis: [[63,64],[64,65],[65,66],[66,67],[67,68],[68,69],[69,70]], tipoFim: "chefao" },
];

const PESOS_TIPO = [
  ["captura", 23], ["matinho", 27], ["itens", 14], ["treinador", 16],
  ["casinha", 8], ["evento", 11], ["capturaRara", 1],
];

function sortearTipoNo() {
  const total = PESOS_TIPO.reduce((soma, [, peso]) => soma + peso, 0);
  let r = Math.random() * total;
  for (const [tipo, peso] of PESOS_TIPO) { if (r < peso) return tipo; r -= peso; }
  return "matinho";
}

function gerarMapaRun() {
  const camadas = [];

  PARTES_ROGUELIKE.forEach((parte) => {
    parte.niveis.forEach((faixaNivel, linhaIndex) => {
      const quantidade = QUANTIDADE_LINHAS[linhaIndex];
      const camada = [];
      for (let j = 0; j < quantidade; j++) {
        let tipo;
        // Primeira linha da Parte 1: exatamente Pokébola + Matinho.
        if (parte.parte === 1 && linhaIndex === 0) {
          tipo = j === 0 ? "captura" : "matinho";
        } else if (parte.parte === 9) {
          // Parte 9: somente Treinadores; sem loja/hospital.
          tipo = "treinador";
        } else {
          tipo = sortearTipoNo();
        }
        camada.push({
          id: `p${parte.parte}l${linhaIndex}n${j}`,
          tipo,
          rota: linhaIndex + 1,
          linha: linhaIndex + 1,
          parte: parte.parte,
          nivelMin: faixaNivel[0],
          nivelMax: faixaNivel[1],
        });
      }
      camadas.push(camada);
    });

    // Após as 7 linhas, Loja e Hospital ficam lado a lado na MESMA linha.
    // Assim o jogador escolhe um ou outro caminho antes do Ginásio.
    if (parte.parte !== 9) {
      const nivelPrep = parte.niveis[6];
      camadas.push([
        {
          id: `p${parte.parte}loja`,
          tipo: "loja",
          parte: parte.parte,
          nivelMin: nivelPrep[0],
          nivelMax: nivelPrep[1],
        },
        {
          id: `p${parte.parte}hospital`,
          tipo: "hospital",
          parte: parte.parte,
          nivelMin: nivelPrep[0],
          nivelMax: nivelPrep[1],
        },
      ]);
    }

    camadas.push([{
      id: `p${parte.parte}fim`,
      tipo: parte.tipoFim,
      rota: 8,
      linha: 8,
      parte: parte.parte,
      liderIndex: parte.lider,
      chefao: parte.parte === 9,
      nivelMin: parte.niveis[6][0],
      nivelMax: parte.niveis[6][1],
    }]);
  });

  ligarCamadas(camadas);
  return camadas;
}

// Liga cada linha à seguinte, mantendo caminhos possíveis até o endpoint.
function ligarCamadas(camadas) {
  for (let i = 0; i < camadas.length - 1; i++) {
    const atual = camadas[i], proxima = camadas[i + 1];
    atual.forEach((no, idx) => {
      if (proxima.length === 1) {
        no.ligacoes = [proxima[0].id];
        return;
      }
      const pos = Math.round((idx / Math.max(atual.length - 1, 1)) * (proxima.length - 1));
      no.ligacoes = [...new Set([pos - 1, pos, pos + 1]
        .filter((k) => k >= 0 && k < proxima.length)
        .map((k) => proxima[k].id))];
    });
    proxima.forEach((destino) => {
      if (atual.some((origem) => (origem.ligacoes || []).includes(destino.id))) return;
      let melhor = 0, distancia = Infinity;
      atual.forEach((origem, idx) => {
        const d = Math.abs(idx / Math.max(atual.length - 1, 1) - proxima.indexOf(destino) / Math.max(proxima.length - 1, 1));
        if (d < distancia) { distancia = d; melhor = idx; }
      });
      atual[melhor].ligacoes = [...new Set([...(atual[melhor].ligacoes || []), destino.id])];
    });
  }
  return camadas;
}

// ---------- Progresso do jogador no mapa ----------
let mapaAtual = null;
let camadaAtualIndex = -1; // -1 = ainda não escolheu nada (está na "entrada")
let noAtualId = null;
let ginasioConcluido = false;
let lutandoContraGinasio = false;
let ginasioAtualIndex = -1;
let chefaoAtual = false;
let recompensaNivelPendente = 0; // níveis ganhos após vencer o encontro atual

function iniciarMapa() {
  mapaAtual = gerarMapaRun();
  camadaAtualIndex = -1;
  noAtualId = null;
  ginasioConcluido = false;
  lutandoContraGinasio = false;
  ginasioAtualIndex = -1;
  chefaoAtual = false;
  document.getElementById("painel-cidade").hidden = true;
  esconderMensagemMapa();
  renderizarMapa();
}

function encontrarNo(id) {
  for (const camada of mapaAtual) {
    const achado = camada.find((n) => n.id === id);
    if (achado) return achado;
  }
  return null;
}

function nosDisponiveis() {
  if (camadaAtualIndex === -1) return mapaAtual[0].map((n) => n.id);
  const atual = encontrarNo(noAtualId);
  return atual ? atual.ligacoes : [];
}

function escolherNo(id) {
  if (!nosDisponiveis().includes(id)) return; // não deixa pular nem voltar

  camadaAtualIndex += 1;
  noAtualId = id;
  const no = encontrarNo(id);
  aplicarEfeitoNo(no);
  renderizarMapa();
}

// ---------- Efeitos de cada tipo de nó ----------
function subirNivelTime(quantidade) {
  if (!estadoRun?.time) return;
  estadoRun.time.forEach((m) => {
    const hpMaxAnterior = Number(m.status?.hpMax) || 0;
    const hpAnterior = Number.isFinite(Number(m.hpAtual)) ? Number(m.hpAtual) : hpMaxAnterior;
    m.nivel = Math.min(NIVEL_MAXIMO, (Number(m.nivel)||1) + quantidade);
    const baseAntes = DADOS_MONSTROS.find((x) => x.numero === m.numero);
    if (baseAntes) {
      m.golpesConhecidos = selecionarQuatroGolpes((baseAntes.golpes || [])
        .filter((g) => g.nivel <= m.nivel).map((g) => g.codigo), baseAntes);
    }
    let evoluiu = false;
    if (typeof verificarEvolucaoPorNivel === "function") evoluiu = verificarEvolucaoPorNivel(m) || evoluiu;
    if (typeof recalcularStatusDaInstancia === "function") recalcularStatusDaInstancia(m);
    const ganhoHp = Math.max(0, (Number(m.status?.hpMax) || hpMaxAnterior) - hpMaxAnterior);
    m.hpAtual = Math.min(Number(m.status?.hpMax) || hpAnterior, hpAnterior + ganhoHp);
    m.statusAlterado = null;
    if (evoluiu) mostrarMensagemMapa(`✨ ${m.nome} evoluiu no nível ${m.nivel}!`);
  });
}

function miniaturaItem(item) {
  return item.png
    ? `<img class="thumb-item" src="Png-Itens/${item.png}" alt="${item.nome}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb-item thumb-item-vazia',textContent:'?'}))">`
    : `<div class="thumb-item thumb-item-vazia">?</div>`;
}

const POOL_ITENS = [
  "B004","B005","B006","B007","B008","B009","B010","B011","B012","B013",
  "B014","B015","B016","B017","B018","B019","B020","B021","B022","B023","B024","B025"
];
// Evento é realmente aleatório: pode virar treinador, captura, raro, matinho,
// item, cura ou simplesmente não acontecer nada.
const EVENTOS_ALEATORIOS = [
  { tipo: "nada", texto: "O evento não deu em nada... talvez na próxima." },
  { tipo: "treinador", texto: "Um treinador apareceu de repente!" },
  { tipo: "captura", texto: "Uma Pokébola misteriosa apareceu! Você pode capturar um monstro." },
  { tipo: "raro", texto: "Um monstro raro apareceu!" },
  { tipo: "matinho", texto: "O matinho começou a se mexer..." },
  { tipo: "itens", texto: "Você encontrou uma pequena bolsa de itens!" },
  { tipo: "cura", texto: "Uma energia restauradora envolveu seu time!" },
];

function sortearRaridadeCaptura(rara = false) {
  const pesos = rara
    ? [["Comum", 35], ["Raro", 35], ["Épico", 20], ["Mítico", 8], ["Lendário", 2]]
    : [["Comum", 75], ["Raro", 18], ["Épico", 5.5], ["Mítico", 1.4], ["Lendário", 0.1]];
  const total = pesos.reduce((s, [, p]) => s + p, 0);
  let r = Math.random() * total;
  for (const [raridade, peso] of pesos) {
    if (r < peso) return raridade;
    r -= peso;
  }
  return "Comum";
}

function gerarMonstroRaroNivel(nivelMin, nivelMax, forcarRaro = false) {
  const raridade = sortearRaridadeCaptura(forcarRaro);
  let pool = DADOS_MONSTROS.filter((m) => m.raridade === raridade);
  // "Inicial" não entra nas capturas do Roguelike; se uma categoria estiver
  // vazia por causa de uma atualização de dados, fazemos fallback seguro.
  if (!pool.length) pool = DADOS_MONSTROS.filter((m) => m.raridade === "Comum");
  if (!pool.length) pool = DADOS_MONSTROS;
  if (!pool.length) return null;

  const min = Math.max(1, Number(nivelMin) || 1);
  const max = Math.max(min, Number(nivelMax) || min);
  const nivel = Math.floor(Math.random() * (max - min + 1)) + min;
  const escolhido = pool[Math.floor(Math.random() * pool.length)];
  return escolhido ? criarInstanciaMonstro(escolhido.numero, nivel) : null;
}

function gerarCandidatoCapturaSeguro(nivelMin, nivelMax, rara = false) {
  return gerarMonstroRaroNivel(nivelMin, nivelMax, rara) || gerarMonstroSelvagemNivel(nivelMin, nivelMax);
}

function executarEventoAleatorio(no) {
  const evento = EVENTOS_ALEATORIOS[Math.floor(Math.random() * EVENTOS_ALEATORIOS.length)];
  mostrarMensagemMapa(evento.texto);

  switch (evento.tipo) {
    case "treinador": {
      const qtd = no.parte === 9 ? 3 : Math.min(2 + Math.floor((no.parte - 1) / 4), 3);
      const timeTreinador = Array.from({ length: qtd }, () => gerarMonstroSelvagemNivel(no.nivelMin, no.nivelMax));
      prepararTimeParaNovaBatalha();
      recompensaNivelPendente = no.parte === 9 ? 3 : 2;
      contextoBatalhaAtual = "roguelike";
      mostrarTela("tela-batalha");
      iniciarBatalha(estadoRun.time, timeTreinador, false, false, evento.texto);
      break;
    }
    case "captura":
      abrirEscolhaCaptura();
      break;
    case "raro": {
      if (estadoRun.time.length >= TAMANHO_MAX_TIME_ROGUELIKE) {
        mostrarMensagemMapa("O monstro raro apareceu, mas seu time está cheio.");
        break;
      }
      const raro = gerarMonstroRaroNivel(no.nivelMin, no.nivelMax, true);
      const modal = document.querySelector('[data-modal="captura"]');
      const lista = document.getElementById("opcoes-captura");
      lista.innerHTML = "";
      [raro, gerarMonstroRaroNivel(no.nivelMin, no.nivelMax, true), gerarCandidatoCapturaSeguro(no.nivelMin, no.nivelMax)].filter(Boolean).forEach((c) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "card-captura";
        const imgHtml = c.png ? `<img class="thumb" src="PNG/${c.png}" alt="${c.nome}">` : `<div class="thumb thumb-vazio">?</div>`;
        btn.innerHTML = `${imgHtml}<span class="nome-captura">${c.nome}</span><span class="nivel-captura">Nv.${c.nivel} · ${c.raridade || "Comum"}</span>`;
        btn.addEventListener("click", () => { estadoRun.time.push(c); modal.hidden = true; mostrarMensagemMapa(`${c.nome} se juntou ao seu time!`); });
        lista.appendChild(btn);
      });
      modal.hidden = false;
      break;
    }
    case "matinho": {
      const selvagem = gerarMonstroSelvagemNivel(no.nivelMin, no.nivelMax);
      prepararTimeParaNovaBatalha();
      recompensaNivelPendente = 1;
      contextoBatalhaAtual = "roguelike";
      mostrarTela("tela-batalha");
      iniciarBatalha(estadoRun.time, [selvagem], false, false, evento.texto);
      break;
    }
    case "itens":
      abrirEscolhaItens();
      break;
    case "cura":
      estadoRun.time.forEach((m) => { m.hpAtual = m.status.hpMax; m.statusAlterado = null; });
      break;
    case "nada":
    default:
      break;
  }
}

function aplicarEfeitoNo(no) {
  switch (no.tipo) {
    case "matinho":
    case "captura":
    case "capturaRara": {
      if (no.tipo === "captura") { abrirEscolhaCaptura(no); break; }
      if (no.tipo === "capturaRara") { abrirEscolhaCaptura(no); break; }
      const selvagem = gerarMonstroSelvagemNivel(no.nivelMin, no.nivelMax);
      prepararTimeParaNovaBatalha();
      recompensaNivelPendente = 1;
      contextoBatalhaAtual = "roguelike";
      mostrarTela("tela-batalha");
      iniciarBatalha(estadoRun.time, [selvagem]);
      break;
    }

    case "treinador": {
      const qtd = no.parte === 9 ? 3 : Math.min(2 + Math.floor((no.parte - 1) / 4), 3);
      const timeTreinador = Array.from({length: qtd}, () => gerarMonstroSelvagemNivel(no.nivelMin, no.nivelMax));
      prepararTimeParaNovaBatalha();
      recompensaNivelPendente = no.parte === 9 ? 3 : 2;
      contextoBatalhaAtual = "roguelike";
      mostrarTela("tela-batalha");
      iniciarBatalha(estadoRun.time, timeTreinador, false, false, no.parte === 9 ? "Um Treinador veterano bloqueia o caminho!" : "Um Treinador quer batalhar!");
      break;
    }

    case "casinha":
      subirNivelTime(3);
      mostrarMensagemMapa("Descanso na casinha! Todo o time ganhou +3 níveis de graça.");
      break;

    case "itens":
      abrirEscolhaItens();
      break;

    case "evento":
      executarEventoAleatorio(no);
      break;

    case "loja": {
      // Loja renovada: 9–12 opções aparecem de uma vez e o jogador pode
      // escolher exatamente 3 gratuitamente. O modal permanece aberto até
      // completar as três escolhas, tornando a Loja tão recompensadora quanto
      // o Hospital sem criar uma economia artificial.
      const opcoes = [...POOL_ITENS].sort(() => Math.random() - 0.5).slice(0, 10);
      const modal = document.querySelector('[data-modal="itens"]');
      const lista = document.getElementById("opcoes-itens");
      if (!modal || !lista) {
        mostrarMensagemMapa("A Loja está aberta, mas a interface de itens não foi encontrada.");
        break;
      }
      const escolhidos = new Set();
      const renderLoja = () => {
        lista.innerHTML = "";
        const titulo = document.getElementById("titulo-itens");
        if (titulo) titulo.textContent = `Loja — escolha 3 itens grátis (${escolhidos.size}/3)`;
        opcoes.forEach((codigo) => {
          const item = buscarItem(codigo);
          if (!item) return;
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `opcao-item ${escolhidos.has(codigo) ? "item-escolhido" : ""}`;
          btn.innerHTML = `${miniaturaItem(item)}<span class="texto-item"><strong>${item.codigo} · ${item.nome}</strong><span class="item-descricao">${item.descricao}</span></span>`;
          btn.addEventListener("click", () => {
            if (escolhidos.has(codigo)) {
              escolhidos.delete(codigo);
            } else {
              if (escolhidos.size >= 3) { mostrarMensagemMapa("Você já escolheu 3 itens."); return; }
              escolhidos.add(codigo);
            }
            if (escolhidos.size === 3) {
              estadoRun.mochila = estadoRun.mochila || [];
              escolhidos.forEach((c) => estadoRun.mochila.push(c));
              modal.hidden = true;
              if (titulo) titulo.textContent = "Escolha um item";
              mostrarMensagemMapa("🎒 Você recebeu 3 itens grátis da Loja!");
              return;
            }
            renderLoja();
          });
          lista.appendChild(btn);
        });
      };
      renderLoja();
      modal.hidden = false;
      break;
    }
    case "hospital":
      estadoRun.time.forEach((m) => {
        m.hpAtual = m.status.hpMax;
        m.statusAlterado = null;
      });
      mostrarMensagemMapa("Hospital: todo o time foi completamente curado!");
      break;

    case "ginasio": {
      const indice = Number.isInteger(no.liderIndex) ? no.liderIndex : 0;
      const lider = LIDERES_GINASIO[indice];
      const timeLider = gerarTimeLider(indice);
      if (!lider || !timeLider?.length) {
        mostrarMensagemMapa("Este Ginásio ainda não foi configurado.");
        break;
      }
      ginasioAtualIndex = indice;
      recompensaNivelPendente = 3; // vitória de Ginásio concede +3 níveis
      chefaoAtual = false;
      lutandoContraGinasio = true;
      contextoBatalhaAtual = "roguelike";
      mostrarTela("tela-batalha");
      iniciarBatalha(estadoRun.time, timeLider, false, false, `${lider.nome} — Ginásio de ${lider.especialidade} quer batalhar!`);
      break;
    }

    case "chefao": {
      const timeChefe = gerarTimeChefe();
      if (!timeChefe?.length) {
        mostrarMensagemMapa("Everton ainda não foi configurado.");
        break;
      }
      chefaoAtual = true;
      lutandoContraGinasio = false;
      contextoBatalhaAtual = "roguelike";
      mostrarTela("tela-batalha");
      iniciarBatalha(estadoRun.time, timeChefe, false, false, "EVERTON — O CHEFÃO FINAL entrou na batalha!");
      break;
    }
  }
}

function abrirEscolhaCaptura(no) {
  if (estadoRun.time.length >= TAMANHO_MAX_TIME_ROGUELIKE) {
    mostrarMensagemMapa(`Seu time já está cheio (${TAMANHO_MAX_TIME_ROGUELIKE} monstros) — não dá pra capturar mais por enquanto.`);
    return;
  }

  const eRara = no && no.tipo === "capturaRara";
  const nivelMin = no?.nivelMin ?? (estadoRun.time.length ? Math.min(...estadoRun.time.map((m) => m.nivel)) : 1);
  const nivelMax = no?.nivelMax ?? (estadoRun.time.length ? Math.max(...estadoRun.time.map((m) => m.nivel)) : 1);
  const candidatos = Array.from({ length: 3 }, () => gerarCandidatoCapturaSeguro(nivelMin, nivelMax, eRara)).filter(Boolean);
  const modal = document.querySelector('[data-modal="captura"]');
  const lista = document.getElementById("opcoes-captura");
  if (!modal || !lista) {
    console.error("[NEXORIA] Interface de captura não encontrada.");
    mostrarMensagemMapa("Não foi possível abrir a captura. A interface não foi carregada.");
    return;
  }
  if (!candidatos.length) {
    mostrarMensagemMapa("Nenhum Monstro disponível para captura neste momento.");
    return;
  }
  lista.innerHTML = "";

  candidatos.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card-captura";

    const imgHtml = c.png
      ? `<img class="thumb" src="PNG/${c.png}" alt="${c.nome}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb thumb-vazio',textContent:'?'}))">`
      : `<div class="thumb thumb-vazio">?</div>`;

    btn.innerHTML = `
      ${imgHtml}
      <span class="nome-captura">${c.nome}</span>
      <span class="nivel-captura">Nv.${c.nivel} · ${c.raridade || "Comum"}</span>
    `;
    btn.addEventListener("click", () => {
      if (typeof nexoriaTocarEfeito === "function") nexoriaTocarEfeito("Som/batalha/pokebola.mp3", 0.7);
      estadoRun.time.push(c);
      modal.hidden = true;
      mostrarMensagemMapa(`${c.nome} se juntou ao seu time!`);
    });
    lista.appendChild(btn);
  });

  modal.hidden = false;
}

function abrirEscolhaItens() {
  const embaralhado = [...POOL_ITENS].sort(() => Math.random() - 0.5).slice(0, 3);
  const modal = document.querySelector('[data-modal="itens"]');
  const lista = document.getElementById("opcoes-itens");
  lista.innerHTML = "";

  embaralhado.forEach((codigo) => {
    const item = buscarItem(codigo);
    if (!item) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opcao-item";
    btn.innerHTML = `${miniaturaItem(item)}<span class="texto-item"><strong>${item.codigo} · ${item.nome}</strong><span class="item-descricao">${item.descricao}</span></span>`;
    btn.addEventListener("click", () => {
      modal.hidden = true;
      usarOuGuardarItem(codigo);
    });
    lista.appendChild(btn);
  });
  modal.hidden = false;
}

function usarOuGuardarItem(codigo) {
  const item = buscarItem(codigo);
  if (!item) return;

  // Itens de evolução são usados diretamente em um monstro elegível.
  if (item.categoria === "Evolução") {
    abrirSelecaoAlvoItem(codigo, true);
    return;
  }

  // Consumíveis nunca são equipados: vão para a mochila e são usados
  // diretamente em um monstro quando o jogador escolher o alvo.
  if (typeof itemConsumivel === "function" && itemConsumivel(item)) {
    estadoRun.mochila = estadoRun.mochila || [];
    estadoRun.mochila.push(codigo);
    mostrarMensagemMapa(`${item.nome} foi guardado na mochila para uso posterior.`);
    return;
  }

  abrirSelecaoAlvoItem(codigo, false);
}

function abrirSelecaoAlvoItem(codigo, evolucao) {
  const item = buscarItem(codigo);
  const modal = document.querySelector('[data-modal="equipar-item"]');
  const lista = document.getElementById("opcoes-equipar-item");
  const descricao = document.getElementById("descricao-item-pendente");
  if (!modal || !lista) return;
  lista.innerHTML = "";
  descricao.innerHTML = `${miniaturaItem(item)}<span class="texto-item">${item.codigo} · ${item.nome} — ${item.descricao}</span>`;

  let elegiveis = 0;
  estadoRun.time.forEach((m, i) => {
    let pode = false;
    if (evolucao) {
      const base = DADOS_MONSTROS.find((x) => x.numero === m.numero);
      if (item.efeito?.tipo === "evolucao_proxima") pode = !!proximaFormaNumero(base);
      else pode = !!(item.evolucoes || []).some((r) => r.de === m.nome);
    } else {
      pode = !(typeof itemConsumivel === "function" && itemConsumivel(item)) && (!item.tipo || itemFuncionaPara(m, item));
    }
    if (!pode) return;
    elegiveis++;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opcao-item";
    btn.innerHTML = `<strong>${m.nome} · Nv.${m.nivel}</strong><span class="item-descricao">${m.tipo}${m.item ? ` · usando ${nomeItem(m.item)}` : " · sem item"}</span>`;
    btn.addEventListener("click", () => {
      if (evolucao) {
        if (evoluirMonstroComItem(m, codigo)) {
          estadoRun.mochila = estadoRun.mochila || [];
          mostrarMensagemMapa(`${m.nome} evoluiu usando ${item.nome}!`);
        } else {
          mostrarMensagemMapa("Esse item não pode ser usado nesse monstro.");
        }
      } else {
        if (m.item) estadoRun.mochila.push(m.item);
        if (equiparItem(m, codigo)) {
          estadoRun.mochila.push(codigo);
          mostrarMensagemMapa(`${item.nome} foi equipado em ${m.nome}.`);
        }
      }
      modal.hidden = true;
    });
    lista.appendChild(btn);
  });

  const guardar = document.createElement("button");
  guardar.type = "button";
  guardar.className = "opcao-item";
  guardar.textContent = evolucao && elegiveis === 0 ? "Guardar na mochila" : "Guardar na mochila (usar depois)";
  guardar.addEventListener("click", () => {
    estadoRun.mochila.push(codigo);
    modal.hidden = true;
    mostrarMensagemMapa(`Você guardou: ${item.nome}.`);
  });
  lista.appendChild(guardar);
  modal.hidden = false;
}

// ---------- Menu do time ----------
function abrirMenuTime() {
  const modal = document.querySelector('[data-modal="time"]');
  const lista = document.getElementById("lista-time-mapa");
  if (!modal || !lista) return;
  lista.innerHTML = "";
  (estadoRun?.time || []).forEach((m, i) => {
    const item = typeof itemDe === "function" ? itemDe(m) : null;
    const hp = Math.max(0, m.hpAtual || 0);
    const hpMax = Math.max(1, m.status?.hpMax || 1);
    const img = m.png ? `<img class="thumb-time-mapa" src="PNG/${m.png}" alt="${m.nome}">` : `<div class="thumb-time-mapa vazio">?</div>`;
    const card = document.createElement("div");
    card.className = "card-time-mapa";
    card.innerHTML = `${img}<div class="info-time-mapa"><strong>${i + 1}. ${m.nome}</strong><span>Nv. ${m.nivel} · ${m.tipo}</span><span>HP ${hp}/${hpMax}</span><span>${item ? "🎒 " + item.nome : "Sem item"}</span></div>`;
    lista.appendChild(card);
  });
  modal.hidden = false;
}

// ---------- Time lateral do Roguelike ----------
function renderizarPainelTimeRoguelike() {
  const lista = document.getElementById("lista-time-roguelike");
  if (!lista) return;
  lista.innerHTML = "";
  const time = estadoRun?.time || [];
  if (!time.length) {
    lista.innerHTML = '<div class="vazio">Seu time aparecerá aqui.</div>';
    return;
  }
  time.forEach((m) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card-time-roguelike";
    const hp = Math.max(0, Number(m.hpAtual) || 0);
    const hpMax = Math.max(1, Number(m.status?.hpMax) || 1);
    const img = m.png
      ? `<img src="PNG/${m.png}" alt="${m.nome}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'vazio',textContent:'?'}))">`
      : `<div class="vazio">?</div>`;
    const item = typeof itemDe === "function" ? itemDe(m) : null;
    const golpes = (m.golpesConhecidos || []).slice(0,4).length;
    card.innerHTML = `${img}<div><div class="nome">${m.nome}</div><div class="meta">Lv. ${m.nivel} · ${m.tipo}</div><div class="hp">HP ${hp}/${hpMax} · ${golpes}/4 ataques</div><div class="meta">${item ? "🎒 "+item.nome : "Sem item"} · ${m.natureza || "Natureza"}</div></div>`;
    card.addEventListener("click", () => {
      abrirTelaGerenciamentoTime(estadoRun.time, {
        modo: "roguelike",
        selecionadoNumero: m.numero,
        titulo: `Preparar ${m.nome}`,
        texto: "Escolha os 4 ataques, troque o item e ajuste a Natureza. As alterações ficam salvas na Run."
      });
      setTimeout(() => {
        const base = DADOS_MONSTROS.find(x => String(x.numero) === String(m.numero));
        if (base) renderizarDetalheGerenciamento(m, base);
      }, 0);
    });
    lista.appendChild(card);
  });
}

// ---------- Mensagens ----------
function mostrarMensagemMapa(texto) {
  const el = document.getElementById("mensagem-mapa");
  el.textContent = texto;
  el.hidden = false;
}
function esconderMensagemMapa() {
  document.getElementById("mensagem-mapa").hidden = true;
}


function iconeNoHTML(tipo) {
  const imagens = {
    captura: ["img/ui/pokebola-cinza.png", "Pokébola"],
    capturaRara: ["img/ui/pokebola-cinza.png", "Pokébola rara"],
    itens: ["img/ui/mochila.png", "Mochila"],
    loja: ["img/ui/mochila.png", "Loja"],
    treinador: ["img/ui/treinador.png", "Treinador"],
    evento: ["img/ui/evento.png", "Evento"],
  };
  const item = imagens[tipo];
  if (!item) return `<span class="no-icone">${TIPOS_NO[tipo]?.icone || "?"}</span>`;
  return `<img class="no-icone no-icone-img no-icone-${tipo}" src="${item[0]}" alt="${item[1]}">`;
}

// ---------- Renderização ----------
function renderizarMapa() {
  const container = document.getElementById("mapa-camadas");
  container.innerHTML = "";
  renderizarPainelTimeRoguelike();
  const disponiveis = nosDisponiveis();

  mapaAtual.forEach((camada, i) => {
    const linha = document.createElement("div");
    linha.className = "linha-mapa";
    if (camada[0]?.parte) {
      linha.dataset.parte = camada[0].parte;
      if (i === 0 || mapaAtual[i - 1]?.[0]?.parte !== camada[0].parte) {
        const titulo = document.createElement("div");
        titulo.className = "titulo-parte-mapa";
        titulo.textContent = `PARTE ${camada[0].parte}${camada[0].parte === 9 ? " — CAMINHO FINAL" : ""}`;
        container.appendChild(titulo);
      }
    }

    camada.forEach((no) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "no-mapa";
      btn.dataset.id = no.id;

      const info = TIPOS_NO[no.tipo];
      btn.title = no.tipo === "ginasio" ? `${LIDERES_GINASIO[no.liderIndex]?.nome || "Líder"} — Nv.${LIDERES_GINASIO[no.liderIndex]?.nivel?.join("-") || ""}` : no.tipo === "chefao" ? "Everton — Chefão Final" : `Nível ${no.nivelMin}-${no.nivelMax}`;
      btn.innerHTML = `${iconeNoHTML(no.tipo)}<span class="no-nome">${info.nome}</span>`;

      if (no.id === noAtualId) {
        btn.classList.add("no-atual");
        btn.disabled = true;
      } else if (i <= camadaAtualIndex) {
        btn.classList.add("no-perdido");
        btn.disabled = true;
      } else if (disponiveis.includes(no.id)) {
        btn.classList.add("no-disponivel");
        btn.addEventListener("click", () => escolherNo(no.id));
      } else {
        btn.classList.add("no-bloqueado");
        btn.disabled = true;
      }

      linha.appendChild(btn);
    });

    container.appendChild(linha);
  });

  // Cada Parte possui 7 linhas + um endpoint de Ginásio/Chefão.
  const painelCidade = document.getElementById("painel-cidade");
  if (painelCidade) painelCidade.hidden = true;

  const alvo = container.querySelector(".no-atual, .no-disponivel");
  if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.addEventListener("click", (e) => {
  const fechar = e.target.closest("[data-fechar-modal-time]");
  if (!fechar) return;
  const modal = document.querySelector('[data-modal="time"]');
  if (modal) modal.hidden = true;
});
document.addEventListener("click", (e) => {
  const modal = document.querySelector('[data-modal="time"]');
  if (modal && e.target === modal) modal.hidden = true;
});

document.addEventListener("nexoria:tela-mudou", (e) => {
  if (e.detail.tela === "tela-mapa" && !mapaAtual) iniciarMapa();
});
