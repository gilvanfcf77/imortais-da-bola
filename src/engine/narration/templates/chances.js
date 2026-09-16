// Attempts that don't end in a goal: missed chances, whiffed shots, and
// the defensive side of a close call (a save, a goal-line clearance, a
// handball stopping a certain goal).

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.CHANCE_MISSED]: [
    '{player} recebe na área, mas manda para fora.',
    '{player} finaliza e o goleiro espalma.',
    '{player} tenta o chute, mas a bola sobra fraca para o goleiro.',
    'Boa jogada {teamOf}, mas {player} desperdiça a chance.',
    '{player} bate todo torto e a bola passa longe do gol.',
    'Que perna torta! {player} chuta torto e nem assusta o goleiro.',
    'Inacreditável! {player} perde um gol feito de frente para a rede.',
    '{player} ganha a disputa, chuta forte, mas explode a bola na trave.',
    'Tinha tudo para fazer o gol, mas {player} isola a bola.',
  ],
  [EVENT_TYPES.WHIFF]: [
    '{player} vai para o chute, erra a bola feio e cai sentado — a torcida {crowdOf} vaia sem dó.',
    'Vexame de {player}: erra o chute, escorrega e vai ao chão. Muita vaia da torcida {crowdOf} nas arquibancadas.',
    '{player} tenta a finalização, fura completamente e cai. A torcida {crowdOf} não perdoa e vaia.',
    'Que feio, {player}! Furada bisonha na hora H e a torcida {crowdOf} perde a paciência.',
    '{player} tenta pegar de primeira, mas passa batido pela bola e vira chacota nas arquibancadas {crowdOf}.',
    'Furou! {player} isola o vento e ouve o coro de vaias da torcida {crowdOf}.',
    'Olha o que ele tentou! {player} chuta o vazio e a torcida {crowdOf} não perdoa o lance ridículo.',
    'Que risada na arquibancada {crowdOf}! {player} tenta o voleio, pega no vento e cai de bunda no chão.',
  ],
  // Distinct from WHIFF above: this fires when the player whiffing is the
  // home team's own — see match.js resolveShot. The home crowd (the only
  // one modeled, per CROWD_SILENCED/WHIFF's "dominant presence" convention)
  // wouldn't jeer its own player for a miss the way it jeers a rival's; a
  // pained groan or hands-on-head reaction reads truer than a boo.
  [EVENT_TYPES.WHIFF_HOME_MISS]: [
    '{player} vai para o chute, erra a bola feio e cai sentado — a torcida {teamOf} leva as mãos à cabeça.',
    'Vexame de {player}: erra o chute, escorrega e vai ao chão. A torcida {teamOf} mal acredita no que viu.',
    '{player} tenta a finalização, fura completamente e cai. Muita lamentação nas arquibancadas.',
    'Olha isso! {player} isola tanto que a bola vai parar lá no estacionamento, que vexame!',
    '{player} pega mal na bola, fura o chute e protagoniza a cena mais bisonha da rodada.',
  ],
  // {defender} here is always the goalkeeper — see match.js's wall-trait
  // check (`defenderPlayer.position === 'GK'`): an outfield player with the
  // `wall` trait making the same kind of stop instead fires
  // GOAL_LINE_CLEARANCE (or, if the handball roll lands, HANDBALL_ON_THE_LINE),
  // never this event. Keep every template here describing a keeper's save
  // (hands, diving, reflexes) — never a defensive-line block/clearance,
  // which reads wrong for a goalkeeper (caught live: "bloqueia... com o
  // corpo" and "aparece para cortar" both originally leaned defender-only).
  [EVENT_TYPES.WALL_SAVE]: [
    '{player} finaliza, mas {defender} faz uma defesaça.',
    '{player} bate forte, mas {defender} sai bem e evita o gol com uma defesa espetacular.',
    'Na hora certa, {defender} aparece para defender o chute de {player}.',
    'Chute colocado! {defender} se estica todo e bloqueia a finalização de {player} com o corpo.',
    '{player} tenta o arremate, mas {defender} se joga na bola e salva o time!',
    'Olha o chute... {defender} trava no momento exato e impede o gol de {player}!',
    '{player} pega a sobra e manda pro gol, mas {defender} aparece milagrosamente para evitar o gol!',
  ],
  [EVENT_TYPES.GOAL_LINE_CLEARANCE]: [
    'Inacreditável! {defender} aparece do nada e tira o chute de {player} em cima da linha!',
    '{defender} salva o time, tirando a bola quase dentro do gol depois do chute de {player}.',
    'Que corte! {defender} evita o gol de {player} tirando em cima da linha.',
    'Salvou na bacia das almas! {defender} impede o gol certo de {player} bem em cima da linha!',
    '{player} já comemorava, mas {defender} tira de carrinho quase dentro do gol!',
    'Tira {defender}! A bola ia entrando mansinha depois da finalização de {player}!',
    'Milagre defensivo! {defender} afasta o perigo em cima da linha no chute de {player}!',
  ],
  [EVENT_TYPES.HANDBALL_ON_THE_LINE]: [
    '{defender} usa a mão para defender o chute de {player}! Será que o juizão viu?',
    'Escandaloso: {defender} salva com a mão em cima da linha depois do chute de {player}. Todos olham para o juiz.',
    'Mão na bola! {defender} impede o gol de {player} tocando com a mão dentro da área.',
    'Salva com a mão, {defender}! A finalização de {player} tinha endereço certo, mas o braço impediu o gol.',
    'Inacreditável! {defender} espalma a bola em cima da linha no chute de {player}.',
    'Olha o desespero de {defender}, que tira a bola com a mão na hora do chute de {player}!',
    'Defesa ilegal! {defender} impede o gol de {player} usando claramente o braço.',
  ],
};
