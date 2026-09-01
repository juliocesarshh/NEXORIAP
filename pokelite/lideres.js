// Times dos 8 Líderes de Ginásio + Chefão do Modo Roguelike.
// Os líderes são identificados por índice para que cada Ginásio use seu próprio time.

const LIDERES_GINASIO = [
  { numero: 1, nome: "Lampião", especialidade: "Fogo", nivel: [11, 12], time: [
    { numero: 4, nivel: 11 }, { numero: 5, nivel: 12 }
  ]},
  { numero: 2, nome: "Zelda", especialidade: "Planta", nivel: [18, 19], time: [
    { numero: 32, nivel: 18 }, { numero: 33, nivel: 18 }, { numero: 34, nivel: 19 }
  ]},
  { numero: 3, nome: "Lara", especialidade: "Água", nivel: [25, 26], time: [
    { numero: 7, nivel: 25 }, { numero: 8, nivel: 25 }, { numero: 9, nivel: 26 }
  ]},
  { numero: 4, nome: "Joseph", especialidade: "Dragão", nivel: [32, 33], time: [
    { numero: 29, nivel: 32 }, { numero: 74, nivel: 32 }, { numero: 57, nivel: 33 }
  ]},
  { numero: 5, nome: "Super Shock", especialidade: "Elétrico", nivel: [39, 40], time: [
    { numero: 59, nivel: 39 }, { numero: 60, nivel: 39 }, { numero: 61, nivel: 40 }
  ]},
  { numero: 6, nome: "Laya", especialidade: "Voador", nivel: [46, 47], time: [
    { numero: 23, nivel: 46 }, { numero: 44, nivel: 46 }, { numero: 49, nivel: 47 }
  ]},
  { numero: 7, nome: "Bruce Lee", especialidade: "Lutador", nivel: [53, 54], time: [
    { numero: 31, nivel: 53 }, { numero: 64, nivel: 53 }, { numero: 65, nivel: 54 }
  ]},
  { numero: 8, nome: "Bruxa do 71", especialidade: "Míticos Brasileiros", nivel: [60, 61], time: [
    { numero: 76, nivel: 60 }, { numero: 80, nivel: 60 }, { numero: 81, nivel: 61 }, { numero: 82, nivel: 61 }
  ]},
];

const CHEFAO_ROGUELIKE = {
  numero: 9,
  nome: "Everton",
  especialidade: "Os Monstros Mais Fortes",
  nivel: [70, 75],
  time: [
    { numero: 50, nivel: 70 }, // Shalung
    { numero: 51, nivel: 71 }, // Tempester
    { numero: 82, nivel: 72 }, // Saci
    { numero: 81, nivel: 72 }, // Cuca
    { numero: 80, nivel: 73 }, // Botamar
    { numero: 57, nivel: 75 }, // Komodraco
  ],
};

window.LIDERES_GINASIO = LIDERES_GINASIO;
window.CHEFAO_ROGUELIKE = CHEFAO_ROGUELIKE;

function gerarTimeLider(indice = 0) {
  const lider = LIDERES_GINASIO[indice];
  if (!lider || !lider.time?.length) return null;
  return lider.time.map((m) => criarInstanciaMonstro(m.numero, m.nivel)).filter(Boolean);
}

function gerarTimeLiderAtual() {
  return gerarTimeLider(0);
}

function gerarTimeChefe() {
  return CHEFAO_ROGUELIKE.time.map((m) => criarInstanciaMonstro(m.numero, m.nivel)).filter(Boolean);
}

function atribuirItensAoTreinador(time, chefe=false){
  const porTipo = {
    Fogo:['B004'], Planta:['B005'], Água:['B007'], Voador:['B006'], Lutador:['B008'], Psíquico:['B009'], Pedra:['B010'], Metal:['B011'], Fada:['B012'], Dragão:['B013'], Vento:['B014'], Inseto:['B015'], Elétrico:['B016'], Dark:['B017'], Ice:['B018'], Normal:['B019'], Veneno:['B020']
  };
  return time.map((m,i)=>{
    if(!m) return m;
    const tipos=String(m.tipo||'').split('/').map(x=>x.trim());
    const candidatos=tipos.flatMap(t=>porTipo[t]||[]);
    const codigo=candidatos[0] || (chefe ? 'B019' : null);
    if(codigo && typeof equiparItem==='function') equiparItem(m,codigo);
    return m;
  });
}
const _gerarTimeLider=gerarTimeLider;
gerarTimeLider=function(indice=0){ return atribuirItensAoTreinador(_gerarTimeLider(indice),false); };
const _gerarTimeChefe=gerarTimeChefe;
gerarTimeChefe=function(){ return atribuirItensAoTreinador(_gerarTimeChefe(),true); };
