let telaMonsterpediaCarregada = false;

function comLimiteDeTempo(promessa, ms) {
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error("tempo esgotado")), ms)),
  ]);
}

async function iniciarMonsterpediaSeNecessario() {
  if (telaMonsterpediaCarregada) return;

  const statusMsg = document.getElementById("status-msg");
  statusMsg.textContent = "Carregando dados...";

  try {
    await carregarDadosComRetentativas();
    telaMonsterpediaCarregada = true; // só marca como carregado se deu certo
    statusMsg.textContent = `${DADOS_MONSTROS.length} monstros e ${DADOS_GOLPES.length} golpes carregados.`;
    renderizarGrid();
  } catch (erro) {
    statusMsg.textContent =
      "Não consegui carregar os dados. Se você abriu o index.html direto (clique duplo), " +
      "isso não funciona — o navegador bloqueia esse tipo de carregamento local. " +
      "Sirva a pasta com um servidor local ou publique num host (ex: Netlify, GitHub Pages).";
    console.error(erro);
  }
}

function renderizarGrid() {
  const grid = document.getElementById("grid-monstros");
  grid.innerHTML = "";

  DADOS_MONSTROS.forEach((m) => {
    const card = document.createElement("div");
    card.className = "card-monstro";
    card.dataset.numero = m.numero;
    const imgHtml = m.png
      ? `<img class="thumb" src="PNG/${m.png}" alt="${m.nome}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb thumb-vazio',textContent:'?'}))">`
      : `<div class="thumb thumb-vazio">?</div>`;

    card.innerHTML = `
      ${imgHtml}
      <div class="num">#${String(m.numero).padStart(3, "0")}</div>
      <div class="nome">${m.nome}</div>
      <div class="tipo">${m.tipo}</div>
    `;
    card.addEventListener("click", () => selecionarMonstro(m.numero));
    grid.appendChild(card);
  });
}

function selecionarMonstro(numero) {
  document
    .querySelectorAll(".card-monstro")
    .forEach((c) => c.classList.remove("selecionado"));
  document
    .querySelector(`.card-monstro[data-numero="${numero}"]`)
    .classList.add("selecionado");

  const m = DADOS_MONSTROS.find((x) => x.numero === numero);
  renderizarDetalhe(m);
}

function renderizarDetalhe(m) {
  const el = document.getElementById("conteudo-detalhe");
  if (!m) {
    el.innerHTML = '<p class="vazio">Monstro não encontrado.</p>';
    return;
  }

  const s = m.statusBase || {};

  const imgDetalheHtml = m.png
    ? `<img class="thumb-detalhe" src="PNG/${m.png}" alt="${m.nome}" onerror="this.style.display='none'">`
    : `<div class="thumb-detalhe thumb-vazio">?</div>`;

  el.innerHTML = `
    ${imgDetalheHtml}
    <h3>#${String(m.numero).padStart(3, "0")} ${m.nome}</h3>
    <p><strong>Tipo:</strong> ${m.tipo}</p>
    <p>${m.descricao || ""}</p>
    ${m.habilidade ? `<p><strong>Habilidade:</strong> ${typeof nomeHabilidade === "function" ? nomeHabilidade(m.habilidade) : m.habilidade} <small>(${m.habilidade})</small></p>` : ""}
    ${m.item ? (() => {
      const it = typeof buscarItem === "function" ? buscarItem(m.item) : null;
      const png = it?.png ? `<img class="thumb-item-mini" src="Png-Itens/${it.png}" alt="" onerror="this.style.display='none'">` : "";
      const nome = typeof nomeItem === "function" ? nomeItem(m.item) : m.item;
      return `<p>${png}<strong>Item:</strong> ${nome} <small>(${m.item})</small></p>`;
    })() : ""}
    <table class="status">
      <tr><td>HP</td><td>${s.hp ?? "-"}</td></tr>
      <tr><td>Ataque</td><td>${s.ataque ?? "-"}</td></tr>
      <tr><td>Defesa</td><td>${s.defesa ?? "-"}</td></tr>
      <tr><td>Atq. Especial</td><td>${s.ataqueEspecial ?? "-"}</td></tr>
      <tr><td>Def. Especial</td><td>${s.defesaEspecial ?? "-"}</td></tr>
      <tr><td>Velocidade</td><td>${s.velocidade ?? "-"}</td></tr>
    </table>
  `;
}

document.addEventListener("nexoria:tela-mudou", (e) => {
  if (e.detail.tela === "tela-monsterpedia") iniciarMonsterpediaSeNecessario();
});
