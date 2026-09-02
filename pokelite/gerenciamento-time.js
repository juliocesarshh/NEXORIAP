
let nexoriaTimeRevisao=[], nexoriaContextoRevisao=null, nexoriaMonstroSelecionado=null;
function abrirTelaGerenciamentoTime(time,opcoes={}) {
  nexoriaTimeRevisao=time||[]; nexoriaContextoRevisao=opcoes; nexoriaMonstroSelecionado=opcoes.selecionadoNumero ?? nexoriaTimeRevisao[0]?.numero ?? null;
  document.getElementById("titulo-gerenciamento-time").textContent=opcoes.titulo||"Prepare seu Time";
  document.getElementById("texto-gerenciamento-time").textContent=opcoes.texto||"";
  const voltar=document.querySelector("#tela-gerenciamento-time .voltar-tela");
  if(voltar){
    voltar.dataset.acao=(opcoes.modo==="roguelike")?"voltar-mapa":"voltar-modos";
    voltar.innerHTML=(opcoes.modo==="roguelike")?"&larr; Voltar para a Rota":"&larr; Voltar";
  }
  const botaoConfirmar=document.querySelector('[data-acao="confirmar-gerenciamento-time"] span');
  if(botaoConfirmar) botaoConfirmar.textContent=opcoes.modo==="multiplayer"||opcoes.modo==="pratica"?"Pronto":"Confirmar e continuar";
  mostrarTela("tela-gerenciamento-time"); renderizarGerenciamentoTime();
}
function renderizarGerenciamentoTime(){
 const lista=document.getElementById("lista-gerenciamento-time"), detalhe=document.getElementById("detalhe-gerenciamento-time");
 lista.innerHTML="";
 nexoriaTimeRevisao.forEach((m,i)=>{
  const b=document.createElement("button"); b.type="button"; b.className="card-time-revisao";
  b.innerHTML=`${m.png?`<img src="PNG/${m.png}" alt="${m.nome}">`:"<span class='sprite-vazio'>?</span>"}<strong>${m.nome}</strong><span>Lv. ${m.nivel}</span><span>${m.hpAtual}/${m.status.hpMax} HP</span>`;
  b.onclick=()=>{ nexoriaMonstroSelecionado=m.numero; renderizarGerenciamentoTime(); }; lista.appendChild(b);
  if(String(m.numero)===String(nexoriaMonstroSelecionado)) renderizarDetalheGerenciamento(m,DADOS_MONSTROS.find(x=>String(x.numero)===String(m.numero)));
 });
}
function renderizarConsumiveisMochila(monstro){
  // A mochila existe no Roguelike. Em Prática/Multiplayer não há consumíveis
  // de run, então deixamos a seção vazia sem quebrar a tela de preparação.
  const mochila = Array.isArray(window.estadoRun?.mochila) ? window.estadoRun.mochila : [];
  if (!mochila.length) return '<span class="sem-consumiveis">Nenhum consumível disponível na mochila.</span>';
  const codigos = mochila.filter(Boolean);
  const unicos = [...new Set(codigos)];
  const html = unicos.map(codigo => {
    const item = typeof buscarItem === 'function' ? buscarItem(codigo) : null;
    if (!item) return '';
    const quantidade = codigos.filter(x => x === codigo).length;
    return `<button type="button" class="item-revisao consumivel-mochila" data-usar-consumivel="${item.codigo}">${item.png ? `<img class="item-revisao-img" src="Png-Itens/${item.png}" alt="" onerror="this.style.display='none'">` : ''}<strong>${item.nome}</strong><small>${quantidade > 1 ? `x${quantidade} · ` : ''}${item.descricao || ''}</small></button>`;
  }).join('');
  return html || '<span class="sem-consumiveis">Nenhum consumível disponível na mochila.</span>';
}
window.renderizarConsumiveisMochila = renderizarConsumiveisMochila;

function renderizarDetalheGerenciamento(m,base){
 if(!m || !base) return;
 const el=document.getElementById("detalhe-gerenciamento-time"),s=m.status||{},tipos=String(m.tipo||"").split("/").map(x=>x.trim());
 m.golpesConhecidos=selecionarQuatroGolpes(m.golpesConhecidos,base);
 const hab=typeof habilidadeDe==="function"?habilidadeDe(m):null;
 const aprendidos=(base.golpes||[]).filter(g=>g.nivel<=m.nivel).map(g=>g.codigo).filter((c,i,a)=>a.indexOf(c)===i);
 const golpes=aprendidos.map(c=>{const g=buscarGolpe(c),on=m.golpesConhecidos.includes(c);return `<button type="button" class="golpe-revisao ${on?"ativo":""}" data-golpe="${c}"><span>${g.nome}</span><small>${g.tipo} · ${g.categoria} · Poder ${g.poder}</small></button>`}).join("");
 const itens=(window.DADOS_ITENS||[]).filter(x=>x&&(!x.tipo||tipos.includes(x.tipo))).filter(x=>!["evolucao_especifica","evolucao_proxima"].includes(x.efeito?.tipo)).map(x=>`<button type="button" class="item-revisao ${m.item===x.codigo?"equipado":""}" data-item="${x.codigo}">${x.png?`<img class="item-revisao-img" src="Png-Itens/${x.png}" alt="" onerror="this.style.display='none'">`:""}<strong>${x.nome}</strong><small>${x.codigo} · ${x.descricao||""}</small></button>`).join("");
 el.innerHTML=`<div class="cabecalho-monstro-revisao">${m.png?`<img src="PNG/${m.png}" alt="${m.nome}">`:""}<div><h3>${m.nome}</h3><span>Lv. ${m.nivel} · ${tipos.join(" / ")} · ${base.raridade||"Normal"}</span></div></div>
 <div class="stats-revisao"><div><b>Hp</b><span>${s.hpMax}</span></div><div><b>Ata</b><span>${s.ataque}</span></div><div><b>Def</b><span>${s.defesa}</span></div><div><b>Sp.A</b><span>${s.ataqueEspecial}</span></div><div><b>Sp.D</b><span>${s.defesaEspecial}</span></div><div><b>Vel</b><span>${s.velocidade}</span></div></div>
 <p><b>Habilidade:</b> ${hab?.nome||base.habilidade||"Nenhuma"}</p>
 <label class="campo-natureza"><b>Natureza:</b> <select id="seletor-natureza">${(window.NATUREZAS||[]).map(n=>`<option value="${n.id}" ${m.natureza===n.id?"selected":""}>${n.id} — ${n.desc}</option>`).join("")}</select></label><section><h4>Ataques — máximo 4</h4><p class="dica-revisao">No máximo 4 ataques. Golpes do mesmo tipo do monstro recebem STAB de dano.</p><div class="grade-revisao-golpes">${golpes||"Nenhum golpe aprendido."}</div></section>
 <section><h4>Itens compatíveis</h4><div class="grade-revisao-itens">${itens||"Nenhum item compatível."}</div></section>
 <section><h4>🎒 Itens da mochila</h4><div class="grade-revisao-itens">${renderizarConsumiveisMochila(m)}</div></section>`;
 el.querySelectorAll("[data-golpe]").forEach(b=>b.onclick=()=>{const c=b.dataset.golpe,a=[...m.golpesConhecidos];if(a.includes(c)){if(a.length>1)m.golpesConhecidos=a.filter(x=>x!==c)}else{if(a.length>=4){document.getElementById("status-gerenciamento-time").textContent="Máximo de 4 ataques.";return}m.golpesConhecidos=[...a,c]}renderizarDetalheGerenciamento(m,base)});
 el.querySelectorAll("[data-item]").forEach(b=>b.onclick=()=>{if(m.item===b.dataset.item)m.item=null;else if(typeof equiparItem==="function")equiparItem(m,b.dataset.item);renderizarDetalheGerenciamento(m,base);renderizarGerenciamentoTime()});
 const ns=el.querySelector("#seletor-natureza"); if(ns) ns.onchange=()=>{m.natureza=ns.value; if(typeof recalcularStatusDaInstancia==="function") recalcularStatusDaInstancia(m); nexoriaMonstroSelecionado=m.numero; renderizarGerenciamentoTime();};
 el.querySelectorAll("[data-usar-consumivel]").forEach(b=>b.onclick=()=>{usarItemConsumivel(m,b.dataset.usarConsumivel); nexoriaMonstroSelecionado=m.numero; renderizarGerenciamentoTime();});
}
function confirmarGerenciamentoTime(){
 if(!nexoriaTimeRevisao.length)return;
 if(nexoriaContextoRevisao?.modo==="multiplayer"){mpTimeEscolhido=nexoriaTimeRevisao;mpEnviar("team-ready",{time:mpTimeEscolhido});document.getElementById("mp-selecao-painel").hidden=true;mpStatus("mp-selecao-status","Time confirmado. Aguardando o adversário...");return}
 if(nexoriaContextoRevisao?.modo==="roguelike"){estadoRun.time=nexoriaTimeRevisao;mostrarTela("tela-mapa");if(typeof renderizarMapa==="function")renderizarMapa();}
 if(nexoriaContextoRevisao?.modo==="pratica"){
   ladoSelecaoAtual="oponente";
   indiceSelecaoAtual=0;
   atualizarTituloSelecao();
   document.getElementById("tela-gerenciamento-time").hidden=true;
   document.getElementById("tela-selecao-pratica").hidden=false;
   renderizarGridPratica();
   return;
 }
}
window.abrirTelaGerenciamentoTime=abrirTelaGerenciamentoTime;window.confirmarGerenciamentoTime=confirmarGerenciamentoTime;
