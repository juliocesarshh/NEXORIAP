const CONQUISTAS_NEXORIA=[
{id:'primeiro-ginasio',nome:'Primeiro Ginásio',desc:'Derrote seu primeiro Líder.',icone:'🏆'},
{id:'cinco-ginasios',nome:'Escalando',desc:'Derrote 5 Ginásios.',icone:'🔥'},
{id:'campeao',nome:'Campeão',desc:'Derrote Everton.',icone:'👑'},
{id:'primeira-captura',nome:'Colecionador',desc:'Capture seu primeiro Monstro.',icone:'🔴'},
{id:'evolucao',nome:'Evolucionista',desc:'Evolua um Monstro.',icone:'✨'},
{id:'sem-hospital',nome:'Sobrevivente',desc:'Complete uma Parte sem usar o Hospital.',icone:'💀'},
{id:'batalha',nome:'Primeiro Combate',desc:'Vença uma batalha.',icone:'⚔️'},
{id:'multiplayer',nome:'Rival',desc:'Vença uma batalha Multiplayer.',icone:'🌐'},
];
function conquistasLidas(){try{return JSON.parse(localStorage.getItem('nexoria_conquistas')||'{}')}catch{return {}}}
function desbloquearConquista(id){const c=CONQUISTAS_NEXORIA.find(x=>x.id===id);if(!c)return;const d=conquistasLidas();if(d[id])return;d[id]=Date.now();localStorage.setItem('nexoria_conquistas',JSON.stringify(d));mostrarToastConquista(c);}
function mostrarToastConquista(c){let t=document.getElementById('toast-conquista');if(!t){t=document.createElement('div');t.id='toast-conquista';document.body.appendChild(t)}t.innerHTML=`<strong>${c.icone} Conquista desbloqueada!</strong><span>${c.nome}</span>`;t.classList.add('visivel');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('visivel'),3200)}
function abrirConquistas(){const m=document.querySelector('[data-modal="conquistas"]');if(!m)return;const d=conquistasLidas();document.getElementById('lista-conquistas').innerHTML=CONQUISTAS_NEXORIA.map(c=>`<div class="conquista ${d[c.id]?'desbloqueada':''}"><span class="conquista-icone">${d[c.id]?c.icone:'🔒'}</span><div><strong>${c.nome}</strong><small>${c.desc}</small></div></div>`).join('');m.hidden=false}
document.addEventListener('click',e=>{if(e.target.closest('[data-fechar-modal-conquistas]'))document.querySelector('[data-modal="conquistas"]').hidden=true});
window.CONQUISTAS_NEXORIA=CONQUISTAS_NEXORIA;window.desbloquearConquista=desbloquearConquista;window.abrirConquistas=abrirConquistas;
