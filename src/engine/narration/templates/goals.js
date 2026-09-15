// Every way a goal can actually go in — see GOAL_EVENT_TYPES in index.js
// for the full list this pairs with.

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.GOAL]: [
    'GOOOOL! {player} balança as redes para {team}!',
    '{player} não perdoa e marca para {team}!',
    'GOOOOL! Que golaço de {player} para deixar o {team} na frente do placar!',
    'TÁ LÁ DENTRO! {player} chuta no canto e marca para o {team}!',
    'É GOL! {player} pega a sobra e estufa a rede pro {team}!',
    'NO CAPRICHO! {player} tira do goleiro e coloca o {team} na frente!',
    'SABE DE QUEM? {player}! Ele surge livre na área e marca pro {team}!',
    'Olha o gol! {player} solta uma bomba de fora da área para explodir o placar para o {team}!',
    'A bola sobra limpa e {player} só empurra para o fundo do gol do {team}!',
  ],
  [EVENT_TYPES.GOAL_ANOTHER]: [
    'É gol! {player} completa a jogada e faz mais um para {team}.',
    '{player} amplia o placar para {team}!',
    'Mais um gol de {team}, dessa vez com {player} completando pra rede.',
    'Gol! {player} pega a sobra na área e manda pro fundo do gol de {team}!',
    'A rede sacode de novo! {player} marca para {team}!',
    'Lá vai o {team} comemorar mais um! {player} deixa a marca dele!',
    'É de {player}! Ele aparece de novo para ampliar a vantagem de {team}!',
  ],
  [EVENT_TYPES.GOAL_INDIVIDUAL]: [
    '{player} arranca em jogada individual, passa por todo mundo e marca para {team}!',
    'Que golaço de {player}! Pega a bola no meio-campo, dribla a marcação sozinho e balança as redes para {team}.',
    '{player} não pediu ajuda pra ninguém: arranca sozinho e faz um golaço para {team}.',
    'Olha o {player} cortando pra dentro, deixou a zaga no chão e estufou a rede pro {team}!',
    'É um show de {player}! Entrou driblando todo mundo e mandou pro fundo do gol do {team}.',
    'Sozinho, {player} rabiscou o marcador, invadiu a área e ampliou para o {team}!',
    'Golaço de placa! {player} carrega desde a intermediária, passa como quer e marca para o {team}.',
  ],
  [EVENT_TYPES.GOAL_ASSISTED]: [
    '{player} recebe passe de {assist} e não perdoa: gol de {team}!',
    'Belíssima assistência de {assist}, {player} só empurra para o gol e marca para {team}.',
    '{assist} enfia a bola no espaço certo e {player} só precisa completar para {team}.',
    'Cruzamento na medida de {assist}, e {player} testa firme pro fundo da rede pelo {team}!',
    '{assist} tabela bonito, {player} ganha da zaga e solta a bomba para marcar pelo {team}!',
    'A bola veio açucarada de {assist} e {player} teve o trabalho só de empurrar pro gol do {team}!',
    '{assist} acha um passe cirúrgico, {player} sai cara a cara com o goleiro e faz o gol do {team}!',
  ],
  [EVENT_TYPES.GOAL_CORNER]: [
    'Na cobrança de escanteio de {assist}, {player} sobe mais que a marcação e cabeceia para o gol de {team}!',
    '{assist} bate o escanteio, {player} aparece livre na área e testa para as redes — gol de {team}.',
    'Olha o cruzamento na área! {assist} manda na cabeça de {player}, que testa firme para estufar a rede de {team}!',
    'Saiu o escanteio! {assist} coloca a bola na cabeça de {player}, que fuzila para o fundo do gol de {team}!',
    '{assist} cobra o escanteio fechadinho, {player} ganha no alto e cabeceia direto para o gol de {team}!',
    'Bola alçada na área por {assist}, {player} sobe sozinho no meio da zaga e cabeceia para marcar para {team}!',
    'Vem o escanteio na direção de {player}! O cruzamento perfeito de {assist} vira gol de {team}!',
  ],
  [EVENT_TYPES.GOAL_LONG_SHOT]: [
    '{player} arrisca de longe e acerta um voleio incrível! Gol de {team}.',
    'De fora da área, {player} bate colocado e não dá chance para o goleiro. Golaço de {team}!',
    '{player} bate cruzado de fora da área e balança as redes para {team}.',
    '{player} arrisca de longe, a bola desvia em {victim} e engana o goleiro — gol de {team}!',
    'Chute de fora da área de {player} pega a marca de {victim} e muda de direção, morrendo no fundo do gol de {team}.',
    'Que pancada! {player} arriscou da intermediária e mandou no ângulo. Gol do {team}!',
    '{player} limpou a jogada em cima de {victim} e soltou o pé do meio da rua! Golaço do {team}!',
    'Viu a brecha e mandou ver! {player} bateu de muito longe e estufou as redes pro {team}!',
  ],
  [EVENT_TYPES.GOAL_REFEREE_DEFLECTION]: [
    '{player} bate de longe, a bola desvia no juiz e sem querer engana o goleiro — gol de {team}! Nem o árbitro acredita no que fez.',
    'Cena inusitada: o chute de {player} bate no juiz, muda de direção e morre no fundo do gol. Gol validado para {team}!',
    '{player} arrisca de longe, a bola bate em cheio no árbitro e entra! Ninguém sabe se ri ou reclama, mas o gol é de {team}.',
    'Inacreditável! O chute de {player} explode no corpo do juiz, mata o goleiro e entra! Gol do {team}!',
    'Que momento bizarríssimo! {player} mandou a bomba, a bola carimbou o apito e foi pra rede! É gol do {team}!',
    'Assistência de quem? A bola bate na perna do árbitro depois da batida de {player} e desvia direto pro gol! Gol do {team}!',
    'Olha o gol mais esquisito do campeonato! {player} finalizou, a bola resvalou no homem do apito e morreu lá dentro. Gol do {team}!',
  ],
  // Very rare — see GOAL_STYLE.PLAIN_HANDBALL_GOAL_CHANCE in constants.js
  // and pickGoalStyle's 'plain' branch in match.js. The whole flavor of
  // this event is that the referee missed it in the moment: it still
  // counts as a goal right away, same as any other, but a handball this
  // obvious is exactly the kind of thing that later gets him to change his
  // mind (a linesman's flag, the losing side's fury) — see
  // COMEDY.HANDBALL_GOAL_DISALLOWED_CHANCE, a much higher reversal chance
  // than a normal goal gets. Most GOAL_HANDBALL goals end up called back;
  // the rare one that survives is the real "Mão de Deus".
  [EVENT_TYPES.GOAL_HANDBALL]: [
    'Escandaloso! {player} empurra a bola pra dentro com a mão e o juiz não vê nada — vale o gol do {team}!',
    'Que absurdo! A bola bate visivelmente no braço de {player} antes de entrar, mas a arbitragem não notou. Gol do {team}!',
    'Ninguém vai acreditar nisso: {player} completa pro gol com o punho fechado, e o árbitro manda seguir o jogo. Gol do {team}!',
    'Mão na bola, sem sombra de dúvida! {player} empurra pra rede e o juiz confirma o gol do {team} mesmo assim.',
    'Vergonhoso! {player} desvia a bola pra dentro com a mão erguida bem na frente de todo mundo, e o juiz não marca nada. Gol do {team}!',
  ],
  [EVENT_TYPES.GOAL_DEFENSIVE_BLUNDER]: [
    'Gol de {team}! {victim} erra feio o passe e entrega de bandeja para {player}, que não perdoa.',
    'GOOOOL! Zagueiro {victim} escorrega na hora errada e {player} aproveita a lambança para marcar para {team}.',
    'Que presente de {victim}! {player} toma a bola na área e estufa a rede! Gol do {team}!',
    'Que que é isso?! {victim} recua curto demais, {player} se antecipa e marca para o {team}!',
    'Inacreditável o vacilo de {victim}! {player} recupera a posse e manda pro fundo do gol! É gol do {team}!',
    '{victim} dormiu com a bola nos pés! {player} tomou na esperteza e fez o gol do {team}!',
    '{victim} se enrolou todinho na zaga, {player} aproveitou a sobra e guardou! Gol de {team}!',
  ],
  [EVENT_TYPES.GOAL_GOALKEEPER_BLUNDER]: [
    'GOOOOL! Frango! {keeper} deixa a bola escapar das mãos e {player} só empurra para o gol de {team}.',
    'GOOOOL! {keeper} falha feio na saída e {player} aproveita o vacilo para marcar para {team}. Que vexame do goleiro!',
    'GOOOOL! Que lambança absurda! {keeper} fura o chute no recuo e dá o gol de presente para {player} marcar pro {team}!',
    'GOOOOL! Aceitou! Um chute fraco de {player} e {keeper} engole um peru inacreditável! Gol do {team}!',
    'GOOOOL! Inacreditável! {keeper} tenta sair jogando de pé em pé, perde a bola para {player} e entrega o gol pro {team}!',
    'GOOOOL! Bateu roupa! {keeper} solta uma bola fácil no pé de {player}, que só confere pro fundo da rede do {team}!',
    'GOOOOL! Que trapalhada! {keeper} tromba com a defesa, a bola sobra viva e {player} manda pro gol do {team}!',
  ],
  [EVENT_TYPES.GOAL_PENALTY]: [
    '{player} não trai a confiança e converte a cobrança de pênalti para {team}!',
    'Na marca da cal, {player} manda para o canto e marca de pênalti para {team}.',
    'De cavadinha! {player} engana o goleiro e marca de pênalti para {team}. Que frieza na hora da cobrança!',
    'Bateu bonito, na bochecha da rede! {player} cobra com categoria e faz o gol do {team}!',
    'Goleiro para um lado, bola para o outro! {player} só desloca e sai pro abraço! Gol do {team}!',
    'Calma de veterano! {player} vai pra bola, chapa no canto e marca para o {team}!',
  ],
  [EVENT_TYPES.FREE_KICK_GOAL]: [
    '{player} cobra a falta e manda direto para o gol! Que golaço!',
    'Na cobrança, {player} não desperdiça: é gol de falta!',
    'Por cima da barreira! {player} bateu com categoria e balançou a rede!',
    '{player} colocou a bola onde a coruja dorme! Cobrança magistral!',
    'Soltou a bomba! {player} encheu o pé na falta e estufou as redes!',
    'Que pintura de {player}! A bola fez a curva perfeita e entrou no ângulo!',
    'No cantinho! {player} bateu com extrema precisão, sem chance pro goleiro!',
  ],
};
