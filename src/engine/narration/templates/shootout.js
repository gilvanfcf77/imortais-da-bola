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
    '{player} cobra com categoria e converte para {team}.',
    'Sem chances para {keeper}: {player} converte para {team}.',
    '{player} não titubeia e manda para as redes. Converte para {team}.',
    'Bola de um lado, {keeper} do outro! {player} faz para {team}.',
    '{player} parte para a cobrança, chuta firme e marca para {team}!',
    'Frio como gelo! {player} desloca {keeper} e guarda para {team}.',
    'Tirou do alcance de {keeper}! {player} estufa a rede para {team}.',
  ],
  [EVENT_TYPES.SHOOTOUT_KICK_MISSED]: [
    '{player} desperdiça a cobrança e o banco de {team} lamenta.',
    '{keeper} adivinha o canto e defende a cobrança de {player}!',
    '{player} manda a bola para fora — {team} perde a cobrança.',
    'Perdeu! {player} isola a cobrança e desperdiça para {team}.',
    'Na trave! {player} bateu mal demais e {team} joga fora o pênalti.',
    '{keeper} fecha o ângulo e {player} joga a cobrança para fora!',
    'Cobrança horrorosa de {player}, a bola vai direto para fora e {team} se complica.',
  ],
  [EVENT_TYPES.SHOOTOUT_WINNER]: [
    '{team} vence a disputa de pênaltis!',
    'Decidido nas cobranças: {team} sai vencedor da disputa de pênaltis.',
    'Acabou o sofrimento! {team} leva a melhor nos pênaltis e comemora!',
    'Convertido! {team} ganha a disputa da marca da cal!',
    'Fim de papo nas penalidades, o {team} é quem leva a vitória!',
    'Bateu forte, converteu! {team} leva a melhor na marca do pênalti!',
    'Deu {team} nos pênaltis! Vitória dramática no finalzinho!',
  ],
};
