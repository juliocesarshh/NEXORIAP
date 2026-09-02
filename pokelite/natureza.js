// Naturezas do NEXORIA.
// As 25 naturezas comuns seguem a mesma lógica de Pokémon:
// +10% em um atributo e -10% em outro. As 5 neutras não alteram atributos.
// "Divino" é uma natureza extremamente rara e concede +7% em TODOS os status,
// incluindo HP máximo.
const NATUREZAS = [
  {id:'Equilibrado', bonus:null, penalidade:null, desc:'Sem alteração de status'},
  {id:'Solitário', bonus:'ataque', penalidade:'defesa', desc:'+10% Ataque / -10% Defesa'},
  {id:'Impetuoso', bonus:'ataque', penalidade:'velocidade', desc:'+10% Ataque / -10% Velocidade'},
  {id:'Determinado', bonus:'ataque', penalidade:'ataqueEspecial', desc:'+10% Ataque / -10% Sp.A'},
  {id:'Rebelde', bonus:'ataque', penalidade:'defesaEspecial', desc:'+10% Ataque / -10% Sp.D'},
  {id:'Destemido', bonus:'defesa', penalidade:'ataque', desc:'+10% Defesa / -10% Ataque'},
  {id:'Sereno', bonus:null, penalidade:null, desc:'Sem alteração de status'},
  {id:'Tranquilo', bonus:'defesa', penalidade:'velocidade', desc:'+10% Defesa / -10% Velocidade'},
  {id:'Travesso', bonus:'defesa', penalidade:'ataqueEspecial', desc:'+10% Defesa / -10% Sp.A'},
  {id:'Despreocupado', bonus:'defesa', penalidade:'defesaEspecial', desc:'+10% Defesa / -10% Sp.D'},
  {id:'Cauteloso', bonus:'velocidade', penalidade:'ataque', desc:'+10% Velocidade / -10% Ataque'},
  {id:'Apressado', bonus:'velocidade', penalidade:'defesa', desc:'+10% Velocidade / -10% Defesa'},
  {id:'Sério', bonus:null, penalidade:null, desc:'Sem alteração de status'},
  {id:'Alegre', bonus:'velocidade', penalidade:'ataqueEspecial', desc:'+10% Velocidade / -10% Sp.A'},
  {id:'Inocente', bonus:'velocidade', penalidade:'defesaEspecial', desc:'+10% Velocidade / -10% Sp.D'},
  {id:'Reservado', bonus:null, penalidade:null, desc:'Sem alteração de status'},
  {id:'Modesto', bonus:'ataqueEspecial', penalidade:'ataque', desc:'+10% Sp.A / -10% Ataque'},
  {id:'Suave', bonus:'ataqueEspecial', penalidade:'defesa', desc:'+10% Sp.A / -10% Defesa'},
  {id:'Silencioso', bonus:'ataqueEspecial', penalidade:'velocidade', desc:'+10% Sp.A / -10% Velocidade'},
  {id:'Audacioso', bonus:'ataqueEspecial', penalidade:'defesaEspecial', desc:'+10% Sp.A / -10% Sp.D'},
  {id:'Peculiar', bonus:null, penalidade:null, desc:'Sem alteração de status'},
  {id:'Calmo', bonus:'defesaEspecial', penalidade:'ataque', desc:'+10% Sp.D / -10% Ataque'},
  {id:'Gentil', bonus:'defesaEspecial', penalidade:'defesa', desc:'+10% Sp.D / -10% Defesa'},
  {id:'Atrevido', bonus:'defesaEspecial', penalidade:'velocidade', desc:'+10% Sp.D / -10% Velocidade'},
  {id:'Prudente', bonus:'defesaEspecial', penalidade:'ataqueEspecial', desc:'+10% Sp.D / -10% Sp.A'},
  // Natureza especial: não participa da distribuição normal.
  {id:'Divino', bonus:'todos', penalidade:null, desc:'+7% em todos os Status — extremamente rara', rara:true}
];

const NATUREZAS_COMUNS = NATUREZAS.filter(n => !n.rara);

// Divino tem 1% de chance. Os outros 25 dividem os 99% restantes igualmente.
function naturezaAleatoria(){
  if (Math.random() < 0.01) return NATUREZAS.find(n => n.id === 'Divino');
  return NATUREZAS_COMUNS[Math.floor(Math.random() * NATUREZAS_COMUNS.length)];
}

function naturezaPorId(id){
  return NATUREZAS.find(n=>n.id===id)||NATUREZAS_COMUNS[0];
}

function aplicarNatureza(status,natureza){
  const n=typeof natureza==='string'?naturezaPorId(natureza):natureza;
  if(!n)return status;

  if(n.bonus==='todos'){
    // Divino afeta os seis status exibidos no NEXORIA.
    for(const chave of ['hpMax','ataque','defesa','ataqueEspecial','defesaEspecial','velocidade']){
      if(status[chave]!=null) status[chave]=Math.max(1,Math.floor(status[chave]*1.07));
    }
    return status;
  }

  if(n.bonus && status[n.bonus]!=null) status[n.bonus]=Math.max(1,Math.floor(status[n.bonus]*1.10));
  if(n.penalidade && status[n.penalidade]!=null) status[n.penalidade]=Math.max(1,Math.floor(status[n.penalidade]*0.90));
  return status;
}

window.NATUREZAS=NATUREZAS;
window.naturezaAleatoria=naturezaAleatoria;
window.naturezaPorId=naturezaPorId;
window.aplicarNatureza=aplicarNatureza;
