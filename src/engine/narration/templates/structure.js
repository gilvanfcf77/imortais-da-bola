// Kickoff, halftime, fulltime, stoppage-time announcements, and the rare
// case of a match called off early — the events that mark the shape of a
// match rather than anything that happens on the ball.

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.KICKOFF]: [
    'Bola rolando! {team} contra {opponent}.',
    'Autoriza o árbitro, tá valendo! Começa {team} e {opponent}!',
    'Apita o juiz! Primeiro toque na bola para {team} contra {opponent}.',
    'Tá em jogo! Vai começar a batalha entre {team} e {opponent}.',
    'Apito inicial! É {team} medindo forças com o {opponent}.',
  ],
  [EVENT_TYPES.HALFTIME]: [
    'Fim de primeiro tempo: {team} {homeGoals} x {awayGoals} {opponent}.',
    'Termina a primeira etapa por aqui!',
    'Juiz apita e encerra o primeiro tempo!',
    'Fim de papo nos primeiros quarenta e cinco minutos!',
    'Vamos para o intervalo com placar parcial em aberto!',
    'Árbitro consulta o relógio e encerra a primeira metade!',
  ],
  [EVENT_TYPES.FULLTIME]: [
    'Apito final! {team} {homeGoals} x {awayGoals} {opponent}.',
    'Fim de papo! O árbitro encerra a partida: {team} {homeGoals}, {opponent} {awayGoals}.',
    'Tá terminado! Placar final no apito do juiz: {team} {homeGoals} x {awayGoals} {opponent}.',
    'Fim dos noventa minutos! Placar encerrado em {team} {homeGoals} e {awayGoals} {opponent}.',
    'E o juiz apita! Termina a partida entre {team} e {opponent}: {homeGoals} a {awayGoals}.',
  ],
  [EVENT_TYPES.MATCH_ABANDONED]: [
    'O árbitro suspende a partida! Com menos de 7 jogadores em campo, o {team} não tem como continuar — WO decretado a favor do {opponent}.',
    'Fim de jogo antes da hora: o {team} fica com menos de 7 em campo e o árbitro é obrigado a encerrar a partida. WO para o {opponent}.',
    'Não sobrou ninguém em pé no {team}! O árbitro encerra o jogo mais cedo e decreta WO para o {opponent}.',
    'Árbitro consulta o regulamento, apita o fim da linha para o {team} e confirma a vitória por WO do {opponent}.',
    'Com o {team} reduzido a menos de sete atletas, a partida é encerrada. Ponto regulamentar para o {opponent} por WO.',
    'Estouro de limite de expulsões no {team}! O juiz encerra o duelo e o {opponent} leva os três pontos por WO.',
  ],
  [EVENT_TYPES.STOPPAGE_TIME_ANNOUNCED]: [
    'O quarto árbitro levanta a placa: {minutes} minutos de acréscimo.',
    'Acréscimo confirmado: mais {minutes} minutos até o fim desta etapa.',
    'Placa no alto! A arbitragem indica mais {minutes} minutos.',
    'Subiu o painel eletrônico: vamos ter mais {minutes} minutos!',
    'O jogo vai ter mais {minutes} minutos de tempo adicional.',
    'Olha o tempo extra! Mais {minutes} minutos de futebol.',
    'Tá lá a sinalização do quarto árbitro: mais {minutes} minutos!',
  ],
  [EVENT_TYPES.STOPPAGE_TIME_BOOED_SHORT]: [
    'A torcida do {crowd} vaia o acréscimo — pouco tempo pra buscar o resultado.',
    'Vaias nas arquibancadas: a torcida do {crowd} queria mais minutos de bola rolando.',
    'Só isso?! A torcida do {crowd} se revolta com os acréscimos do juiz!',
    'Placa levantada e a torcida do {crowd} bronqueia! Achou muito pouco tempo.',
    'Vaia monumental no estádio! O pessoal do {crowd} queria bem mais minutos.',
    'O juiz economizou no desconto e a torcida do {crowd} solta o som de desaprovação!',
    'Protesto forte nas arquibancadas! A torcida do {crowd} reclama demais do tempo concedido.',
  ],
  [EVENT_TYPES.STOPPAGE_TIME_BOOED_LONG]: [
    'A torcida do {crowd} vaia o acréscimo — tempo demais.',
    'Reclamação geral da torcida do {crowd}: tanto acréscimo assim só dá mais chance pro adversário.',
    'A torcida do {crowd} perdeu a paciência com tanto acréscimo!',
    'Esse tempo todo de acréscimo tá revoltando o {crowd}, hein?',
    'O {crowd} não aguenta mais ver esse relógio rodar, muita cera!',
    'Olha a bronca do {crowd} com a arbitragem pelo excesso de acréscimo!',
    'Pra que tanto tempo extra? O {crowd} tá indignado na arquibancada!',
  ],
};
