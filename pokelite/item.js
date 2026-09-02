// ---------- Sistema de Itens por CÓDIGO ----------
// Assim como golpes (G001) e habilidades (H001), todo item é referenciado por B001, B002...

function buscarItem(codigo) {
  return (window.DADOS_ITENS || []).find((i) => i.codigo === codigo) || null;
}

function nomeItem(codigo) {
  return buscarItem(codigo)?.nome || codigo || "";
}


function itemConsumivel(codigoOuItem) {
  const item = typeof codigoOuItem === "string" ? buscarItem(codigoOuItem) : codigoOuItem;
  return !!item && item.codigo && ["B023", "B024", "B025"].includes(item.codigo);
}

function itemEquipavel(codigoOuItem) {
  const item = typeof codigoOuItem === "string" ? buscarItem(codigoOuItem) : codigoOuItem;
  return !!item && !itemConsumivel(item);
}

function usarItemConsumivel(monstro, codigo) {
  const item = buscarItem(codigo);
  if (!monstro || !item || !itemConsumivel(item)) return false;
  const run = (typeof estadoRun !== "undefined" && estadoRun) ? estadoRun : window.estadoRun;
  if (!run || !Array.isArray(run.mochila)) return false;
  const idx = run.mochila.indexOf(item.codigo);
  if (idx < 0) return false;

  const hpMax = Number(monstro.status?.hpMax || 0);
  const hpAtual = Math.max(0, Number(monstro.hpAtual || 0));
  let novoHp = hpAtual;

  if (item.efeito?.tipo === "revive") {
    if (hpAtual > 0) {
      if (typeof mostrarMensagemMapa === "function") mostrarMensagemMapa(`${monstro.nome} ainda não desmaiou.`);
      return false;
    }
    novoHp = Math.max(1, Math.floor(hpMax * Number(item.efeito.valor || 0.5)));
  } else if (item.efeito?.tipo === "cura") {
    if (hpAtual <= 0) {
      if (typeof mostrarMensagemMapa === "function") mostrarMensagemMapa(`${monstro.nome} está desmaiado. Use Revive primeiro.`);
      return false;
    }
    if (hpAtual >= hpMax) {
      if (typeof mostrarMensagemMapa === "function") mostrarMensagemMapa(`${monstro.nome} já está com HP cheio.`);
      return false;
    }
    novoHp = Math.min(hpMax, hpAtual + Math.floor(hpMax * Number(item.efeito.valor || 0)));
  } else {
    return false;
  }

  const recuperado = novoHp - hpAtual;
  monstro.hpAtual = novoHp;
  run.mochila.splice(idx, 1);
  if (typeof mostrarMensagemMapa === "function") {
    if (item.codigo === "B023") mostrarMensagemMapa(`💚 ${monstro.nome} voltou à batalha com ${novoHp}/${hpMax} HP!`);
    else mostrarMensagemMapa(`💚 ${monstro.nome} recuperou ${recuperado} HP com ${item.nome}.`);
  }
  return true;
}

function itemDe(monstro) {
  return monstro && monstro.item ? buscarItem(monstro.item) : null;
}

function itemFuncionaPara(monstro, item) {
  if (!monstro || !item || !item.tipo) return true;
  return monstro.tipo.split("/").map((t) => t.trim()).includes(item.tipo);
}

function itemAtivo(monstro) {
  const item = itemDe(monstro);
  return item && itemFuncionaPara(monstro, item) ? item : null;
}

function aplicarMultiplicadoresItem(monstro, status) {
  const item = itemAtivo(monstro);
  if (!item || !item.efeito) return status;
  const e = item.efeito;
  const todos = ["hpMax", "ataque", "defesa", "ataqueEspecial", "defesaEspecial", "velocidade"];
  if (e.tipo === "todos_status") {
    todos.forEach((s) => { status[s] = Math.floor(status[s] * (1 + e.valor)); });
  }
  if (e.tipo === "status" || e.tipo === "dano_status") {
    Object.entries(e.valores || e.status || {}).forEach(([s, v]) => {
      if (status[s] !== undefined) status[s] = Math.floor(status[s] * (1 + v));
    });
  }
  return status;
}

function multiplicadorDanoItem(monstro) {
  const item = itemAtivo(monstro);
  if (!item || !item.efeito) return 1;
  const e = item.efeito;
  if (e.tipo === "dano") return 1 + e.valor;
  if (e.tipo === "dano_status") return 1 + e.dano;
  return 1;
}

function processarItemAoAcertar(atacante, alvo, golpe, batalha) {
  const item = itemAtivo(atacante);
  if (!item || !item.efeito) return;
  const e = item.efeito;
  if (e.tipo === "chance_status" && Math.random() < e.chance) {
    if (e.status === "queimado" && !estaImune(alvo, "queimado")) {
      alvo.statusAlterado = "queimado";
      batalha.log.push(`${alvo.nome} foi Queimado pelo ${item.nome}!`);
    } else if (e.status === "flinchar") {
      alvo.statusAlterado = "flinchar";
      batalha.log.push(`${alvo.nome} Flinchou por causa do ${item.nome}!`);
    }
  }
}

function processarItemPrimeiroTurno(monstro, alvo, batalha) {
  const item = itemAtivo(monstro);
  if (!item || !item.efeito || item.efeito.tipo !== "confundir_primeiro_turno") return;
  if (batalha.turno !== 0 || monstro._itemAgamotoUsado) return;
  monstro._itemAgamotoUsado = true;
  if (!estaImune(alvo, "confuso") && Math.random() < item.efeito.chance) {
    alvo.statusAlterado = "confuso";
    batalha.log.push(`${alvo.nome} ficou Confuso pelo ${item.nome}!`);
  }
}

function processarItemFimDoTurno(monstro, rival, batalha) {
  const item = itemAtivo(monstro);
  if (!item || !item.efeito) return;
  const e = item.efeito;
  if (e.tipo === "cura_por_item_adversario" && itemDe(rival)) {
    const cura = Math.max(1, Math.floor(monstro.status.hpMax * e.valor));
    const antes = monstro.hpAtual;
    monstro.hpAtual = Math.min(monstro.status.hpMax, monstro.hpAtual + cura);
    const recuperado = monstro.hpAtual - antes;
    if (recuperado > 0) batalha.log.push(`${monstro.nome} recuperou ${recuperado} HP com ${item.nome}.`);
  }
}

function itemPodeImpedirDesmaio(monstro, batalha) {
  const item = itemAtivo(monstro);
  if (!item || !item.efeito || item.efeito.tipo !== "sobreviver_1hp") return false;
  if (monstro._lastDanceUsado) return false;
  if (Math.random() >= item.efeito.chance) return false;
  monstro._lastDanceUsado = true;
  monstro.hpAtual = 1;
  batalha.log.push(`${monstro.nome} sobreviveu com 1 HP graças a ${item.nome}!`);
  return true;
}

function equiparItem(monstro, codigo) {
  const item = buscarItem(codigo);
  if (!monstro || !item || itemConsumivel(item)) return false;
  if (item.tipo && !itemFuncionaPara(monstro, item)) return false;
  monstro.item = item.codigo;
  if (typeof recalcularStatusDaInstancia === "function") recalcularStatusDaInstancia(monstro);
  return true;
}

window.itemConsumivel = itemConsumivel;
window.itemEquipavel = itemEquipavel;
window.usarItemConsumivel = usarItemConsumivel;
window.buscarItem = buscarItem;
window.nomeItem = nomeItem;
window.itemDe = itemDe;
window.itemAtivo = itemAtivo;
window.equiparItem = equiparItem;
window.multiplicadorDanoItem = multiplicadorDanoItem;
window.aplicarMultiplicadoresItem = aplicarMultiplicadoresItem;
window.processarItemAoAcertar = processarItemAoAcertar;
window.processarItemPrimeiroTurno = processarItemPrimeiroTurno;
window.processarItemFimDoTurno = processarItemFimDoTurno;
window.itemPodeImpedirDesmaio = itemPodeImpedirDesmaio;

function encontrarMonstroPorNome(nome) {
  return (window.DADOS_MONSTROS || []).find((m) => m.nome === nome) || null;
}

function proximaFormaNumero(base) {
  const evo = base?.evolucao || {};
  if (Array.isArray(evo.evolucoesPossiveis) && evo.evolucoesPossiveis.length) {
    const sorteado = Math.random();
    const metade = 1 / evo.evolucoesPossiveis.length;
    return evo.evolucoesPossiveis[Math.min(evo.evolucoesPossiveis.length - 1, Math.floor(sorteado / metade))];
  }
  return evo.evoluiPara || null;
}

function animarEvolucao(monstro, pngAntes, pngDepois, nomeAntes, nomeDepois){
 const alvo=document.getElementById("detalhe-gerenciamento-time")||document.getElementById("arena-batalha");
 if(!alvo)return;
 const overlay=document.createElement("div"); overlay.className="animacao-evolucao";
 overlay.innerHTML=`<div class="evo-caixa"><div class="evo-nome">${nomeAntes}</div><img src="PNG/${pngAntes||""}" class="evo-sprite evo-antigo"><div class="evo-seta">✨ EVOLUÇÃO ✨</div><img src="PNG/${pngDepois||""}" class="evo-sprite evo-novo"><div class="evo-nome novo">${nomeDepois}</div></div>`;
 document.body.appendChild(overlay);
 setTimeout(()=>overlay.remove(),2600);
}
window.animarEvolucao=animarEvolucao;

function evoluirMonstroComItem(monstro, itemCodigo) {
  const item = buscarItem(itemCodigo);
  if (!item || !monstro) return false;
  const base = (window.DADOS_MONSTROS || []).find((m) => m.numero === monstro.numero);
  if (!base) return false;

  let numeroDestino = null;
  if (item.efeito?.tipo === "evolucao_especifica") {
    const regra = (item.evolucoes || []).find((r) => r.de === monstro.nome);
    if (regra) numeroDestino = encontrarMonstroPorNome(regra.para)?.numero || null;
  } else if (item.efeito?.tipo === "evolucao_proxima") {
    numeroDestino = proximaFormaNumero(base);
  }
  if (!numeroDestino) return false;

  const destino = (window.DADOS_MONSTROS || []).find((m) => m.numero === numeroDestino);
  if (!destino) return false;
  const nomeAntes=monstro.nome, pngAntes=monstro.png;
  const hpRatio = monstro.status?.hpMax ? monstro.hpAtual / monstro.status.hpMax : 1;
  monstro.numero = destino.numero;
  monstro.nome = destino.nome;
  monstro.tipo = destino.tipo;
  monstro.png = destino.png;
  monstro.habilidade = destino.habilidade || null;
  monstro.statusBase = destino.statusBase;
  monstro.golpesConhecidos = selecionarQuatroGolpes((destino.golpes || []).filter((g) => g.nivel <= monstro.nivel).map((g) => g.codigo), destino);
  monstro.item = null;
  if (typeof calcularStatus === "function") monstro.status = calcularStatus(destino, monstro.nivel);
  if (typeof aplicarNatureza === "function" && monstro.natureza) aplicarNatureza(monstro.status, monstro.natureza);
  if (typeof aplicarMultiplicadoresItem === "function") monstro.status = aplicarMultiplicadoresItem(monstro, monstro.status);
  monstro.statusOriginal = { ...monstro.status };
  monstro.hpAtual = Math.max(1, Math.min(monstro.status.hpMax, Math.floor(monstro.status.hpMax * hpRatio)));
  animarEvolucao(monstro,pngAntes,monstro.png,nomeAntes,monstro.nome);
  return true;
}

window.evoluirMonstroComItem = evoluirMonstroComItem;
