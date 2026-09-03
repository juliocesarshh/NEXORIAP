# NEXORIAP Beta v1.1 — versão mesclada

Base: NEXORIAP_Beta_v1.1_FINAL_MESTRADA + assets de Png.zip.

Alterações desta rodada:
- Scorpon: Fogo/Fantasma.
- Black-Manbi: Dark/Aço.
- Ginásios: 13, 20, 30, 40, 50, 60, 70 e 80.
- Everton: nível 100 em todo o time.
- Multiplayer: tela de preparação antes do envio do time; ataques (máx. 4), item e Natureza.
- Prática: tela de preparação do time do jogador antes da seleção do oponente/batalha.
- Roguelike: time visível ao lado do mapa; clique em um monstro abre a preparação para ataques, item e Natureza.
- PNGs de monstros do Png.zip incorporados em pokelite/PNG/.
- Os dados dos itens já possuem nomes de PNG, mas os arquivos de imagens dos itens não vieram nos ZIPs desta rodada; a pasta de PNGs de itens não foi inventada/fabricada.
- Sintaxe dos 20 arquivos JS verificada com node --check.


NEXORIA v1.5: 36 golpes de dano existentes receberam buffs/debuffs acumuláveis de 20%, com limite de 0.25x a 2x do atributo base por batalha.

## v1.7 — Novos golpes e Sharlong
- G271 Reverse: inverte a ordem de Velocidade por 5 turnos.
- G272 Canção do Sol: 40 poder, tipo Fofo, deixa o alvo em Flinch por 3 turnos.
- G273 Respiração da Noite: 40 poder, tipo Dark, cria Noite Estrelada e causa 1/6 do HP máximo do adversário por turno.
- Sharlong: habilidade H028 BattleForm e assinatura GA007 Desejo do Dragão (200 poder, somente primeiro turno; próximo ataque no turno seguinte causa 50%).

## v1.9 — 40 habilidades enxutas + Troca Equivalente
- Adicionadas H072–H111: 40 habilidades novas, com efeitos menores e nomes majoritariamente não-Geek.
- Adicionada H112 — Troca Equivalente.
- Troca Equivalente ativa ao entrar em batalha: encontra o maior valor entre Ataque, Defesa, Ataque Especial, Defesa Especial e Velocidade de cada lado e troca esses valores. Se houver empate no maior valor, todos os atributos empatados participam da troca.
- A troca é executada uma única vez por batalha, mesmo que os dois monstros tenham H112.
- Ajustada precisão para suportar bônus de precisão das novas habilidades.
- Foco agora impede Flinch.
