// Kickoff, halftime, fulltime, stoppage-time announcements, and the rare
// case of a match called off early — the events that mark the shape of a
// match rather than anything that happens on the ball.

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.KICKOFF]: [
    'Bola rolando! {team} contra {opponent}.',
    'Autoriza o árbitro, tá valendo! Começa {team} e {opponent}!',
    'Apita o juiz! Primeiro toque na bola {teamFor} contra {opponent}.',
    'Tá em jogo! Vai começar a batalha entre {team} e {opponent}.',
    'Apito inicial! É {teamArticle} medindo forças com {opponentArticle}.',
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
    'O árbitro suspende a partida! Com menos de 7 jogadores em campo, {teamArticle} não tem como continuar — WO decretado a favor {opponentOf}.',
    'Fim de jogo antes da hora: {teamArticle} fica com menos de 7 em campo e o árbitro é obrigado a encerrar a partida. WO {opponentFor}.',
    'Não sobrou ninguém em pé {teamIn}! O árbitro encerra o jogo mais cedo e decreta WO {opponentFor}.',
    'Árbitro consulta o regulamento, apita o fim da linha {teamFor} e confirma a vitória por WO {opponentOf}.',
    'Com {teamArticle} reduzido a menos de sete atletas, a partida é encerrada. Ponto regulamentar {opponentFor} por WO.',
    'Estouro de limite de expulsões {teamIn}! O juiz encerra o duelo e {opponentArticle} leva os três pontos por WO.',
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
    'A torcida {crowdOf} vaia o acréscimo — pouco tempo pra buscar o resultado.',
    'Vaias nas arquibancadas: a torcida {crowdOf} queria mais minutos de bola rolando.',
    'Só isso?! A torcida {crowdOf} se revolta com os acréscimos do juiz!',
    'Placa levantada e a torcida {crowdOf} bronqueia! Achou muito pouco tempo.',
    'Vaia monumental no estádio! O pessoal {crowdOf} queria bem mais minutos.',
    'O juiz economizou no desconto e a torcida {crowdOf} solta o som de desaprovação!',
    'Protesto forte nas arquibancadas! A torcida {crowdOf} reclama demais do tempo concedido.',
  ],
  [EVENT_TYPES.STOPPAGE_TIME_BOOED_LONG]: [
    'A torcida {crowdOf} vaia o acréscimo — tempo demais.',
    'Reclamação geral da torcida {crowdOf}: tanto acréscimo assim só dá mais chance pro adversário.',
    'A torcida {crowdOf} perdeu a paciência com tanto acréscimo!',
    'Esse tempo todo de acréscimo tá revoltando {crowdArticle}, hein?',
    '{crowdArticleCap} não aguenta mais ver esse relógio rodar, muita cera!',
    'Olha a bronca {crowdOf} com a arbitragem pelo excesso de acréscimo!',
    'Pra que tanto tempo extra? {crowdArticleCap} tá indignado na arquibancada!',
  ],
};
