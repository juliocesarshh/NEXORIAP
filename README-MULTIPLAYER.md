# NEXORIA — Multiplayer

O Multiplayer agora tem o fluxo:

1. Play → Batalha Multiplayer.
2. Escolha **Criar Sala** ou **Procurar Sala**.
3. Quem cria escolhe nível e formato de **1×1 até 6×6**.
4. O servidor gera um **ID de 4 dígitos**.
5. O segundo jogador informa exatamente esse ID.
6. Os dois escolhem seus monstros.
7. O servidor inicia a batalha quando os dois times estiverem prontos.
8. No combate, o **host funciona como árbitro**, calculando dano e enviando o estado para o outro jogador.

## Rodar

É necessário Node.js 18+.

```bash
npm install
npm start
```

Depois abra `http://localhost:8080/`.

Para duas pessoas em computadores diferentes, o `server.js` precisa ficar hospedado em um endereço acessível pelos dois jogadores. Em uma rede local, use o IP do computador que está executando o servidor.

O navegador deve acessar o jogo por HTTP/HTTPS, não abrindo o `index.html` diretamente como `file://`.
