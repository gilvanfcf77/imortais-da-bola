// The penalty-kick lifecycle (awarded, missed, converted — GOAL_PENALTY
// itself lives in goals.js alongside the other goal styles), the
// officiating drama around whether one should have been given at all, and
// the disallowed-goal case that shares that same VAR-adjacent flavor.

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.PENALTY_NOT_GIVEN]: [
    'Pênalti claríssimo em cima de {player}, mas o juiz manda o jogo seguir! Revolta de {team}.',
    'A torcida pede, a jogada foi dentro da área, mas o árbitro não marca pênalti para {team}.',
    'Pênalti não marcado: o juiz vê a jogada de perto e ainda assim não assinala nada para {team}.',
    'O estádio inteiro pede a penalidade em {player}, mas o árbitro diz que não foi nada!',
    'Caiu na área, o jogador de {team} reclama muito, mas a arbitragem manda seguir o jogo!',
    'Pênalti? O juiz não marca nada e deixa a torcida de {team} furiosa na arquibancada!',
    'Houve o contato em {player}, a bola sobrou, mas o apito do juiz permaneceu calado para desespero de {team}!',
  ],
  [EVENT_TYPES.PENALTY_PHANTOM]: [
    '{player} cai na área sem ninguém encostar, mas o juiz aponta para a marca da cal para {team}! Pênalti que não existiu.',
    'A bola bate no peito de {player}, mas o juiz enxerga mão e marca pênalti para {team}. Revolta total do banco adversário.',
    'Simulação descarada: {player} se joga na área e o juiz cai no conto, marcando pênalti para {team}.',
    '{player} tropeça no próprio cadarço, o árbitro inventa um pênalti colossal e {team} ganha o presente!',
    'Não houve absolutamente nada, mas {player} desaba teatralmente e o juiz marca a penalidade para {team}!',
    '{player} cavou um pênalti digno de Oscar, e o árbitro comprou a atuação inteirinha para beneficiar {team}!',
    'Cruzamento na área, {player} desaba sozinho no gramado e o juiz aponta feliz da vida para a marca da cal para {team}!',
  ],
  [EVENT_TYPES.PENALTY_WRONG_LOCATION]: [
    'A falta em {player} foi cometida bem longe da grande área, mas o juiz aponta para a marca da cal mesmo assim! Pênalti equivocado para {team}.',
    'Replay mostra a falta em {player} do lado de fora da área — o juiz já marcou pênalti para {team} e não volta atrás.',
    'Erro de arbitragem: a falta em {player} aconteceu longe do gol, mas o árbitro assinala pênalti para {team}.',
    'Pênalti?! Que isso, juiz?! A falta no {player} foi a dois metros da área! Um presente inacreditável para o {team}!',
    'O contato em {player} foi nitidamente fora, mas a arbitragem inventa o pênalti a favor do {team}!',
    'Foi muito fora da área! Apito totalmente equivocado na falta em {player}, pênalti pro {team}!',
    'Rapaz, ele deu pênalti! A falta no {player} foi lá fora, mas o homem do apito aponta pra marca da cal a favor do {team}!',
  ],
  [EVENT_TYPES.PENALTY_AWARDED]: [
    'Pênalti para {team}! O juiz aponta para a marca da cal depois do lance com {player}.',
    'Silêncio no estádio: pênalti assinalado para {team} após a jogada de {player}.',
    'Juiz em cima do lance! Falta dentro da área em {player}, é pênalti para o {team}!',
    'Tá marcado! Entrada muito atrasada em {player} e o árbitro aponta a penalidade máxima pro {team}.',
    'Olha a chance do {team}! {player} é derrubado na área e o juizão assinala a infração.',
    'Pênalti indiscutível a favor do {team}! {player} sofre a carga dentro da grande área.',
    'Foi com muita sede ao pote! Derrubou {player} na área e tem pênalti marcado para o {team}.',
  ],
  [EVENT_TYPES.PENALTY_MIND_GAMES]: [
    '{keeper} demora para se posicionar e ainda troca provocações com {player}, tentando tirar a concentração dele.',
    'Antes da cobrança, {keeper} aponta para um canto e faz gestos, tentando desestabilizar {player}.',
    '{keeper} pede um tempo com o árbitro e conversa mole com {player} só para atrasar a cobrança.',
    '{keeper} grita: "Eu sei onde você bate!" — tentando plantar a dúvida na cabeça de {player}.',
    '{player} ajeita a bola na marca, enquanto {keeper} vem dar aquela caminhada lenta para irritar.',
    '{keeper} cruza os braços na linha do gol e encara {player} num duelo de nervos puro.',
    'O clima esquenta na marca da cal: {keeper} cochicha algo no ouvido de {player} antes do apito.',
    '{player} respira fundo para focar, mas {keeper} não para de pular e gesticular debaixo das traves.',
  ],
  [EVENT_TYPES.PENALTY_MISSED]: [
    '{player} bate mal e {keeper} defende o pênalti! Que alívio para a defesa.',
    'A pressão funcionou: {player} manda a cobrança para fora e desperdiça o pênalti.',
    '{player} bate no meio do gol e {keeper} espalma. Pênalti perdido!',
    'Ele escorregou na hora H! {player} isola o pênalti nas nuvens.',
    '{keeper} adivinha o canto, {player} cobra fraco e perde a chance de ouro.',
    'Na trave! {player} bateu com força, mas o poste salva {keeper}.',
    '{player} capricha demais, tira do goleiro... mas tira do gol também!',
  ],
  [EVENT_TYPES.DISALLOWED_GOAL]: [
    'Momento de fúria! Depois de toda a comemoração, o juiz manda anular o gol de {player}.',
    'Silêncio muda tudo: o árbitro chama o bandeirinha, conversam, e o gol de {player} é anulado. {team} não acredita.',
    'Após toda a comemoração, o juiz ouve o auxiliar e manda anular o gol de {player}. Revolta total de {team}.',
    'O gol de {player} tinha sido dado, mas o árbitro dá meia-volta depois de falar com o bandeirinha e anula tudo.',
    'Subiu a bandeira! Tava impedido o {player}, não vai valer o gol!',
    'Não vale nada! O árbitro pega a falta no lance e invalida o gol de {player}.',
    'Balde de água fria no {team}! O juiz marca a irregularidade e anula a jogada de {player}.',
    'Mão no apito, braço erguido: tá anulado o gol do {player}!',
  ],
};
