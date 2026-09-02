// Times dos 8 Líderes de Ginásio + Chefão do Modo Roguelike.
const LIDERES_GINASIO = [
  { numero: 1, nome: "Lampião", especialidade: "Fogo", nivel: [13, 13], time: [
    { numero: 4, nivel: 13 }, { numero: 5, nivel: 13 }
  ]},
  { numero: 2, nome: "Zelda", especialidade: "Planta", nivel: [20, 20], time: [
    { numero: 32, nivel: 20 }, { numero: 33, nivel: 20 }, { numero: 34, nivel: 20 }
  ]},
  { numero: 3, nome: "Lara", especialidade: "Água", nivel: [30, 30], time: [
    { numero: 7, nivel: 30 }, { numero: 8, nivel: 30 }, { numero: 9, nivel: 30 }
  ]},
  { numero: 4, nome: "Joseph", especialidade: "Dragão", nivel: [40, 40], time: [
    { numero: 29, nivel: 40 }, { numero: 74, nivel: 40 }, { numero: 57, nivel: 40 }
  ]},
  { numero: 5, nome: "Super Shock", especialidade: "Elétrico", nivel: [50, 50], time: [
    { numero: 59, nivel: 50 }, { numero: 60, nivel: 50 }, { numero: 61, nivel: 50 }
  ]},
  { numero: 6, nome: "Laya", especialidade: "Voador", nivel: [60, 60], time: [
    { numero: 23, nivel: 60 }, { numero: 44, nivel: 60 }, { numero: 49, nivel: 60 }
  ]},
  { numero: 7, nome: "Bruce Lee", especialidade: "Lutador", nivel: [70, 70], time: [
    { numero: 31, nivel: 70 }, { numero: 64, nivel: 70 }, { numero: 65, nivel: 70 }
  ]},
  { numero: 8, nome: "Bruxa do 71", especialidade: "Míticos Brasileiros", nivel: [80, 80], time: [
    { numero: 76, nivel: 80 }, { numero: 80, nivel: 80 }, { numero: 81, nivel: 80 }, { numero: 82, nivel: 80 }
  ]},
];

const CHEFAO_ROGUELIKE = {
  numero: 9,
  nome: "Everton",
  especialidade: "Os Monstros Mais Fortes",
  nivel: [100, 100],
  time: [
    { numero: 50, nivel: 100 },
    { numero: 51, nivel: 100 },
    { numero: 82, nivel: 100 },
    { numero: 81, nivel: 100 },
    { numero: 80, nivel: 100 },
    { numero: 57, nivel: 100 },
  ],
};

window.LIDERES_GINASIO = LIDERES_GINASIO;
window.CHEFAO_ROGUELIKE = CHEFAO_ROGUELIKE;

function itemAleatorioParaTreinador(monstro, preferirForte = false) {
  if (!monstro || typeof DADOS_ITENS === "undefined") return;
  const tipos = String(monstro.tipo || "").split("/").map((x) => x.trim());
  const candidatos = (DADOS_ITENS || []).filter((item) => {
    if (!item || !item.codigo || ["evolucao_especifica","evolucao_proxima"].includes(item.efeito?.tipo)) return false;
    return !item.tipo || tipos.includes(item.tipo);
  });
  if (!candidatos.length) return;
  // Chefes e líderes tendem a usar os itens de maior impacto disponíveis.
  const ordenados = [...candidatos].sort((a,b) => {
    const pa = Number(a.efeito?.valor || a.efeito?.dano || Object.values(a.efeito?.valores || {}).reduce((x,v)=>x+Number(v||0),0));
    const pb = Number(b.efeito?.valor || b.efeito?.dano || Object.values(b.efeito?.valores || {}).reduce((x,v)=>x+Number(v||0),0));
    return pb-pa;
  });
  const item = preferirForte ? (ordenados[0] || candidatos[0]) : candidatos[Math.floor(Math.random()*candidatos.length)];
  if (typeof equiparItem === "function") equiparItem(monstro, item.codigo);
}

function gerarTimeLider(indice = 0) {
  const lider = LIDERES_GINASIO[indice];
  if (!lider || !lider.time?.length) return null;
  return lider.time.map((m) => {
    const instancia = criarInstanciaMonstro(m.numero, m.nivel);
    itemAleatorioParaTreinador(instancia, false);
    return instancia;
  }).filter(Boolean);
}
function gerarTimeLiderAtual() { return gerarTimeLider(0); }
function gerarTimeChefe() {
  return CHEFAO_ROGUELIKE.time.map((m) => {
    const instancia = criarInstanciaMonstro(m.numero, m.nivel);
    itemAleatorioParaTreinador(instancia, true);
    return instancia;
  }).filter(Boolean);
}
