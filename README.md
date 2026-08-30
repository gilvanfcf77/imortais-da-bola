# Imortais da Bola

Jogo de futebol manager, web, onde você escolhe um clube brasileiro, sorteia
os 11 titulares entre jogadores históricos daquele clube (de qualquer época)
e disputa uma copa em mata-mata. Veja `CLAUDE.md` pra contexto completo do
projeto.

Projeto de fã, sem afiliação oficial com nenhum clube ou jogador citado.

## Requisitos

- Node.js 18 ou mais recente
- npm

## Instalação

```bash
npm install
```

## Rodar o jogo

```bash
npm run dev
```

Abre o servidor de desenvolvimento em **http://localhost:3000**. O fluxo é:
tela inicial → "Iniciar Copa" → escolher clube → montar o time (sortear
jogador por jogador ou completar aleatoriamente) → chaveamento da copa →
partida (com disputa de pênaltis se empatar) → resultado.

## Outros scripts

- `npm test` — roda os testes automatizados do motor (`test/engine/`), com
  o `node --test` nativo do Node (sem dependência nova).
- `npm run match` — roda uma partida de exemplo direto no terminal, sem
  interface (útil pra ver os eventos narrados brutos).
- `npm run calibrate` — roda 500 partidas simuladas e imprime um relatório
  de frequências (gols, cartões, eventos especiais etc.), salvando uma
  cópia em `logs/`. Serve pra calibrar as constantes do motor em
  `src/engine/constants.js`.
- `npm run view` — sobe um servidor estático simples pra abrir o
  `viewer.html`, uma ferramenta de desenvolvimento (fora do fluxo do jogo)
  pra assistir partidas com escalação, placar e sorteio de qualquer
  confronto entre clubes.
- `npm run build` / `npm run start` — build de produção do Next.js.

## Estrutura do projeto

- `src/engine/` — motor de simulação, isolado (sem depender de nada fora da
  pasta — veja decisão 12 em `info/DECISOES.md`).
- `src/data/clubs/` — dados dos clubes (um clube é dado, não código: cada
  um mora na própria pasta, com um arquivo JSON por época).
- `src/app/` — o app Next.js (telas do jogo e server actions).
- `scripts/` — os scripts de terminal listados acima.
- `test/engine/` — testes automatizados do motor (`npm test`).
- `viewer.html` — ferramenta de desenvolvimento pra assistir partidas fora
  do fluxo normal do jogo.
- `info/` — documentos de contexto do projeto (decisões tomadas, progresso,
  pendências) — todos em português, por serem pra consumo da equipe.

## Documentação

- `CLAUDE.md` — visão geral do projeto, escopo e convenções.
- `info/DECISOES.md` — decisões de arquitetura já tomadas, com o porquê.
- `info/PENDENCIAS.md` — questões ainda em aberto.
- `info/PROGRESSO.md` — snapshot do estado atual contra a ordem de
  construção definida em `CLAUDE.md`.
