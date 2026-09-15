// Situations that only come up rarely, outside the normal shape of a
// team's XI: a goalkeeper pushed up for a last-gasp attack, an outfield
// player forced into goal, a player taunting the home crowd into silence.

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.GOALKEEPER_FORWARD]: [
    'Faltando pouco tempo e atrás no placar, {teamArticle} manda todo mundo pra área — até o goleiro {keeper} sobe para o ataque!',
    'Bola alçada na área: com o jogo se esgotando, {keeper} deixa o gol vazio e vai brigar pelo empate {teamFor}.',
    'Desespero total: {teamArticleCap} joga tudo pra frente, {keeper} incluso, na base da bola aérea.',
    'É o tudo ou nada! {keeper} abandona a meta e vai pra grande área tentar o milagre {teamFor}.',
    'Desespero na reta final! O goleiro {keeper} vira centroavante de última hora no abafão {teamOf}.',
    'Olha o goleiro na área! {keeper} sobe no andar de cima para tentar salvar {teamArticle}.',
  ],
  // Fires once the team has no goalkeeper-position player left on the
  // pitch — see maybeAssignStandInGoalkeeper in match.js. Some variants
  // already gesture at the opponent's reaction (GOALKEEPER.
  // OPPONENT_ATTACK_BOOST/OPPONENT_LONG_SHOT_WEIGHT in constants.js): the
  // rival team choosing to press more and shoot from distance more, not
  // this team's defense somehow getting automatically worse.
  [EVENT_TYPES.OUTFIELD_PLAYER_IN_GOAL]: [
    'Sem goleiro no banco, {player} veste a camisa 1 e assume a meta improvisado {teamFor}.',
    '{player} calça as luvas emprestadas para defender o gol {teamOf} — do outro lado, o adversário já farejou a fragilidade e promete arriscar mais de longe.',
    'Emergência {teamIn}: {player} vira goleiro de linha. Um pouco de despreparo, uma grande dose de coragem.',
    'Não tem quem tire a luva dele: {player} vai pro sacrifício e assume o gol {teamOf}.',
    'De linha a goleiro no susto, {player} tenta fechar o gol {teamOf}.',
    'Problema grave {teamFor}, que bota o jogador {player} pra segurar a barra embaixo das traves.',
    '{player} assume a responsabilidade e vira o goleiro {teamOf} no desespero.',
  ],
  [EVENT_TYPES.CROWD_SILENCED]: [
    '{player} vira pra torcida da casa, faz o gesto de silêncio e manda calar a boca!',
    '{player} comemora o gol que colocou {teamArticle} na frente com a mão no ouvido, provocando a torcida do mandante.',
    '{player} aponta pro placar e manda a torcida da casa ficar quieta — {teamArticle} assumiu a ponta!',
    'Silêncio absoluto no estádio! {player} acaba de calar a torcida da casa!',
    'Olha lá para a arquibancada, {player} pede silêncio total após o gol {teamOf}!',
    "{player} faz o gesto de 'psiu' para o torcedor do mandante depois de balançar as redes!",
    'A torcida reclamava, mas {player} respondeu em campo mandando todo mundo ficar quieto!',
  ],
};
