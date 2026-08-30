// ---------- Sistema de Habilidades por CÓDIGO ----------
// Monstros armazenam somente o código (ex.: H001). O nome é apenas apresentação.
// Assim, alterar o nome de uma habilidade não quebra os dados dos monstros.
const HABILIDADE_NOMES = {
  H001: "Kaiju", H002: "Get Over Here", H003: "Chove Chuva Chove sem Parar",
  H004: "Mais que Nada", H005: "Rei dos Ringues", H006: "Sangue de um Deus",
  H007: "Donquexote", H008: "Cegueira", H009: "No Fire", H010: "Sentinela Noturna",
  H011: "Predator", H012: "Dragão Celestial", H013: "Domínio das Águas", H014: "9 Vidas",
  H015: "Fúria Colossal", H016: "Noite Lunar", H017: "Reino Glacial", H018: "Olhos de Fogo",
  H019: "Galope Maldito", H020: "Aposta Brutal", H021: "Encanto das Águas",
  H022: "StarPlatinum", H023: "Matrix", H024: "Deus Da Guerra", H025: "Brecha",
  H026: "Invencível", H027: "Contra ataque", H028: "BattleForm", H029: "Boto Rosa",
};
const HABILIDADE_CODIGOS = Object.fromEntries(Object.entries(HABILIDADE_NOMES).map(([c,n])=>[n,c]));

const HABILIDADES = {
  H001: { aoEntrar(proprio, oponente, batalha) { const dano=Math.max(1,Math.floor(oponente.status.hpMax*.1)); oponente.hpAtual=Math.max(0,oponente.hpAtual-dano); batalha.log.push(`${proprio.nome} provoca um pequeno terremoto! ${oponente.nome} perde ${dano} de HP.`); } },
  H002: { temPrioridade(proprio, alvo, golpe, efetividade) { return efetividade > 1; } },
  H003: { aoEntrar(proprio, oponente, batalha) { proprio.status.velocidade=Math.floor(proprio.status.velocidade*1.5); batalha.chuva=true; batalha.log.push(`${proprio.nome} traz a chuva! Velocidade aumentada.`); } },
  H004: {},
  H005: { chanceNocauteImediato:.05 },
  H006: { sobrescreverEfetividade(tipoGolpe, tiposAlvoTexto, padrao) { const sem=["Água","Fogo","Pedra","Dragão","Terra"]; const superE=["Elétrico","Psíquico","Pedra","Dragão","Fantasma","Dark","Fada","Lutador","Inseto"]; const ts=tiposAlvoTexto.split('/').map(t=>t.trim()); if(ts.some(t=>sem.includes(t)))return 0; if(ts.some(t=>superE.includes(t)))return Math.max(padrao,2); return null; } },
  H007: { aoEntrar(proprio, oponente, batalha) { oponente.status.ataque=Math.floor(oponente.status.ataque*.65); batalha.log.push(`A presença de ${proprio.nome} intimida ${oponente.nome}! Ataque reduzido.`); } },
  H008: { aoAcertar(proprio, alvo, golpe, batalha) { if(estaImune(alvo,'cego'))return; if(Math.random()<.3){alvo.statusAlterado='cego'; batalha.log.push(`${alvo.nome} ficou Cego!`);} } },
  H009: { sobrescreverEfetividade(tipoGolpe, tiposAlvoTexto, padrao) { if(tipoGolpe==='Fogo'&&padrao>1)return 1; return null; } },
  H010: { aoEntrar(proprio, oponente, batalha) { proprio.status.defesa=Math.floor(proprio.status.defesa*1.5); batalha.log.push(`${proprio.nome} se prepara para a noite! Defesa aumentada.`); }, imunidades:['cego'] },
  H011: { aoDerrotarInimigo(proprio,batalha){ proprio.status.ataque=Math.floor(proprio.status.ataque*1.5); batalha.log.push(`${proprio.nome} fica ainda mais forte após a vitória!`); } },
  H012: { antesDoTurno(proprio,oponente,batalha){ if(!proprio._despertou&&proprio.hpAtual/proprio.status.hpMax<=.33){proprio.status.ataque=Math.floor(proprio.status.ataque*1.3); proprio.status.defesa=Math.floor(proprio.status.defesa*1.3); proprio._despertou=true; batalha.log.push(`${proprio.nome} desperta sua natureza dracônica!`);} }, aoDerrotarInimigo(proprio,batalha){proprio.status.ataque=Math.floor(proprio.status.ataque*1.35); batalha.log.push(`${proprio.nome} fica ainda mais forte após a vitória!`);} },
  H013: { sobrescreverEfetividade(tipoGolpe){ return tipoGolpe==='Água'?0:null; } },
  H014: { aoDesmaiar(proprio,batalha){proprio._vidasUsadas=proprio._vidasUsadas||0; if(proprio._vidasUsadas<9&&Math.random()<.5){proprio._vidasUsadas++;proprio.hpAtual=1;batalha.log.push(`${proprio.nome} sobrevive com 1 HP! (vida ${proprio._vidasUsadas}/9)`);return true;}return false;} },
  H015: { modificarAtaque(proprio){const perdido=1-proprio.hpAtual/proprio.status.hpMax;return Math.floor(proprio.status.ataque*(1+Math.min(1,perdido)));} },
  H016: { aoEntrar(proprio,oponente,batalha){batalha.campoNoturno=true;batalha.estrelado=true;batalha.log.push('A noite cai sobre o campo de batalha...');} },
  H017: { aoEntrar(proprio,oponente,batalha){batalha.log.push(`${proprio.nome} cobre o campo de neve...`);} },
  H018: { aoAcertar(proprio,alvo,golpe,batalha){if(golpe.tipo!=='Fogo'||estaImune(alvo,'queimado'))return;if(Math.random()<.3){alvo.statusAlterado='queimado';batalha.log.push(`${alvo.nome} foi Queimado!`);}} },
  H019: { modificarAtaque(proprio,alvo,golpe,agiuPrimeiro){if(agiuPrimeiro&&alvo.hpAtual/alvo.status.hpMax<.5)return Math.floor(proprio.status.ataque*1.3);return proprio.status.ataque;} },
  H020: { antesDoTurno(proprio,oponente,batalha){if(!proprio._estadoLunar&&proprio.hpAtual/proprio.status.hpMax<.25){proprio.status.ataque=Math.floor(proprio.status.ataque*2);proprio.status.defesa=Math.floor(proprio.status.defesa*.1);proprio._estadoLunar=true;batalha.log.push(`${proprio.nome} entra em Estado Lunar!`);}} },
  H021: { aoEntrar(proprio,oponente,batalha){if(estaImune(oponente,'confuso'))return;if(Math.random()<.3){oponente.statusAlterado='confuso';batalha.log.push(`${oponente.nome} ficou Confuso pelo canto de ${proprio.nome}!`);}} },

  // NOVAS
  H022: { aoEntrar(proprio){ if(!proprio._starPlatinum){proprio.status.ataque=Math.floor(proprio.status.ataque*1.13);proprio._starPlatinum=true;} } },
  H023: { nuncaErra:true },
  H024: { aoEntrar(proprio,oponente,batalha){ batalha.campoBatalha=true; const ch=['hpMax','ataque','defesa','ataqueEspecial','defesaEspecial','velocidade']; const s=ch[Math.floor(Math.random()*ch.length)]; if(s==='hpMax'){const antes=proprio.status.hpMax;proprio.status.hpMax=Math.floor(antes*1.1);proprio.hpAtual=Math.min(proprio.status.hpMax,proprio.hpAtual+proprio.status.hpMax-antes);} else proprio.status[s]=Math.floor(proprio.status[s]*1.1); batalha.statusCampoBatalha=s; batalha.log.push(`${proprio.nome} invoca o Campo de Batalha! ${nomeStatus(s)} recebeu +10%.`); } },
  H025: { aoErroDoOponente(proprio,oponente,batalha){ const golpes=(proprio.golpesConhecidos||[]).filter(Boolean); if(!golpes.length)return; const g=buscarGolpeGlobal(golpes[Math.floor(Math.random()*golpes.length)]); if(!g||g.poder<=0)return; const ef=calcularEfetividadeGlobal(g,proprio,oponente); const r=calcularDanoGlobal(proprio,oponente,g,ef,batalha)*.5; const dano=Math.max(1,Math.floor(r)); oponente.hpAtual=Math.max(0,oponente.hpAtual-dano); batalha.log.push(`${proprio.nome} ativa Brecha e contra-ataca com ${g.nome}! (${dano} de dano)`); if(oponente.hpAtual<=0)batalha._brechaNocaute=true; } },
  H026: { aoFimDoTurno(proprio,batalha){ if(proprio.hpAtual<=0)return; proprio._turnosInvencivel=(proprio._turnosInvencivel||0)+1; if(proprio._turnosInvencivel===6&&!proprio._invencivelAtivado){ for(const s of ['ataque','defesa','ataqueEspecial','defesaEspecial','velocidade']) proprio.status[s]=Math.floor(proprio.status[s]*1.5); proprio.status.hpMax=Math.floor(proprio.status.hpMax*1.5); proprio.hpAtual=Math.min(proprio.status.hpMax,Math.floor(proprio.hpAtual*1.5)); proprio._invencivelAtivado=true; batalha.log.push(`${proprio.nome} permaneceu 5 turnos de pé e tornou-se INVENCÍVEL! +50% em todos os status.`); } } },
  H027: { aoTrocarEntrar(proprio,oponente,batalha){ const golpes=(proprio.golpesConhecidos||[]).filter(Boolean); if(!golpes.length)return; const g=buscarGolpeGlobal(golpes[Math.floor(Math.random()*golpes.length)]); if(!g||g.poder<=0)return; const ef=calcularEfetividadeGlobal(g,proprio,oponente); const dano=Math.max(1,Math.floor(calcularDanoGlobal(proprio,oponente,g,ef,batalha)*.5)); oponente.hpAtual=Math.max(0,oponente.hpAtual-dano); batalha.log.push(`${proprio.nome} entra com Contra ataque usando ${g.nome}! (${dano} de dano)`); if(oponente.hpAtual<=0)batalha._contraAtaqueNocaute=true; } },
  H028: { aoDerrotarInimigo(proprio,batalha){ if(proprio._battleForm)return; proprio._battleForm=true; proprio.status.ataque=Math.floor(proprio.status.ataque*1.5); proprio.status.ataqueEspecial=Math.floor(proprio.status.ataqueEspecial*1.5); proprio.formaAnterior={nome:proprio.nome,tipo:proprio.tipo,png:proprio.png}; const rival=batalha._ultimoDerrotado; if(rival){proprio.nome=rival.nome;proprio.tipo=rival.tipo;proprio.png=rival.png;} batalha.log.push(`${proprio.formaAnterior.nome} assume uma nova BattleForm! +50% de Ataque e Ataque Especial.`); } },
  H029: { aoDerrotarInimigo(proprio,batalha){ const rival=batalha._ultimoDerrotado; if(!rival)return; proprio.nome=rival.nome; proprio.tipo=rival.tipo; proprio.png=rival.png; batalha.log.push(`${proprio.formaAnteriorNome||'O Boto'} copia ${rival.nome}: aparência e tipagem herdadas, mantendo seus próprios golpes!`); } },
};

function habilidadeDe(monstro){ return monstro && monstro.habilidade ? HABILIDADES[monstro.habilidade]||null : null; }
function nomeHabilidade(codigo){ return HABILIDADE_NOMES[codigo]||codigo||''; }
function codigoHabilidade(nome){ return HABILIDADE_CODIGOS[nome]||nome||''; }
function estaImune(monstro,status){const h=habilidadeDe(monstro);return !!(h&&h.imunidades&&h.imunidades.includes(status));}
function nomeStatus(s){return ({hpMax:'HP',ataque:'Ataque',defesa:'Defesa',ataqueEspecial:'Ataque Especial',defesaEspecial:'Defesa Especial',velocidade:'Velocidade'})[s]||s;}

// Helpers usados pela Brecha/Contra ataque sem depender da ordem dos scripts.
function buscarGolpeGlobal(codigo){ return (typeof DADOS_GOLPES!=='undefined' ? DADOS_GOLPES.find(g=>g.codigo===codigo) : null); }
function calcularEfetividadeGlobal(g,a,t){ return (typeof calcularEfetividade==='function' ? calcularEfetividade(g.tipo,t.tipo) : 1); }
function calcularDanoGlobal(a,t,g,ef,b){ if(!g||g.poder<=0||ef===0)return 0; let atk=g.categoria==='Físico'?a.status.ataque:a.status.ataqueEspecial; let def=g.categoria==='Físico'?t.status.defesa:t.status.defesaEspecial; let base=(((2*a.nivel/5+2)*g.poder*(atk/def))/50+2); if(a.tipo.split('/').map(x=>x.trim()).includes(g.tipo))base*=1.5; if(a.statusAlterado==='queimado'&&g.categoria==='Físico')base*=.5; if(b.campoNoturno&&g.tipo==='Dark')base*=1.5; return Math.max(1,Math.floor(base*ef*(.85+Math.random()*.15))); }

const EFEITOS_DE_CAMPO_POR_NOME={Shalung:b=>{b.estrelado=true;},Sabic:b=>{b.florido=true;}};
