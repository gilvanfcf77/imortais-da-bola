// Match event types and their Portuguese narration templates. The engine's
// code is English, but the narration text is player-facing content for a
// Brazilian audience, so it stays in Portuguese (see CLAUDE.md "Motor de
// simulação" and "Tom dos eventos").

export const EVENT_TYPES = {
  KICKOFF: 'kickoff',
  HALFTIME: 'halftime',
  FULLTIME: 'fulltime',
  STOPPAGE_TIME_ANNOUNCED: 'stoppageTimeAnnounced',
  STOPPAGE_TIME_BOOED_SHORT: 'stoppageTimeBooedShort',
  STOPPAGE_TIME_BOOED_LONG: 'stoppageTimeBooedLong',
  CHANCE_MISSED: 'chanceMissed',
  WHIFF: 'whiff',
  WHIFF_HOME_MISS: 'whiffHomeMiss',
  WALL_SAVE: 'wallSave',
  GOAL_LINE_CLEARANCE: 'goalLineClearance',
  HANDBALL_ON_THE_LINE: 'handballOnTheLine',
  GOAL: 'goal',
  GOAL_ANOTHER: 'goalAnother',
  GOAL_INDIVIDUAL: 'goalIndividual',
  GOAL_ASSISTED: 'goalAssisted',
  GOAL_CORNER: 'goalCorner',
  GOAL_LONG_SHOT: 'goalLongShot',
  GOAL_REFEREE_DEFLECTION: 'goalRefereeDeflection',
  GOAL_DEFENSIVE_BLUNDER: 'goalDefensiveBlunder',
  GOAL_GOALKEEPER_BLUNDER: 'goalGoalkeeperBlunder',
  GOAL_PENALTY: 'goalPenalty',
  PENALTY_NOT_GIVEN: 'penaltyNotGiven',
  PENALTY_PHANTOM: 'penaltyPhantom',
  PENALTY_WRONG_LOCATION: 'penaltyWrongLocation',
  PENALTY_AWARDED: 'penaltyAwarded',
  PENALTY_MIND_GAMES: 'penaltyMindGames',
  PENALTY_MISSED: 'penaltyMissed',
  DISALLOWED_GOAL: 'disallowedGoal',
  OFFICIAL_ASSAULTED: 'officialAssaulted',
  FOUL: 'foul',
  SCANDALOUS_FOUL: 'scandalousFoul',
  SCANDALOUS_FOUL_IGNORED: 'scandalousFoulIgnored',
  SEVERE_INJURY: 'severeInjury',
  NO_CARD_DESPITE_INJURY: 'noCardDespiteInjury',
  FREE_KICK_GOAL: 'freeKickGoal',
  GOALKEEPER_FORWARD: 'goalkeeperForward',
  CROWD_SILENCED: 'crowdSilenced',
  YELLOW_CARD: 'yellowCard',
  SECOND_YELLOW_RED: 'secondYellowRed',
  STRAIGHT_RED: 'straightRed',
  NUTMEG_TAUNT: 'nutmegTaunt',
  TRASH_TALK: 'trashTalk',
  FIGHT_CALLOUT: 'fightCallout',
  BRAWL: 'brawl',
  BRAWL_CARD_FIRST: 'brawlCardFirst',
  BRAWL_CARD: 'brawlCard',
  TIME_WASTING: 'timeWasting',
  THROW_IN_DELAY: 'throwInDelay',
  GOAL_KICK_DELAY: 'goalKickDelay',
  SHOWBOATING: 'showboating',
  SHOOTOUT_START: 'shootoutStart',
  SHOOTOUT_KICK_SCORED: 'shootoutKickScored',
  SHOOTOUT_KICK_MISSED: 'shootoutKickMissed',
  SHOOTOUT_WINNER: 'shootoutWinner',
  // Not looked up in TEMPLATES below — a player-specific special event's
  // text comes from that player's own data (see `specialAbility.templates`
  // in the club data and `narrateCustom` / `resolveSpecialAbility`), since
  // it's bespoke to one player rather than shared across a trait category.
  PLAYER_SPECIAL: 'playerSpecial',
};

const TEMPLATES = {
  [EVENT_TYPES.KICKOFF]: ['Bola rolando! {team} contra {opponent}.'],
  [EVENT_TYPES.HALFTIME]: ['Fim de primeiro tempo: {team} {homeGoals} x {awayGoals} {opponent}.'],
  [EVENT_TYPES.FULLTIME]: ['Apito final! {team} {homeGoals} x {awayGoals} {opponent}.'],
  [EVENT_TYPES.STOPPAGE_TIME_ANNOUNCED]: [
    'O quarto árbitro levanta a placa: {minutes} minutos de acréscimo.',
    'Acréscimo confirmado: mais {minutes} minutos até o fim desta etapa.',
  ],
  [EVENT_TYPES.STOPPAGE_TIME_BOOED_SHORT]: [
    'A torcida do {crowd} vaia o acréscimo — acha pouco tempo pra buscar o resultado.',
    'Vaias nas arquibancadas: a torcida do {crowd} queria mais minutos de bola rolando.',
  ],
  [EVENT_TYPES.STOPPAGE_TIME_BOOED_LONG]: [
    'A torcida do {crowd} vaia o acréscimo — acha tempo demais e teme o susto no fim do jogo.',
    'Reclamação geral da torcida do {crowd}: tanto acréscimo assim só dá mais chance pro adversário.',
  ],

  [EVENT_TYPES.CHANCE_MISSED]: [
    '{player} recebe na área, mas manda para fora.',
    '{player} finaliza e o goleiro espalma.',
    '{player} tenta o chute, mas a bola sobra fraca para o goleiro.',
    'Boa jogada de {team}, mas {player} desperdiça a chance.',
    '{player} bate todo torto e a bola sai varrendo, longe do gol.',
    'Que perna torta! {player} chuta torto e nem assusta o goleiro.',
  ],
  [EVENT_TYPES.WHIFF]: [
    '{player} vai para o chute, erra a bola feio e cai sentado — a torcida do {crowd} vaia sem dó.',
    'Vexame de {player}: erra o chute, escorrega e vai ao chão. Muita vaia da torcida do {crowd} nas arquibancadas.',
    '{player} tenta a finalização, fura completamente e cai. A torcida do {crowd} não perdoa e vaia.',
  ],
  // Distinct from WHIFF above: this fires when the player whiffing is the
  // home team's own — see match.js resolveShot. The home crowd (the only
  // one modeled, per CROWD_SILENCED/WHIFF's "dominant presence" convention)
  // wouldn't jeer its own player for a miss the way it jeers a rival's; a
  // pained groan or hands-on-head reaction reads truer than a boo.
  [EVENT_TYPES.WHIFF_HOME_MISS]: [
    '{player} vai para o chute, erra a bola feio e cai sentado — a torcida do {team} leva as mãos à cabeça.',
    'Vexame de {player}: erra o chute, escorrega e vai ao chão. A torcida do {team} mal acredita no que viu.',
    '{player} tenta a finalização, fura completamente e cai. Muita lamentação nas arquibancadas.',
  ],
  [EVENT_TYPES.WALL_SAVE]: [
    '{player} finaliza, mas {defender} faz a defesaça e segura tudo.',
    '{player} bate forte, mas {defender} sai bem e evita o gol com uma defesa espetacular.',
    'Na hora certa, {defender} aparece para bloquear o chute de {player}.',
  ],
  [EVENT_TYPES.GOAL_LINE_CLEARANCE]: [
    '{defender} aparece do nada e tira em cima da linha! Estava tudo consumado no chute de {player}.',
    '{defender} salva o time, tirando a bola quase dentro do gol depois do chute de {player}.',
    'Que corte! {defender} evita o gol de {player} tirando em cima da linha.',
  ],
  [EVENT_TYPES.HANDBALL_ON_THE_LINE]: [
    '{defender} usa a mão para defender o chute de {player}! Será que o juizão viu?',
    'Escandaloso: {defender} salva com a mão em cima da linha depois do chute de {player}. Todos olham para o juiz.',
    'Mão na bola! {defender} impede o gol de {player} tocando com a mão dentro da área.',
  ],
  [EVENT_TYPES.GOAL]: [
    'GOOOOL! {player} balança as redes para {team}!',
    '{player} não perdoa e marca para {team}!',
  ],
  [EVENT_TYPES.GOAL_ANOTHER]: [
    'É gol! {player} completa a jogada e faz mais um para {team}.',
    '{player} amplia o placar para {team}!',
    'Mais um gol de {team}, dessa vez com {player} completando pra rede.',
  ],
  [EVENT_TYPES.GOAL_INDIVIDUAL]: [
    '{player} arranca em jogada individual, passa por todo mundo e marca para {team}!',
    'Que golaço de {player}! Pega a bola no meio-campo, dribla a marcação sozinho e balança as redes para {team}.',
    '{player} não pediu ajuda pra ninguém: arranca sozinho e faz um golaço para {team}.',
  ],
  [EVENT_TYPES.GOAL_ASSISTED]: [
    '{player} recebe passe de {assist} e não perdoa: gol de {team}!',
    'Belíssima assistência de {assist}, {player} só empurra para o gol e marca para {team}.',
    '{assist} enfia a bola no espaço certo e {player} só precisa completar para {team}.',
  ],
  [EVENT_TYPES.GOAL_CORNER]: [
    'Na cobrança de escanteio, {player} sobe mais que a marcação e cabeceia para o gol de {team}!',
    'Escanteio na área, {player} aparece livre e testa para as redes — gol de {team}.',
  ],
  [EVENT_TYPES.GOAL_LONG_SHOT]: [
    '{player} arrisca de longe e acerta um voleio incrível! Gol de {team}.',
    'De fora da área, {player} bate colocado e não dá chance para o goleiro. Golaço de {team}!',
    '{player} bate cruzado de fora da área e balança as redes para {team}.',
    '{player} arrisca de longe, a bola desvia em {victim} e engana o goleiro — gol de {team}!',
    'Chute de fora da área de {player} pega a marca de {victim} e muda de direção, morrendo no fundo do gol de {team}.',
  ],
  [EVENT_TYPES.GOAL_REFEREE_DEFLECTION]: [
    '{player} bate de longe, a bola desvia no juiz e sem querer engana o goleiro — gol de {team}! Nem o árbitro acredita no que fez.',
    'Cena inusitada: o chute de {player} bate no juiz, muda de direção e morre no fundo do gol. Gol validado para {team}!',
    '{player} arrisca de longe, a bola bate em cheio no árbitro e entra! Ninguém sabe se ri ou reclama, mas o gol é de {team}.',
  ],
  [EVENT_TYPES.GOAL_DEFENSIVE_BLUNDER]: [
    '{victim} erra feio o passe e entrega de bandeja para {player}, que não perdoa. Gol de {team}!',
    'Zagueiro {victim} escorrega na hora errada e {player} aproveita a lambança para marcar para {team}.',
  ],
  [EVENT_TYPES.GOAL_GOALKEEPER_BLUNDER]: [
    'Frango! {keeper} deixa a bola escapar das mãos e {player} só empurra para o gol de {team}.',
    '{keeper} falha feio na saída e {player} aproveita o vacilo para marcar para {team}. Vexame do goleiro!',
  ],
  [EVENT_TYPES.GOAL_PENALTY]: [
    '{player} não trai a confiança e converte a cobrança de pênalti para {team}!',
    'Na marca da cal, {player} manda para o canto e marca de pênalti para {team}.',
    'De cavadinha! {player} engana o goleiro e marca de pênalti para {team}. Que frieza na hora da cobrança!',
  ],
  [EVENT_TYPES.PENALTY_NOT_GIVEN]: [
    'Pênalti claríssimo em cima de {player}, mas o juiz manda o jogo seguir! Revolta de {team}.',
    'A torcida pede, a jogada foi dentro da área, mas o árbitro não marca pênalti para {team}.',
    'Pênalti não marcado: o juiz vê a jogada de perto e ainda assim não assinala nada para {team}.',
  ],
  [EVENT_TYPES.PENALTY_PHANTOM]: [
    '{player} cai na área sem ninguém encostar, mas o juiz aponta para a marca da cal para {team}! Pênalti que não existiu.',
    'A bola bate no peito de {player}, mas o juiz enxerga mão e marca pênalti para {team}. Revolta total do banco adversário.',
    'Simulação descarada: {player} se joga na área e o juiz cai no conto, marcando pênalti para {team}.',
  ],
  [EVENT_TYPES.PENALTY_WRONG_LOCATION]: [
    'A falta em {player} foi cometida bem longe da grande área, mas o juiz aponta para a marca da cal mesmo assim! Pênalti equivocado para {team}.',
    'Replay mostra a falta em {player} do lado de fora da área — o juiz já marcou pênalti para {team} e não volta atrás.',
    'Erro de arbitragem: a falta em {player} aconteceu longe do gol, mas o árbitro assinala pênalti para {team}.',
  ],
  [EVENT_TYPES.PENALTY_AWARDED]: [
    'Pênalti para {team}! O juiz aponta para a marca da cal depois do lance com {player}.',
    'Silêncio no estádio: pênalti assinalado para {team} após a jogada de {player}.',
  ],
  [EVENT_TYPES.PENALTY_MIND_GAMES]: [
    '{keeper} demora para se posicionar e ainda troca provocações com {player}, tentando tirar a concentração dele.',
    'Antes da cobrança, {keeper} aponta para um canto e faz gestos, tentando desestabilizar {player}.',
    '{keeper} pede um tempo com o árbitro e conversa mole com {player} só para atrasar a cobrança.',
    '{keeper} grita: "Eu sei onde você bate!" — tentando plantar a dúvida na cabeça de {player}.',
  ],
  [EVENT_TYPES.PENALTY_MISSED]: [
    '{player} bate mal e {keeper} defende o pênalti! Que alívio para a defesa.',
    'A pressão funcionou: {player} manda a cobrança para fora e desperdiça o pênalti.',
    '{player} bate no meio do gol e {keeper} espalma. Pênalti perdido!',
  ],
  [EVENT_TYPES.SHOOTOUT_START]: [
    'Empate ao fim dos 90 minutos! Vai para a disputa de pênaltis.',
    'Nada resolvido no tempo normal — a decisão vai para as cobranças de pênalti.',
  ],
  [EVENT_TYPES.SHOOTOUT_KICK_SCORED]: [
    '{player} cobra com categoria e converte para {team}.',
    'Sem chances para {keeper}: {player} converte para {team}.',
    '{player} não titubeia e manda para as redes. Converte para {team}.',
  ],
  [EVENT_TYPES.SHOOTOUT_KICK_MISSED]: [
    '{player} desperdiça a cobrança e o banco de {team} lamenta.',
    '{keeper} adivinha o canto e defende a cobrança de {player}!',
    '{player} manda a bola para fora — {team} perde a cobrança.',
  ],
  [EVENT_TYPES.SHOOTOUT_WINNER]: [
    '{team} vence a disputa de pênaltis!',
    'Decidido nas cobranças: {team} sai vencedor da disputa de pênaltis.',
  ],
  [EVENT_TYPES.DISALLOWED_GOAL]: [
    'Momento de fúria! Depois de toda a comemoração, o juiz manda anular o gol de {player}.',
    'Silêncio muda tudo: o árbitro chama o bandeirinha, conversam, e o gol de {player} é anulado. {team} não acredita.',
    'Após toda a comemoração, o juiz ouve o auxiliar e manda anular o gol de {player}. Revolta total de {team}.',
    'O gol de {player} tinha sido dado, mas o árbitro dá meia-volta depois de falar com o bandeirinha e anula tudo.',
  ],
  [EVENT_TYPES.OFFICIAL_ASSAULTED]: [
    '{player} perde a cabeça e parte pra cima do árbitro! Vermelho direto, sem dúvida.',
    'Inacreditável: {player} avança sobre o árbitro e o derruba com um empurrão. Expulso na hora.',
    'Cena lamentável: {player} empurra o bandeirinha. Vermelho direto, sem discussão.',
    'Tumulto total: {player} agride o árbitro e vê o cartão vermelho na hora.',
  ],

  [EVENT_TYPES.FOUL]: [
    'Falta de {player}.',
    '{player} para a jogada com uma falta.',
    'O árbitro marca falta de {player}.',
  ],
  [EVENT_TYPES.SCANDALOUS_FOUL]: [
    '{player} perde a cabeça e rasga a camisa de {victim} no meio do carrinho. O juiz apita na hora, sem acreditar no que viu.',
    '{player} agarra {victim} pela orelha e dá um puxão antes de soltar — cena inacreditável, e o árbitro já vem correndo para cima dele.',
    '{player} derruba {victim} e ainda arranca a caneleira dele no chão. O juiz chega revoltado com a cena.',
    'Depois da falta, {player} pisa de propósito na chuteira de {victim}. O árbitro não acredita no que viu.',
    '{player} puxa {victim} pelo pescoço da camisa e quase rasga o tecido. O juiz vem sério, decidido a não deixar barato.',
  ],
  [EVENT_TYPES.SCANDALOUS_FOUL_IGNORED]: [
    'No fim das contas, o juiz finge que não viu nada e manda o jogo seguir.',
    'Depois de dar uma bronca, o árbitro relaxa e não dá nem cartão amarelo para {player}.',
    'Para a surpresa geral, o juiz não pune {player} — só advertência verbal.',
  ],
  [EVENT_TYPES.SEVERE_INJURY]: [
    '{player} entra duro e {victim} sente a perna estalar — parece grave, mas ele vai tentar seguir jogando.',
    'Lance horrível: {victim} torce o tornozelo numa entrada de {player} e manca visivelmente, mas continua em campo.',
    '{victim} leva uma entrada duríssima de {player} e sai mancando — vai jogar do jeito que der.',
    '{victim} leva uma cotovelada de {player} no rosto e está sangrando — ele grita para o banco que vai jogar assim mesmo.',
  ],
  [EVENT_TYPES.NO_CARD_DESPITE_INJURY]: [
    'Mesmo com {victim} sentindo muitas dores, o juiz não dá nem cartão amarelo para {player}.',
    'Inacreditável: depois de machucar {victim} daquele jeito, {player} nem é advertido pelo árbitro.',
  ],
  [EVENT_TYPES.FREE_KICK_GOAL]: [
    '{player} cobra a falta e manda direto para o gol! Que golaço!',
    'Na cobrança, {player} não desperdiça: é gol de falta!',
  ],
  [EVENT_TYPES.GOALKEEPER_FORWARD]: [
    'Faltando pouco tempo e atrás no placar, {team} manda todo mundo pra área — até o goleiro {keeper} sobe para o ataque!',
    'Bola alçada na área: com o jogo se esgotando, {keeper} deixa o gol vazio e vai brigar pelo empate para {team}.',
    'Desespero total: {team} joga tudo pra frente, {keeper} incluso, na base da bola aérea.',
  ],
  [EVENT_TYPES.CROWD_SILENCED]: [
    '{player} vira pra torcida da casa, faz o gesto de silêncio e manda calar a boca!',
    '{player} comemora o gol que colocou {team} na frente com a mão no ouvido, provocando a torcida do mandante.',
    '{player} aponta pro placar e manda a torcida da casa ficar quieta — {team} assumiu a ponta!',
  ],

  [EVENT_TYPES.YELLOW_CARD]: [
    'Cartão amarelo para {player}.',
    'O árbitro adverte {player} com o amarelo.',
  ],
  [EVENT_TYPES.SECOND_YELLOW_RED]: [
    'Segundo amarelo para {player} — e está expulso!',
  ],
  [EVENT_TYPES.STRAIGHT_RED]: [
    'Vermelho direto para {player}! Entrada duríssima.',
    '{player} recebe cartão vermelho direto e deixa o time com um a menos.',
  ],

  [EVENT_TYPES.NUTMEG_TAUNT]: [
    '{player} dá um chapéu em {victim} e ainda manda um beijo! A torcida vai à loucura.',
    'Depois de humilhar {victim} com um chapéu, {player} manda um beijo para ele. Isso não vai ficar barato.',
    '{player} enfia uma caneta em {victim} e sai gargalhando — que vexame!',
    'Depois da caneta em {victim}, {player} aponta pro próprio nome na camisa.',
    '{player} solta uma sequência de pedaladas e deixa {victim} rodando no gramado.',
    'Show de bola! {player} dá um drible da vaca em {victim} e ainda faz uma dancinha comemorando.',
    '{player} passa a bola por entre as pernas de {victim} pela segunda vez seguida — e ainda tira satisfação.',
    'Depois de driblar {victim}, {player} finge chorar de tanto rir.',
    '{player} dá um rolinho em {victim} e ainda grita "fecha as pernas!" pra ele.',
  ],
  [EVENT_TYPES.TRASH_TALK]: [
    '{player} manda {victim} "ir comer um caju" pra ver se acalma.',
    '{player} pede silêncio pra {victim}, com o dedo na frente da boca.',
    '{player} faz o gesto de "tá falando demais" na cara de {victim}.',
    '{player} finge chorar, com a mão passando no rosto, provocando {victim}.',
    '{player} debocha e manda {victim} calar a boca.',
    'Depois do lance, {player} ainda faz questão de mandar {victim} comer caju.',
  ],
  [EVENT_TYPES.FIGHT_CALLOUT]: [
    '{player} parte pra cima e chama {victim} pra briga!',
    'Climão em campo: {player} desafia {victim} a resolver no braço.',
    '{player} avança e chama {victim} para a porrada.',
  ],
  [EVENT_TYPES.BRAWL]: [
    '{victim} não gostou da provocação e a confusão generalizada toma conta do campo!',
    'Começa o quebra-pau! Os dois times se envolvem numa confusão generalizada.',
  ],
  [EVENT_TYPES.BRAWL_CARD_FIRST]: [
    'Na confusão, {player} leva cartão.',
    'O árbitro já tira o cartão para {player} no meio da bagunça.',
  ],
  [EVENT_TYPES.BRAWL_CARD]: [
    'Na confusão, {player} também leva cartão.',
    '{player} também é flagrado e leva cartão na bagunça.',
  ],

  [EVENT_TYPES.TIME_WASTING]: [
    '{team} demora na reposição de bola para queimar o cronômetro.',
    'Jogador de {team} se joga no chão pedindo atendimento médico, ganhando tempo.',
    '{team} toca a bola devagar no fundo, catimbando o resultado.',
    'Os gandulas do {team} somem com as bolas — não sobra nenhuma pra repor o jogo rápido.',
    'Bola foi pra escanteio, mas o gandula do {team} demora uma eternidade pra devolver.',
  ],
  [EVENT_TYPES.THROW_IN_DELAY]: [
    '{player} demora demais pra cobrar o lateral, catimbando o jogo.',
    '{player} pega a bola e não tem pressa nenhuma pra repor o lateral.',
  ],
  [EVENT_TYPES.GOAL_KICK_DELAY]: [
    '{player} demora uma eternidade pra bater o tiro de meta.',
    'O goleiro {player} segura a bola e não tem pressa nenhuma pra sair jogando.',
  ],
  [EVENT_TYPES.SHOWBOATING]: [
    '{player} começa a fazer embaixadinhas no meio de campo, provocando o adversário com {team} já goleando.',
    'Com o placar tranquilo, {player} não resiste e solta embaixadinhas na cara da marcação.',
    '{player} humilha a marcação com embaixadinhas — {team} está confortável no placar e não perde a chance de se exibir.',
  ],
};

// Every event type that represents a scored goal (increments the score),
// regardless of how it happened — used by callers that need to update a
// scoreboard without hardcoding each style.
export const GOAL_EVENT_TYPES = new Set([
  EVENT_TYPES.GOAL,
  EVENT_TYPES.GOAL_ANOTHER,
  EVENT_TYPES.GOAL_INDIVIDUAL,
  EVENT_TYPES.GOAL_ASSISTED,
  EVENT_TYPES.GOAL_CORNER,
  EVENT_TYPES.GOAL_LONG_SHOT,
  EVENT_TYPES.GOAL_REFEREE_DEFLECTION,
  EVENT_TYPES.GOAL_DEFENSIVE_BLUNDER,
  EVENT_TYPES.GOAL_GOALKEEPER_BLUNDER,
  EVENT_TYPES.GOAL_PENALTY,
  EVENT_TYPES.FREE_KICK_GOAL,
]);

function fillTemplate(template, context) {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? '');
}

export function narrate(type, context, rng) {
  const options = TEMPLATES[type];
  if (!options) throw new Error(`Unknown event type: ${type}`);
  return fillTemplate(rng.pick(options), context);
}

// Same template-filling as narrate(), but for text that isn't in the shared
// TEMPLATES pool — e.g. a player's own bespoke special-event lines.
export function narrateCustom(templates, context, rng) {
  return fillTemplate(rng.pick(templates), context);
}
