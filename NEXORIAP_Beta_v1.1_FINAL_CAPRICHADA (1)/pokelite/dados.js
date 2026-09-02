// Carrega monstros.json, golpes.json, habilidades.json e itens.json uma única vez
// e compartilha entre telas. Qualquer tela que precise chama carregarDadosComRetentativas().

let DADOS_MONSTROS = [];
let DADOS_GOLPES = [];
let DADOS_HABILIDADES = [];
let DADOS_ITENS = [];
window.DADOS_ITENS = DADOS_ITENS;

let promessaDadosJogo = null;

function carregarDadosJogo() {
  if (!promessaDadosJogo) {
    promessaDadosJogo = Promise.all([
      fetch("data/monstros.json").then((r) => {
        if (!r.ok) throw new Error(`monstros.json: HTTP ${r.status}`);
        return r.json();
      }),
      fetch("data/golpes.json").then((r) => {
        if (!r.ok) throw new Error(`golpes.json: HTTP ${r.status}`);
        return r.json();
      }),
      fetch("data/habilidades.json").then((r) => {
        if (!r.ok) throw new Error(`habilidades.json: HTTP ${r.status}`);
        return r.json();
      }),
      fetch("data/itens.json").then((r) => {
        if (!r.ok) throw new Error(`itens.json: HTTP ${r.status}`);
        return r.json();
      }),
    ])
      .then(([monstros, golpes, habilidades, itens]) => {
        DADOS_MONSTROS = monstros;
        DADOS_GOLPES = golpes;
        DADOS_HABILIDADES = habilidades;
        DADOS_ITENS = itens;
        window.DADOS_MONSTROS = DADOS_MONSTROS;
        window.DADOS_GOLPES = DADOS_GOLPES;
        window.DADOS_ITENS = DADOS_ITENS;
      })
      .catch((erro) => {
        promessaDadosJogo = null; // libera pra poder tentar de novo — antes ficava travado pra sempre
        throw erro;
      });
  }
  return promessaDadosJogo;
}

function comLimiteDeTempo(promessa, ms) {
  return Promise.race([
    promessa,
    new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error("tempo esgotado")), ms)),
  ]);
}

// Tenta carregar os dados várias vezes antes de desistir de verdade — protege
// contra internet fraca ou falha momentânea do navegador/servidor.
async function carregarDadosComRetentativas(tentativas = 7, timeoutPorTentativa = 8000) {
  let ultimoErro = null;
  for (let i = 1; i <= tentativas; i++) {
    try {
      await comLimiteDeTempo(carregarDadosJogo(), timeoutPorTentativa);
      return; // sucesso
    } catch (erro) {
      ultimoErro = erro;
      console.warn(`[NEXORIA] Tentativa ${i}/${tentativas} de carregar dados falhou:`, erro.message);
      if (i < tentativas) {
        await new Promise((resolver) => setTimeout(resolver, 500 * i)); // espera crescente entre tentativas
      }
    }
  }
  throw ultimoErro || new Error("Não consegui carregar os dados depois de várias tentativas.");
}
