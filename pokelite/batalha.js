// ---------- Motor de batalha com suporte a times (1x1 até 6x6) ----------

let estadoBatalha = null;
let contextoBatalhaAtual = "pratica"; // "pratica" | "roguelike"
let ultimoVencedorRoguelike = null;

function buscarGolpe(codigo) {
  return DADOS_GOLPES.find((g) => g.codigo === codigo);
}

function jogadorAtivo() {
  return estadoBatalha.timeJogador[estadoBatalha.ativoJogador];
}
function oponenteAtivo() {
  return estadoBatalha.timeOponente[estadoBatalha.ativoOponente];
}
function timeTemVivos(time) {
  return time.some((m) => m.hpAtual > 0);
}

// ---------- Efetividade de tipo, já considerando habilidades ----------
function calcularEfetividadeComHabilidades(golpe, atacante, alvo) {
  if (!golpe || golpe.poder <= 0) return 1;
  let resultado = calcularEfetividade(golpe.tipo, alvo.tipo);

  const hAtacante = habilidadeDe(atacante);
  if (hAtacante && hAtacante.sobrescreverEfetividade) {
    const r = hAtacante.sobrescreverEfetividade(golpe.tipo, alvo.tipo, resultado);
    if (r !== null && r !== undefined) resultado = r;
  }

  const hAlvo = habilidadeDe(alvo);
  if (hAlvo && hAlvo.sobrescreverEfetividade && !hAlvo.somenteOfensiva) {
    const r = hAlvo.sobrescreverEfetividade(golpe.tipo, atacante.tipo, resultado);
    if (r !== null && r !== undefined) resultado = r;
  }

  return resultado;
}

function temHabilidadePrioridade(proprio, alvo, golpe, efetividade) {
  const h = habilidadeDe(proprio);
  return !!(h && h.temPrioridade && h.temPrioridade(proprio, alvo, golpe, efetividade));
}

// ---------- Fórmula de dano (com STAB, efetividade e habilidades) ----------
function calcularDanoComHabilidades(atacante, alvo, golpe, efetividade, agiuPrimeiro, batalha) {
  if (!golpe || golpe.poder <= 0 || efetividade === 0) {
    return { dano: 0 };
  }

  const hAtacante = habilidadeDe(atacante);
  const hAlvo = habilidadeDe(alvo);

  if (hAtacante && hAtacante.ignorarDanoChance && Math.random() < hAtacante.ignorarDanoChance) {
    estadoBatalha.log.push(`${atacante.nome} ignorou o dano recebido!`);
    return { dano: 0 };
  }

  if (hAlvo && hAlvo.esquivaChance && Math.random() < hAlvo.esquivaChance) {
    estadoBatalha.log.push(`${alvo.nome} desviou do ataque!`);
    return { dano: 0 };
  }

  if (hAtacante && hAtacante.chanceNocauteImediato && Math.random() < hAtacante.chanceNocauteImediato) {
    return {
      dano: alvo.hpAtual,
      mensagemExtra: `${atacante.nome} usa a sorte dos ringues e nocauteia ${alvo.nome} na hora!`,
    };
  }

  let atk = golpe.categoria === "Físico" ? atacante.status.ataque : atacante.status.ataqueEspecial;
  if (hAtacante && hAtacante.modificarAtaque && golpe.categoria === "Físico") {
    const novoAtk = hAtacante.modificarAtaque(atacante, alvo, golpe, agiuPrimeiro);
    if (novoAtk !== undefined) atk = novoAtk;
  }

  const def = golpe.categoria === "Físico" ? alvo.status.defesa : alvo.status.defesaEspecial;
  let base = (((2 * atacante.nivel) / 5 + 2) * golpe.poder * (atk / def)) / 50 + 2;

  const tiposAtacante = atacante.tipo.split("/").map((t) => t.trim());
  const stab = tiposAtacante.includes(golpe.tipo) ? 1.5 : 1;

  if (atacante.statusAlterado === "queimado" && golpe.categoria === "Físico") {
    base *= 0.5;
  }

  if (batalha.campoNoturno && golpe.tipo === "Dark") base *= 1.5;
  if (batalha.florido && golpe.tipo === "Planta") base *= 1.35;
  if (batalha.campoEletrico && golpe.tipo === "Elétrico") base *= 1.35;
  if (batalha.campoGlacial && golpe.tipo === "Gelo") base *= 1.35;
  if (batalha.campoSombrio && golpe.tipo === "Dark") base *= 1.35;
  if (batalha.campoRochoso && (golpe.tipo === "Pedra" || golpe.tipo === "Terra")) base *= 1.25;
  if (batalha.chuva && golpe.tipo === "Água") base *= 1.5;
  if (batalha.sol && golpe.tipo === "Fogo") base *= 1.5;
  if (batalha.neve && golpe.tipo === "Gelo") base *= 1.5;

  if (hAtacante?.modificarPoder) {
    const poderMod = hAtacante.modificarPoder(atacante, golpe);
    if (Number.isFinite(poderMod) && poderMod > 0 && golpe.poder > 0) base *= poderMod / golpe.poder;
  }
  if (hAtacante?.modificarPoderTipo) base *= hAtacante.modificarPoderTipo(atacante, golpe) || 1;
  if (hAtacante?.modificarDano) base *= hAtacante.modificarDano(atacante, alvo, base, batalha) / Math.max(1, base);
  if (hAlvo?.multiplicadorDanoRecebido) base *= hAlvo.multiplicadorDanoRecebido(golpe.tipo) || 1;

  const variacao = 0.85 + Math.random() * 0.15;
  let danoFinal = Math.max(1, Math.floor(base * stab * efetividade * variacao));
  if (hAtacante?.bonusCritico && Math.random() < hAtacante.bonusCritico) {
    danoFinal = Math.floor(danoFinal * 1.5);
    estadoBatalha.log.push(`${atacante.nome} conseguiu um CRITICAL HIT!`);
  }

  if (typeof multiplicadorDanoItem === "function") {
    danoFinal = Math.max(1, Math.floor(danoFinal * multiplicadorDanoItem(atacante)));
  }

  if (atacante._desejoDragaoTurno === batalha.turno) {
    danoFinal = Math.max(1, Math.floor(danoFinal * 0.5));
  }

  return { dano: danoFinal };
}

// ---------- Status alterado (Queimado / Confuso / Cego / Flinch) ----------
function resolverStatusAntesDeAgir(quem, batalha) {
  if (quem.statusAlterado === "dormindo" || quem.statusAlterado === "iludido") {
    batalha.log.push(`${quem.nome} não conseguiu agir por causa do efeito!`);
    quem._duracaoStatus = Math.max(0, (quem._duracaoStatus || 1) - 1);
    if (quem._duracaoStatus <= 0) quem.statusAlterado = null;
    return false;
  }
  if (quem.statusAlterado === "flinchar") {
    batalha.log.push(`${quem.nome} Flinchou e não conseguiu agir!`);
    quem._duracaoStatus = Math.max(0, (quem._duracaoStatus || 1) - 1);
    if (quem._duracaoStatus <= 0) quem.statusAlterado = null;
    return false;
  }
  if (quem.statusAlterado === "confuso" && Math.random() < 0.33) {
    const dano = Math.max(1, Math.floor(quem.status.hpMax / 8));
    quem.hpAtual = Math.max(0, quem.hpAtual - dano);
    batalha.log.push(`${quem.nome} está confuso e se machucou sozinho! (${dano} de dano)`);
    return false;
  }
  if (quem.statusAlterado === "cego" && Math.random() < 0.5) {
    batalha.log.push(`${quem.nome} está cego e errou o golpe!`);
    return false;
  }
  return true;
}

// ---------- Entrada e troca de monstro ativo ----------
function aplicarAoEntrarUnico(entra, rival) {
  const h = habilidadeDe(entra);
  if (h && h.aoEntrar) h.aoEntrar(entra, rival, estadoBatalha);

  const efeitoEspecial = EFEITOS_DE_CAMPO_POR_NOME[entra.nome];
  if (efeitoEspecial) efeitoEspecial(estadoBatalha);
}

function trocarAtivo(lado, novoIndice) {
  if (lado === "jogador") {
    estadoBatalha.ativoJogador = novoIndice;
    const novo = jogadorAtivo();
    estadoBatalha.log.push(`Vai, ${novo.nome}!`);
    aplicarAoEntrarUnico(novo, oponenteAtivo());
    const h = habilidadeDe(novo);
    if (h && h.aoTrocarEntrar) h.aoTrocarEntrar(novo, oponenteAtivo(), estadoBatalha);
  } else {
    estadoBatalha.ativoOponente = novoIndice;
    const novo = oponenteAtivo();
    estadoBatalha.log.push(`O oponente enviou ${novo.nome}!`);
    aplicarAoEntrarUnico(novo, jogadorAtivo());
    const h = habilidadeDe(novo);
    if (h && h.aoTrocarEntrar) h.aoTrocarEntrar(novo, jogadorAtivo(), estadoBatalha);
  }
}

// ---------- Desmaio: 9 Vidas, fim de time, ou troca forçada/automática ----------
function tratarDesmaio(alvo, ladoAlvo) {
  if (typeof itemPodeImpedirDesmaio === "function" && itemPodeImpedirDesmaio(alvo, estadoBatalha)) {
    return false; // item tipo "Last Dance" salvou
  }

  const h = habilidadeDe(alvo);
  if (h && h.aoDesmaiar && h.aoDesmaiar(alvo, estadoBatalha)) {
    return false; // sobreviveu (ex: 9 Vidas)
  }

  estadoBatalha.log.push(`${alvo.nome} desmaiou!`);
  const time = ladoAlvo === "jogador" ? estadoBatalha.timeJogador : estadoBatalha.timeOponente;

  if (!timeTemVivos(time)) {
    estadoBatalha.terminou = true;
    estadoBatalha.vencedor = ladoAlvo === "jogador" ? "oponente" : "jogador";
    return true;
  }

  if (ladoAlvo === "jogador") {
    estadoBatalha.aguardandoTrocaJogador = true;
  } else if (estadoBatalha.multiplayer) {
    // No multiplayer o "oponente" é uma pessoa de verdade — não escolhe sozinho.
    estadoBatalha.aguardandoTrocaOponente = true;
  } else {
    const proximo = time.findIndex((m) => m.hpAtual > 0);
    trocarAtivo("oponente", proximo);
  }

  return true;
}

// ---------- Início da batalha ----------
function iniciarBatalha(timeJogador, timeOponente, multiplayer = false, multiplayerHost = false, mensagemAbertura = null) {
  // No Roguelike, o HP é persistente entre encontros, mas buffs/nerfs,
  // status alterados e transformações são exclusivos da batalha anterior.
  // A limpeza aqui é uma segunda camada de segurança para nenhum tipo de nó
  // (inclusive Ginásio/Chefe) esquecer de preparar o time.
  if (contextoBatalhaAtual === "roguelike" && typeof prepararTimeParaNovaBatalha === "function") {
    prepararTimeParaNovaBatalha();
  }

  estadoBatalha = {
    timeJogador,
    timeOponente,
    ativoJogador: 0,
    ativoOponente: 0,
    log: [mensagemAbertura || `Um ${timeOponente[0].nome} selvagem apareceu!`],
    terminou: false,
    vencedor: null,
    campoNoturno: false,
    chuva: false,
    sol: false,
    neve: false,
    areia: false,
    estrelado: false,
    florido: false,
    campoEletrico: false,
    campoGlacial: false,
    campoSombrio: false,
    campoRochoso: false,
    reverse: false,
    reverseTurnos: 0,
    noiteEstreladaDono: null,
    noiteEstreladaDreno: 0,
    aguardandoTrocaJogador: false,
    aguardandoTrocaOponente: false,
    multiplayer,
    multiplayerHost,
    multiplayerAcoes: {},
    turno: 0,
    campoBatalha: false,
    statusCampoBatalha: null,
    dificuldade: multiplayer ? "dificil" : (window.NEXORIA_DIFICULDADE || (contextoBatalhaAtual === "roguelike" ? "dificil" : "facil")), 
  };

  [...timeJogador, ...timeOponente].forEach(m => {
    if (m?.status) m._statusBase = {...m.status};
    if (m) m._hpInicial = m.hpAtual;
  });

  aplicarAoEntrarUnico(jogadorAtivo(), oponenteAtivo());
  aplicarAoEntrarUnico(oponenteAtivo(), jogadorAtivo());

  renderizarBatalha();

  if (typeof nexoriaTocarBatalha === "function") {
    const texto = String(mensagemAbertura || "").toLowerCase();
    const tipoMusica = multiplayer || texto.includes("treinador")
      ? "treinador"
      : (texto.includes("ginásio") || texto.includes("ginasio") || texto.includes("chefão") || texto.includes("chefao") || texto.includes("everton"))
        ? "campeao"
        : "selvagem";
    nexoriaTocarBatalha(tipoMusica);
  }

  if (multiplayer && multiplayerHost && typeof mpEnviar === "function") {
    mpEnviar("battle-state", { estado: estadoBatalha });
  }
}

// ---------- Animação ----------
function animarSprite(elId, classe) {
  const el = document.getElementById(elId);
  el.classList.remove(classe);
  void el.offsetWidth; // força reflow, pra animação tocar de novo mesmo em ataques seguidos
  el.classList.add(classe);
  el.addEventListener("animationend", () => el.classList.remove(classe), { once: true });
}

// ---------- Precisão dos golpes — Matrix (H023) nunca erra ----------
function golpeAcerta(quem, golpe) {
  const h = habilidadeDe(quem);
  if (h && h.nuncaErra) return true;
  const precisao = golpe && Number.isFinite(Number(golpe.precisao)) ? Number(golpe.precisao) : 100;
  return Math.random() * 100 < precisao;
}

function notificarErro(quem, contra, golpe) {
  const hAlvo = habilidadeDe(contra);
  if (hAlvo && hAlvo.aoErroDoOponente) hAlvo.aoErroDoOponente(contra, quem, estadoBatalha);
}

// ---------- Efeitos especiais dos novos golpes ----------
function aplicarEfeitoGolpe(golpe, quem, contra, batalha) {
  const e = golpe && golpe.effect;
  if (!e) return { danoExtra: 0, mensagem: null };
  const nomeStatus = { hpMax:"HP Máximo", ataque:"Ataque", defesa:"Defesa", ataqueEspecial:"Ataque Especial", defesaEspecial:"Defesa Especial", velocidade:"Velocidade" };
  const ajustar = (monstro, status, valor) => {
    if (!monstro?.status?.[status]) return;
    const fator = 1 + Number(valor || 0);
    const base = Number(monstro._statusBase?.[status] || monstro.status[status] || 1);
    const atual = Number(monstro.status[status] || base);
    let novo = atual * fator;
    // Golpes com buff/debuff podem acumular, mas têm limites de batalha para evitar valores absurdos.
    const minimo = base * 0.25;
    const maximo = base * 4.00;
    novo = Math.min(maximo, Math.max(minimo, novo));
    monstro.status[status] = Math.max(1, Math.floor(novo));
  };
  switch (e.tipo) {
    case 'buff': ajustar(quem, e.status, e.valor); return { mensagem: `${quem.nome} aumentou ${nomeStatus[e.status] || e.status}!` };
    case 'debuff': ajustar(contra, e.status, e.valor); return { mensagem: `${contra.nome} teve ${nomeStatus[e.status] || e.status} reduzido!` };
    case 'buffTodos': ['ataque','defesa','ataqueEspecial','defesaEspecial','velocidade'].forEach(s=>ajustar(quem,s,e.valor)); return { mensagem:`${quem.nome} aumentou seus atributos!` };
    case 'buffMult': (e.statusList||[]).forEach(s=>ajustar(quem,s,e.valor)); return { mensagem:`${quem.nome} reforçou suas defesas!` };
    case 'debuffMult': (e.statusList||[]).forEach(s=>ajustar(contra,s,e.valor)); return { mensagem:`Os atributos de ${contra.nome} foram reduzidos!` };
    case 'buffDebuff': ajustar(quem,e.buff.status,e.buff.valor); ajustar(quem,e.debuff.status,e.debuff.valor); return { mensagem:`${quem.nome} apostou tudo em seu poder!` };
    case 'chanceBuff': if(Math.random()<e.chance){ajustar(quem,e.status,e.valor); return {mensagem:`${quem.nome} conseguiu o Tudo ou Nada!`};} return {mensagem:`${quem.nome} falhou no Tudo ou Nada!`};
    case 'campo':
      batalha.campoNoturno = e.campo==='noturno' || batalha.campoNoturno;
      batalha.estrelado = e.campo==='noturno' || batalha.estrelado;
      batalha.florido = e.campo==='florido' || batalha.florido;
      batalha.campoEletrico = e.campo==='eletrico' || batalha.campoEletrico;
      batalha.campoGlacial = e.campo==='glacial' || batalha.campoGlacial;
      batalha.campoSombrio = e.campo==='sombrio' || batalha.campoSombrio;
      batalha.campoRochoso = e.campo==='rochoso' || batalha.campoRochoso;
      return {mensagem:`${quem.nome} abriu o ${String(e.campo).replace('noturno','Campo Noturno').replace('florido','Campo de Flores').replace('eletrico','Campo Elétrico').replace('glacial','Campo Glacial').replace('sombrio','Campo Sombrio').replace('rochoso','Campo Rochoso')}!`};
    case 'clima':
      batalha.chuva = e.clima==='chuva' || batalha.chuva;
      batalha.sol = e.clima==='sol' || batalha.sol;
      batalha.neve = e.clima==='neve' || batalha.neve;
      batalha.areia = e.clima==='areia' || batalha.areia;
      if(e.clima==='neve') batalha.estrelado = batalha.estrelado;
      return {mensagem:`${quem.nome} mudou o clima para ${e.clima}!`};
    case 'cura': {
      const cura=Math.max(1,Math.floor(quem.status.hpMax*Number(e.valor||0)));
      const antes=quem.hpAtual; quem.hpAtual=Math.min(quem.status.hpMax,quem.hpAtual+cura);
      return {mensagem:`${quem.nome} recuperou ${quem.hpAtual-antes} HP!`};
    }
    case 'protecao': quem.protegido=true; return {mensagem:`${quem.nome} criou um escudo!`};
    case 'status': contra.statusAlterado=e.status; contra._duracaoStatus=Math.max(1, Math.ceil(Number(e.duracao||1)*(habilidadeDe(contra)?.reduzirDuracaoStatus||1))); return {mensagem:`${contra.nome} ficou ${e.status}!`};
    case 'flinch': contra.statusAlterado='flinchar'; contra._duracaoStatus=Math.max(1, Math.ceil(Number(e.duracao||1)*(habilidadeDe(contra)?.reduzirDuracaoStatus||1))); return {mensagem:`${contra.nome} ficou em Flinch por ${e.duracao||1} turnos!`};
    case 'reverse': batalha.reverse=true; batalha.reverseTurnos=Number(e.duracao||5); return {mensagem:`${quem.nome} ativou Reverse! Os Monstros mais lentos passam a agir primeiro.`};
    case 'noiteEstreladaDreno': batalha.campoNoturno=true; batalha.estrelado=true; batalha.noiteEstreladaDono=quem; batalha.noiteEstreladaDreno=Number(e.valor||1/6); return {mensagem:`${quem.nome} transformou o campo em Noite Estrelada!`};
    case 'desejoDragao': if (batalha.turno!==0) return {mensagem:`${quem.nome} tentou usar Desejo do Dragão, mas esse golpe só pode ser usado no primeiro turno!`}; quem._desejoDragaoTurno=batalha.turno+1; return {mensagem:`${quem.nome} lançou o Desejo do Dragão! No próximo turno, seu próximo ataque causará apenas 50% do dano.`};
    case 'troca': quem._trocaDepoisDoGolpe=true; return {mensagem:`${quem.nome} está pronto para trocar!`};
    case 'buffHpBaixo': { const perda=1-quem.hpAtual/quem.status.hpMax; ajustar(quem,'ataque',Math.min(1,perda)); return {mensagem:`${quem.nome} concentrou sua força!`}; }
    case 'vinganca': quem._vinganca=true; return {mensagem:`${quem.nome} preparou sua vingança!`};
    case 'danoPercentual': { const dano=Math.max(1,Math.floor(contra.status.hpMax*Number(e.valor||0))); contra.hpAtual=Math.max(0,contra.hpAtual-dano); return {danoExtra:dano,mensagem:`${quem.nome} causou ${dano} de dano direto!`}; }
    case 'pressao': ajustar(quem,'velocidade',-.15); ajustar(contra,'velocidade',-.15); return {mensagem:'A pressão reduziu a Velocidade dos dois!'};
    case 'ritualLunar': batalha.campoNoturno=true; batalha.estrelado=true; { const cura=Math.max(1,Math.floor(quem.status.hpMax*.25)); quem.hpAtual=Math.min(quem.status.hpMax,quem.hpAtual+cura); return {mensagem:`${quem.nome} realizou o Ritual Lunar e recuperou HP!`}; }
    case 'limparStats': ['ataque','defesa','ataqueEspecial','defesaEspecial','velocidade'].forEach(s=>{quem.status[s]=quem._statusBase?.[s]||quem.status[s]; contra.status[s]=contra._statusBase?.[s]||contra.status[s];}); return {mensagem:'A Névoa limpou as alterações de atributos!'};
    case 'armadilha': batalha.armadilhas = batalha.armadilhas || {}; batalha.armadilhas[e.armadilha] = true; return {mensagem:`${quem.nome} preparou ${e.armadilha}!`};
    default: return {mensagem:null};
  }
}

// ---------- Um ataque de um lado contra o outro ----------
function executarAtaque(nomeLado, golpe, efetividade, agiuPrimeiro) {
  const quem = nomeLado === "jogador" ? jogadorAtivo() : oponenteAtivo();
  const contra = nomeLado === "jogador" ? oponenteAtivo() : jogadorAtivo();

  if (quem.hpAtual <= 0) return;

  if (!resolverStatusAntesDeAgir(quem, estadoBatalha)) {
    return;
  }

  if (golpe?.codigo === "GA007" && estadoBatalha.turno !== 0) {
    estadoBatalha.log.push(`${quem.nome} não pode usar Desejo do Dragão agora: ele só pode ser usado no primeiro turno!`);
    return;
  }

  if (!golpeAcerta(quem, golpe)) {
    estadoBatalha.log.push(`${quem.nome} usou ${golpe.nome}, mas errou o golpe!`);
    notificarErro(quem, contra, golpe);
    return;
  }

  animarSprite(nomeLado === "jogador" ? "sprite-jogador" : "sprite-oponente", "animando-ataque");

  if (contra.protegido && golpe.poder > 0 && !habilidadeDe(quem)?.ignoraProtecao) {
    contra.protegido = false;
    estadoBatalha.log.push(`${contra.nome} bloqueou o ataque com seu Escudo!`);
    return;
  }

  const efeitoAplicado = aplicarEfeitoGolpe(golpe, quem, contra, estadoBatalha);
  const { dano: danoBase, mensagemExtra } = calcularDanoComHabilidades(
    quem,
    contra,
    golpe,
    efetividade,
    agiuPrimeiro,
    estadoBatalha
  );
  const dano = Math.max(0, danoBase || 0) + Math.max(0, efeitoAplicado.danoExtra || 0);
  contra._ultimoDanoRecebido = dano;
  quem._ultimoDanoCausado = dano;
  contra.hpAtual = Math.max(0, contra.hpAtual - dano);
  if (contra._barreiraAtiva) contra._barreiraAtiva = false;
  if (quem._desejoDragaoTurno === estadoBatalha.turno && golpe?.codigo !== "GA007") delete quem._desejoDragaoTurno;

  if (dano > 0) {
    animarSprite(nomeLado === "jogador" ? "sprite-oponente" : "sprite-jogador", "animando-atingido");
  }

  let msg = mensagemExtra || efeitoAplicado.mensagem || `${quem.nome} usou ${golpe.nome}!`;
  if (!mensagemExtra) {
    if (efetividade === 0) {
      msg = `${quem.nome} usou ${golpe.nome}, mas não afetou ${contra.nome}...`;
    } else {
      if (dano > 0) msg += ` (${dano} de dano)`;
      if (efetividade > 1) msg += " É super efetivo!";
      else if (efetividade < 1) msg += " Não foi muito efetivo...";
    }
  }
  estadoBatalha.log.push(msg);

  if (efetividade !== 0) {
    const hAtacante = habilidadeDe(quem);
    if (hAtacante && hAtacante.aoAcertar) hAtacante.aoAcertar(quem, contra, golpe, estadoBatalha);
    const hAlvoAtingido = habilidadeDe(contra);
    if (contra.hpAtual > 0 && hAlvoAtingido && hAlvoAtingido.aoSerAtingido) hAlvoAtingido.aoSerAtingido(contra, quem, golpe, estadoBatalha);
    if (typeof processarItemAoAcertar === "function") processarItemAoAcertar(quem, contra, golpe, estadoBatalha);
  }

  if (contra.hpAtual <= 0) {
    const contraLado = nomeLado === "jogador" ? "oponente" : "jogador";
    estadoBatalha._ultimoDerrotado = contra;
    const desmaiouDeVerdade = tratarDesmaio(contra, contraLado);
    if (desmaiouDeVerdade) {
      const hQuem = habilidadeDe(quem);
      if (hQuem && hQuem.aoDerrotarInimigo) hQuem.aoDerrotarInimigo(quem, estadoBatalha);
    }
  }
}

// ---------- Processa as duas ações de um turno ----------
function processarTurno(acaoJogador, acaoOponente) {
  // Ações vindas pela rede carregam o código do golpe, não o objeto inteiro.
  if (acaoJogador.tipo === "atacar" && !acaoJogador.golpe) {
    acaoJogador = { ...acaoJogador, golpe: buscarGolpe(acaoJogador.codigoGolpe) };
  }
  if (acaoOponente.tipo === "atacar" && !acaoOponente.golpe) {
    acaoOponente = { ...acaoOponente, golpe: buscarGolpe(acaoOponente.codigoGolpe) };
  }

  if (acaoJogador.tipo === "trocar") {
    trocarAtivo("jogador", acaoJogador.indice);
    executarAtaque("oponente", acaoOponente.golpe, calcularEfetividadeComHabilidades(acaoOponente.golpe, oponenteAtivo(), jogadorAtivo()), true);
    finalizarTurno();
    return;
  }

  const jogador = jogadorAtivo();
  const oponente = oponenteAtivo();
  const golpeJogador = acaoJogador.golpe;
  const golpeOponente = acaoOponente.golpe;

  [
    { c: jogador, rival: oponente },
    { c: oponente, rival: jogador },
  ].forEach(({ c, rival }) => {
    if (c && c.hpAtual > 0) {
      const h = habilidadeDe(c);
      if (h && h.antesDoTurno) h.antesDoTurno(c, rival, estadoBatalha);
      if (typeof processarItemPrimeiroTurno === "function") processarItemPrimeiroTurno(c, rival, estadoBatalha);
    }
  });

  const efetividadeJogador = calcularEfetividadeComHabilidades(golpeJogador, jogador, oponente);
  const efetividadeOponente = calcularEfetividadeComHabilidades(golpeOponente, oponente, jogador);

  const prioridadeJogador = temHabilidadePrioridade(jogador, oponente, golpeJogador, efetividadeJogador);
  const prioridadeOponente = temHabilidadePrioridade(oponente, jogador, golpeOponente, efetividadeOponente);

  let ordem;
  if (prioridadeJogador && !prioridadeOponente) {
    ordem = ["jogador", "oponente"];
  } else if (prioridadeOponente && !prioridadeJogador) {
    ordem = ["oponente", "jogador"];
  } else {
    const jogadorPrimeiro =
      jogador.status.velocidade === oponente.status.velocidade
        ? Math.random() < 0.5
        : (estadoBatalha.reverse
            ? jogador.status.velocidade < oponente.status.velocidade
            : jogador.status.velocidade > oponente.status.velocidade);
    ordem = jogadorPrimeiro ? ["jogador", "oponente"] : ["oponente", "jogador"];
  }

  for (const nome of ordem) {
    if (estadoBatalha.terminou || estadoBatalha.aguardandoTrocaJogador || estadoBatalha.aguardandoTrocaOponente) break;
    const agiuPrimeiro = nome === ordem[0];
    const golpe = nome === "jogador" ? golpeJogador : golpeOponente;
    const efetividade = nome === "jogador" ? efetividadeJogador : efetividadeOponente;
    executarAtaque(nome, golpe, efetividade, agiuPrimeiro);
  }

  finalizarTurno();
}

function finalizarTurno() {
  if (!estadoBatalha.terminou && !estadoBatalha.aguardandoTrocaJogador && !estadoBatalha.aguardandoTrocaOponente) {
    const jogador = jogadorAtivo();
    const oponente = oponenteAtivo();
    [
      { c: jogador, lado: "jogador" },
      { c: oponente, lado: "oponente" },
    ].forEach(({ c, lado }) => {
      if (c.hpAtual > 0 && c.statusAlterado === "queimado") {
        const dano = Math.max(1, Math.floor(c.status.hpMax / 16));
        c.hpAtual = Math.max(0, c.hpAtual - dano);
        estadoBatalha.log.push(`${c.nome} sofre com a Queimadura! (${dano} de dano)`);
        if (c.hpAtual <= 0) tratarDesmaio(c, lado);
      }
    });

    if (!estadoBatalha.terminou) {
      [
        { c: jogadorAtivo(), rival: oponenteAtivo() },
        { c: oponenteAtivo(), rival: jogadorAtivo() },
      ].forEach(({ c, rival }) => {
        if (c && c.hpAtual > 0) {
          const h = habilidadeDe(c);
          if (h && h.aoFimDoTurno) h.aoFimDoTurno(c, estadoBatalha);
          if (typeof processarItemFimDoTurno === "function") processarItemFimDoTurno(c, rival, estadoBatalha);
        }
      });

      // Dano contínuo da Noite Estrelada: 1/6 do HP máximo do adversário.
      if (estadoBatalha.noiteEstreladaDono && estadoBatalha.noiteEstreladaDreno > 0) {
        const dono = estadoBatalha.noiteEstreladaDono;
        const alvoNoite = jogadorAtivo() === dono ? oponenteAtivo() : (oponenteAtivo() === dono ? jogadorAtivo() : null);
        if (alvoNoite && alvoNoite.hpAtual > 0) {
          const danoNoite = Math.max(1, Math.floor(alvoNoite.status.hpMax * estadoBatalha.noiteEstreladaDreno));
          alvoNoite.hpAtual = Math.max(0, alvoNoite.hpAtual - danoNoite);
          estadoBatalha.log.push(`${alvoNoite.nome} sofre com a Noite Estrelada! (${danoNoite} de dano)`);
          if (alvoNoite.hpAtual <= 0) {
            tratarDesmaio(alvoNoite, jogadorAtivo() === alvoNoite ? "jogador" : "oponente");
          }
        }
      }

      if (estadoBatalha.reverse) {
        estadoBatalha.reverseTurnos = Math.max(0, (estadoBatalha.reverseTurnos || 0) - 1);
        if (estadoBatalha.reverseTurnos === 0) {
          estadoBatalha.reverse = false;
          estadoBatalha.log.push("O efeito de Reverse terminou!");
        }
      }

      // O debuff do Desejo do Dragão vale somente durante o turno seguinte.
      [jogadorAtivo(), oponenteAtivo()].forEach(c => {
        if (c && c._desejoDragaoTurno !== undefined && c._desejoDragaoTurno < estadoBatalha.turno + 1) delete c._desejoDragaoTurno;
      });

      estadoBatalha.turno = (estadoBatalha.turno || 0) + 1;
    }
  }

  renderizarBatalha();
}

// ---------- Chamado pela UI: jogador escolheu atacar ou trocar ----------
function executarAcaoJogador(acao) {
  if (!estadoBatalha || estadoBatalha.terminou || estadoBatalha.aguardandoTrocaJogador || estadoBatalha.aguardandoTrocaOponente) return;

  const acaoResolvida =
    acao.tipo === "trocar"
      ? acao
      : { tipo: "atacar", codigoGolpe: acao.codigoGolpe };

  // No PvP, os dois jogadores enviam somente a própria ação.
  // O host recebe as duas e é o único que calcula dano/aleatoriedade.
  if (estadoBatalha.multiplayer) {
    if (typeof informarAcaoMultiplayerLocal === "function") {
      informarAcaoMultiplayerLocal(acaoResolvida);
    }
    return;
  }

  const jogador = jogadorAtivo();
  const oponente = oponenteAtivo();

  const oponenteAtual = oponenteAtivo();
  const dificuldade = estadoBatalha.dificuldade || "normal";
  // IA difícil/expert pode trocar quando o ativo está em clara desvantagem.
  if (dificuldade !== "facil" && oponenteAtual && estadoBatalha.timeOponente.length > 1) {
    const vivos = estadoBatalha.timeOponente.map((m,i)=>({m,i})).filter(x=>x.m.hpAtual>0 && x.i!==estadoBatalha.ativoOponente);
    const atualEf = (oponenteAtual.tipo && jogador.tipo) ? calcularEfetividade(jogador.golpesConhecidos?.length ? (buscarGolpe(jogador.golpesConhecidos[0])?.tipo||"Normal") : "Normal", oponenteAtual.tipo) : 1;
    if (vivos.length && atualEf > 1 && Math.random() < (dificuldade === "expert" ? .55 : .35)) {
      let melhor=vivos[0], melhorScore=-Infinity;
      vivos.forEach(x=>{const melhorGolpe=(x.m.golpesConhecidos||[]).map(buscarGolpe).filter(Boolean).reduce((mx,g)=>Math.max(mx,calcularEfetividadeComHabilidades(g,x.m,jogador)*(Number(g.poder)||0)),0); if(melhorGolpe>melhorScore){melhorScore=melhorGolpe;melhor=x;}});
      if(melhorScore>0){ processarTurno(acao.tipo === "trocar" ? acao : {tipo:"atacar",golpe:buscarGolpe(acao.codigoGolpe)}, {tipo:"trocar",indice:melhor.i}); return; }
    }
  }
  const codigosOponente = (oponenteAtual.golpesConhecidos || []).filter(Boolean);
  const golpesOponente = codigosOponente.map(buscarGolpe).filter(Boolean);
  let golpeOponente = golpesOponente[Math.floor(Math.random() * golpesOponente.length)] || golpesOponente[0];
  if (dificuldade !== "facil" && golpesOponente.length) {
    const avaliados = golpesOponente.map((g) => {
      const ef = calcularEfetividadeComHabilidades(g, oponenteAtual, jogador);
      const stab = String(oponenteAtual.tipo || "").split("/").map(x => x.trim()).includes(g.tipo) ? 1.5 : 1;
      const poder = Number(g.poder) || 0;
      let score = (ef * poder * stab);
      if (g.categoria === "Especial") score *= (oponenteAtual.status.ataqueEspecial / Math.max(1, jogador.status.defesaEspecial));
      else score *= (oponenteAtual.status.ataque / Math.max(1, jogador.status.defesa));
      if (jogador.hpAtual / jogador.status.hpMax < 0.35 && ef > 1) score *= 1.25;
      return { g, score };
    }).sort((a,b)=>b.score-a.score);
    const janela = dificuldade === "expert" ? 1 : dificuldade === "dificil" ? Math.min(2, avaliados.length) : Math.min(3, avaliados.length);
    golpeOponente = avaliados[Math.floor(Math.random() * janela)].g;
  }
  const acaoOponente = { tipo: "atacar", golpe: golpeOponente };

  processarTurno(
    acao.tipo === "trocar" ? acao : { tipo: "atacar", golpe: buscarGolpe(acao.codigoGolpe) },
    acaoOponente
  );
}

function escolherTrocaForcada(indice) {
  if (!estadoBatalha.aguardandoTrocaJogador) return;

  if (estadoBatalha.multiplayer && mpPapel === "guest") {
    mpEnviar("battle-action", { acao: { tipo: "troca-forcada", indice } });
    estadoBatalha.aguardandoTrocaJogador = false; // otimista — o host confirma no próximo estado
    renderizarBatalha();
    return;
  }

  trocarAtivo("jogador", indice);
  estadoBatalha.aguardandoTrocaJogador = false;
  renderizarBatalha();

  if (estadoBatalha.multiplayer && mpPapel === "host" && typeof mpEnviar === "function") {
    mpEnviar("battle-state", { estado: estadoBatalha });
  }
}

function escolherTrocaVoluntaria(indice) {
  executarAcaoJogador({ tipo: "trocar", indice });
}

// ---------- Modal de troca voluntária ----------
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-fechar-modal-troca]").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelector('[data-modal="troca"]').hidden = true;
    });
  });
  const modalTroca = document.querySelector('[data-modal="troca"]');
  if (modalTroca) {
    modalTroca.addEventListener("click", (e) => {
      if (e.target === modalTroca) modalTroca.hidden = true;
    });
  }
});

function abrirModalTroca() {
  const modal = document.querySelector('[data-modal="troca"]');
  const lista = document.getElementById("lista-troca");
  renderizarOpcoesTime(lista, estadoBatalha.timeJogador, estadoBatalha.ativoJogador, (i) => {
    modal.hidden = true;
    escolherTrocaVoluntaria(i);
  });
  modal.hidden = false;
}

function renderizarOpcoesTime(container, time, ativoIndex, aoClicar) {
  container.innerHTML = "";
  time.forEach((m, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "opcao-item";
    const desmaiado = m.hpAtual <= 0;
    const ativo = i === ativoIndex;
    btn.disabled = desmaiado || ativo;
    let estadoTexto = "";
    if (desmaiado) estadoTexto = " · desmaiado";
    else if (ativo) estadoTexto = " · em campo";
    btn.innerHTML = `<span>${m.nome} Nv.${m.nivel}</span><span class="golpe-info">${m.hpAtual}/${m.status.hpMax} HP${estadoTexto}</span>`;
    btn.addEventListener("click", () => aoClicar(i));
    container.appendChild(btn);
  });
}

// ---------- Renderização ----------
function renderizarBarraHp(elId, combatente) {
  const el = document.getElementById(elId);
  const pct = Math.max(0, Math.round((combatente.hpAtual / combatente.status.hpMax) * 100));
  el.querySelector(".hp-preenchimento").style.width = `${pct}%`;
  el.querySelector(".hp-preenchimento").classList.toggle("hp-baixo", pct <= 25);
}

const ROTULOS_STATUS = { queimado: "🔥 Queimado", confuso: "💫 Confuso", cego: "🌑 Cego" };
const NOMES_STAT = { ataque: "ATK", defesa: "DEF", ataqueEspecial: "SAT", defesaEspecial: "SDF", velocidade: "VEL" };

function renderizarModificadores(elId, combatente) {
  const el = document.getElementById(elId);
  el.innerHTML = "";

  if (combatente.statusOriginal) {
    Object.keys(NOMES_STAT).forEach((stat) => {
      const original = combatente.statusOriginal[stat];
      const atual = combatente.status[stat];
      if (!original) return;
      const pct = Math.round((atual / original - 1) * 100);
      if (Math.abs(pct) < 1) return;

      const chip = document.createElement("span");
      chip.className = "chip-mod " + (pct > 0 ? "buff" : "nerf");
      chip.textContent = `${pct > 0 ? "+" : ""}${pct}% ${NOMES_STAT[stat]}`;
      el.appendChild(chip);
    });
  }

  if (combatente.statusAlterado) {
    const chip = document.createElement("span");
    chip.className = "chip-mod nerf";
    chip.textContent = ROTULOS_STATUS[combatente.statusAlterado] || combatente.statusAlterado;
    el.appendChild(chip);
  }
}

function renderizarCombatente(prefixo, combatente) {
  document.getElementById(`nome-${prefixo}`).textContent = combatente.nome;
  document.getElementById(`nivel-${prefixo}`).textContent = `Nv.${combatente.nivel}`;

  const caixaHab = document.getElementById(`caixa-habilidade-${prefixo}`);
  if (combatente.habilidade) {
    caixaHab.textContent = typeof nomeHabilidade === "function" ? nomeHabilidade(combatente.habilidade) : combatente.habilidade;
    caixaHab.hidden = false;
  } else {
    caixaHab.hidden = true;
  }

  const caixaItem = document.getElementById(`caixa-item-${prefixo}`);
  if (caixaItem) {
    const item = typeof itemDe === "function" ? itemDe(combatente) : null;
    const ativo = typeof itemAtivo === "function" ? itemAtivo(combatente) : null;
    if (item) {
      const png = item.png
        ? `<img class="thumb-item-mini" src="Png-Itens/${item.png}" alt="" onerror="this.style.display='none'">`
        : "";
      caixaItem.innerHTML = `${png}🎒 ${item.nome}${ativo ? "" : " (inativo)"}`;
    } else {
      caixaItem.innerHTML = "";
    }
    caixaItem.hidden = !item;
  }

  renderizarBarraHp(`hp-${prefixo}`, combatente);
  document.getElementById(`hp-texto-${prefixo}`).textContent = `${combatente.hpAtual} / ${combatente.status.hpMax}`;
  renderizarModificadores(`mods-${prefixo}`, combatente);
}

function renderizarBatalha() {
  const { timeJogador, timeOponente, ativoJogador, ativoOponente, log, terminou, vencedor, aguardandoTrocaJogador } =
    estadoBatalha;
  const jogador = timeJogador[ativoJogador];
  const oponente = timeOponente[ativoOponente];

  document.getElementById("fundo-arena").src = resolverImagemCampo(
    estadoBatalha.chuva,
    estadoBatalha.estrelado,
    estadoBatalha.florido,
    estadoBatalha.campoBatalha
  );

  renderizarCombatente("jogador", jogador);
  renderizarCombatente("oponente", oponente);

  document.getElementById("status-time-jogador").textContent =
    timeJogador.length > 1
      ? `Seu time: ${timeJogador.filter((m) => m.hpAtual > 0).length}/${timeJogador.length} vivos`
      : "";
  document.getElementById("status-time-oponente").textContent =
    timeOponente.length > 1
      ? `Time rival: ${timeOponente.filter((m) => m.hpAtual > 0).length}/${timeOponente.length} vivos`
      : "";

  const imgJogador = document.getElementById("sprite-jogador");
  imgJogador.src = jogador.png ? `PNG/${jogador.png}` : "";
  imgJogador.style.visibility = jogador.png ? "visible" : "hidden";

  const imgOponente = document.getElementById("sprite-oponente");
  imgOponente.src = oponente.png ? `PNG/${oponente.png}` : "";
  imgOponente.style.visibility = oponente.png ? "visible" : "hidden";

  const logEl = document.getElementById("log-batalha");
  logEl.innerHTML = log
    .slice(-4)
    .map((l) => `<p>${l}</p>`)
    .join("");
  logEl.scrollTop = logEl.scrollHeight;

  const golpesEl = document.getElementById("golpes-jogador");
  const painelFim = document.getElementById("painel-fim-batalha");
  const avisoTroca = document.getElementById("aviso-troca-forcada");
  const modalTroca = document.querySelector('[data-modal="troca"]');

  if (terminou) {
    if (vencedor === "jogador" && typeof desbloquearConquista === "function") { desbloquearConquista("batalha"); if (contextoBatalhaAtual === "multiplayer") desbloquearConquista("multiplayer"); }
    golpesEl.hidden = true;
    avisoTroca.hidden = true;
    modalTroca.hidden = true;
    painelFim.hidden = false;
    painelFim.querySelector(".resultado-batalha").textContent =
      vencedor === "jogador" ? "Você venceu!" : "Você perdeu...";
    painelFim.querySelector(".resultado-batalha").className =
      "resultado-batalha " + (vencedor === "jogador" ? "vitoria" : "derrota");

    ultimoVencedorRoguelike = vencedor;
    const botoesPratica = document.getElementById("botoes-fim-pratica");
    const botoesRoguelike = document.getElementById("botoes-fim-roguelike");
    const botoesMultiplayer = document.getElementById("botoes-fim-multiplayer");
    botoesPratica.hidden = contextoBatalhaAtual !== "pratica";
    botoesRoguelike.hidden = contextoBatalhaAtual !== "roguelike";
    if (botoesMultiplayer) botoesMultiplayer.hidden = contextoBatalhaAtual !== "multiplayer";
    if (contextoBatalhaAtual === "roguelike") {
      botoesRoguelike.querySelector("span").textContent =
        vencedor === "jogador" ? "Continuar a Rota" : "Encerrar Run";
    }
    return;
  }

  painelFim.hidden = true;

  if (aguardandoTrocaJogador) {
    avisoTroca.textContent = "Seu monstro desmaiou! Escolha o próximo.";
    avisoTroca.hidden = false;
    golpesEl.hidden = false;
    golpesEl.innerHTML = "";
    renderizarOpcoesTime(golpesEl, timeJogador, ativoJogador, escolherTrocaForcada);
    return;
  }

  if (estadoBatalha.multiplayer && estadoBatalha.aguardandoTrocaOponente) {
    avisoTroca.textContent = "O monstro do oponente desmaiou — aguardando ele escolher o próximo...";
    avisoTroca.hidden = false;
    golpesEl.hidden = true;
    return;
  }

  avisoTroca.hidden = true;
  golpesEl.hidden = false;
  golpesEl.innerHTML = "";
  jogador.golpesConhecidos.forEach((codigo) => {
    const golpe = buscarGolpe(codigo);
    if (!golpe) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "botao-golpe";
    btn.innerHTML = `<span class="golpe-nome">${golpe.nome}</span><span class="golpe-info">${golpe.tipo} · Poder ${golpe.poder}</span>`;
    btn.addEventListener("click", () => executarAcaoJogador({ tipo: "atacar", codigoGolpe: codigo }));
    golpesEl.appendChild(btn);
  });

  if (timeJogador.length > 1) {
    const btnTrocar = document.createElement("button");
    btnTrocar.type = "button";
    btnTrocar.className = "botao-golpe botao-trocar";
    btnTrocar.innerHTML = `<span class="golpe-nome">🔄 Trocar Monstro</span>`;
    btnTrocar.addEventListener("click", abrirModalTroca);
    golpesEl.appendChild(btnTrocar);
  }
}
