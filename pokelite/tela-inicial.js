// Lógica do modal de Configurações: abrir/fechar, lista de faixas, mudo.
// A navegação entre telas é responsabilidade do main.js.

const modal = document.querySelector('[data-modal="config"]');

function abrirModalConfig() {
  modal.hidden = false;
}
function fecharModalConfig() {
  modal.hidden = true;
}

document.querySelectorAll("[data-fechar-modal]").forEach((el) => {
  el.addEventListener("click", fecharModalConfig);
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) fecharModalConfig();
});

// ---------- Lista de faixas no modal ----------
const listaFaixasEl = document.getElementById("lista-faixas");

function renderizarListaFaixas() {
  listaFaixasEl.innerHTML = "";
  (window.FAIXAS_SOM || []).forEach((f) => {
    const li = document.createElement("li");
    li.className = "item-faixa";
    li.dataset.faixaId = f.id;
    li.innerHTML = `
      <input type="checkbox" id="check-${f.id}" ${nexoriaConfigSom.faixasAtivas[f.id] ? "checked" : ""} />
      <label for="check-${f.id}">${f.nome}</label>
      <span class="faixa-tocando"></span>
    `;
    li.querySelector("input").addEventListener("change", (e) => {
      nexoriaDefinirFaixaAtiva(f.id, e.target.checked);
    });
    listaFaixasEl.appendChild(li);
  });
}

document.addEventListener("nexoria:faixa-mudou", (e) => {
  listaFaixasEl.querySelectorAll(".item-faixa").forEach((li) => {
    const span = li.querySelector(".faixa-tocando");
    span.textContent = li.dataset.faixaId === e.detail.id ? "tocando" : "";
  });
});

// ---------- Interruptor de mudo ----------
const botaoMudo = document.querySelector('[data-acao="mudo"]');

function refletirEstadoMudo() {
  botaoMudo.setAttribute("aria-checked", String(nexoriaConfigSom.mudo));
}

function alternarMudoUI() {
  nexoriaAlternarMudo();
  refletirEstadoMudo();
}

// ---------- Inicialização ----------
renderizarListaFaixas();
refletirEstadoMudo();
