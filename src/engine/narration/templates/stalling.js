// Gamesmanship that burns the clock instead of provoking a rival —
// catimba in its purest form (see CLAUDE.md "Catimba").

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.TIME_WASTING]: [
    '{team} demora na reposição de bola para queimar o cronômetro.',
    'Jogador de {team} se joga no chão pedindo atendimento médico, ganhando tempo.',
    '{team} toca a bola devagar no fundo, catimbando o resultado.',
    'Os gandulas do {team} somem com as bolas — não sobra nenhuma pra repor o jogo rápido.',
    'Bola foi pra escanteio, mas o gandula do {team} demora uma eternidade pra devolver.',
    'O relógio anda a passos de tartaruga com a cera de {team}.',
    'Goleiro de {team} chama a falta, demora pra levantar, a paciência vai pro espaço.',
    'Troca de passes irritante e sem pressa nenhuma de {team} pra matar o tempo.',
  ],
  [EVENT_TYPES.THROW_IN_DELAY]: [
    '{player} demora demais pra cobrar o lateral, catimbando o jogo.',
    '{player} pega a bola e não tem pressa nenhuma pra repor o lateral.',
    'O árbitro chama a atenção de {player}, que enrola para cobrar o lateral.',
    '{player} segura a redonda com a mão e finge que não é com ele.',
    'Passam os segundos e {player} continua paradão na linha lateral.',
    'Olha o relógio do árbitro! {player} tá gastando um tempo precioso ali.',
    'Com muita paciência, {player} demora horrores para soltar a bola.',
  ],
  [EVENT_TYPES.GOAL_KICK_DELAY]: [
    '{player} demora uma eternidade pra bater o tiro de meta.',
    'O goleiro {player} segura a bola e não tem pressa nenhuma pra sair jogando.',
    'O árbitro já olha pro relógio, {player} tá cozinhando o jogo na reposição.',
    'Ninguém avança pra receber, aí {player} segura a bola com muita calma.',
    '{player} ajeita a bola com calma olímpica para a cobrança do tiro de meta.',
    'O jogo esfriou totalmente com essa demora de {player} na reposição.',
    '{player} pede calma aos companheiros, mas já tá abusando da paciência da arbitragem.',
  ],
  [EVENT_TYPES.SHOWBOATING]: [
    '{player} começa a fazer embaixadinhas no meio de campo, provocando o adversário.',
    'Com um placar confortável, {player} não hesita em fazer embaixadinhas diante da marcação.',
    '{player} humilha a marcação com embaixadinhas — {team} está confortável no placar e não perde a chance de se exibir.',
    'Olha a gracinha de {player}, tirando onda com a bola!',
    '{player} resolveu desfilar, que chiquê, meu amigo!',
    'Passou de calcanhar, deu chapéu... {player} tá brincando de jogar bola!',
    'É show de {player}! O homem tá impossível hoje.',
  ],
};
