// The penalty shootout, start to finish.

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.SHOOTOUT_START]: [
    'Empate ao fim dos 90 minutos! Vai para a disputa de pênaltis.',
    'Nada resolvido no tempo normal — a decisão vai para as cobranças de pênalti.',
    'Terminou igualado! A vaga vai ser decidida nos pênaltis.',
    'Fim do tempo regulamentar com placar igual, agora é a bota de ouro na marca da cal.',
    'Ninguém levou a melhor em noventa minutos. Salvem os goleiros, vem aí a disputa de pênaltis!',
    'Tudo igual no marcador. A sorte vai ser lançada na marca do pênalti.',
    'O relógio zerou sem vencedor. Segura o coração que a decisão vai para os pênaltis!',
  ],
  [EVENT_TYPES.SHOOTOUT_KICK_SCORED]: [
    '{player} cobra com categoria e converte {teamFor}.',
    'Sem chances para {keeper}: {player} converte {teamFor}.',
    '{player} não titubeia e manda para as redes. Converte {teamFor}.',
    'Bola de um lado, {keeper} do outro! {player} faz {teamFor}.',
    '{player} parte para a cobrança, chuta firme e marca {teamFor}!',
    'Frio como gelo! {player} desloca {keeper} e guarda {teamFor}.',
    'Tirou do alcance de {keeper}! {player} estufa a rede {teamFor}.',
  ],
  [EVENT_TYPES.SHOOTOUT_KICK_MISSED]: [
    '{player} desperdiça a cobrança e o banco {teamOf} lamenta.',
    '{keeper} adivinha o canto e defende a cobrança de {player}!',
    '{player} manda a bola para fora — {teamArticle} perde a cobrança.',
    'Perdeu! {player} isola a cobrança e desperdiça {teamFor}.',
    'Na trave! {player} bateu mal demais e {teamArticle} joga fora o pênalti.',
    '{keeper} fecha o ângulo e {player} joga a cobrança para fora!',
    'Cobrança horrorosa de {player}, a bola vai direto para fora e {teamArticle} se complica.',
  ],
  [EVENT_TYPES.SHOOTOUT_WINNER]: [
    '{team} vence a disputa de pênaltis!',
    'Decidido nas cobranças: {teamArticleCap} sai vencedor da disputa de pênaltis.',
    'Acabou o sofrimento! {teamArticleCap} leva a melhor nos pênaltis e comemora!',
    'Convertido! {teamArticleCap} ganha a disputa da marca da cal!',
    'Fim de papo nas penalidades, {teamArticle} é quem leva a vitória!',
    'Bateu forte, converteu! {teamArticleCap} leva a melhor na marca do pênalti!',
    'Deu {team} nos pênaltis! Vitória dramática no finalzinho!',
  ],
};
