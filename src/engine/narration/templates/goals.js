// Every way a goal can actually go in — see GOAL_EVENT_TYPES in index.js
// for the full list this pairs with.

import { EVENT_TYPES } from '../event-types.js';

export const TEMPLATES = {
  [EVENT_TYPES.GOAL]: [
    'GOOOOL! {player} balança as redes {teamFor}!',
    '{player} não perdoa e marca {teamFor}!',
    'GOOOOL! Que golaço de {player} para deixar {teamArticle} na frente do placar!',
    'TÁ LÁ DENTRO! {player} chuta no canto e marca {teamFor}!',
    'É GOL! {player} pega a sobra e estufa a rede {teamFor}!',
    'NO CAPRICHO! {player} tira do goleiro e coloca {teamArticle} na frente!',
    'SABE DE QUEM? {player}! Ele surge livre na área e marca {teamFor}!',
    'Olha o gol! {player} solta uma bomba de fora da área para explodir o placar {teamFor}!',
    'A bola sobra limpa e {player} só empurra para o fundo do gol {teamOf}!',
  ],
  [EVENT_TYPES.GOAL_ANOTHER]: [
    'É gol! {player} completa a jogada e faz mais um {teamFor}.',
    '{player} amplia o placar {teamFor}!',
    'Mais um gol {teamOf}, dessa vez com {player} completando pra rede.',
    'Gol! {player} pega a sobra na área e manda pro fundo do gol {teamOf}!',
    'A rede sacode de novo! {player} marca {teamFor}!',
    'Lá vai {teamArticle} comemorar mais um! {player} deixa a marca dele!',
    'É de {player}! Ele aparece de novo para ampliar a vantagem {teamOf}!',
  ],
  [EVENT_TYPES.GOAL_INDIVIDUAL]: [
    '{player} arranca em jogada individual, passa por todo mundo e marca {teamFor}!',
    'Que golaço de {player}! Pega a bola no meio-campo, dribla a marcação sozinho e balança as redes {teamFor}.',
    '{player} não pediu ajuda pra ninguém: arranca sozinho e faz um golaço {teamFor}.',
    'Olha o {player} cortando pra dentro, deixou a zaga no chão e estufou a rede {teamFor}!',
    'É um show de {player}! Entrou driblando todo mundo e mandou pro fundo do gol {teamOf}.',
    'Sozinho, {player} rabiscou o marcador, invadiu a área e ampliou {teamFor}!',
    'Golaço de placa! {player} carrega desde a intermediária, passa como quer e marca {teamFor}.',
  ],
  [EVENT_TYPES.GOAL_ASSISTED]: [
    '{player} recebe passe de {assist} e não perdoa: gol {teamOf}!',
    'Belíssima assistência de {assist}, {player} só empurra para o gol e marca {teamFor}.',
    '{assist} enfia a bola no espaço certo e {player} só precisa completar {teamFor}.',
    'Cruzamento na medida de {assist}, e {player} testa firme pro fundo da rede {teamFor}!',
    '{assist} tabela bonito, {player} ganha da zaga e solta a bomba para marcar {teamFor}!',
    'A bola veio açucarada de {assist} e {player} teve o trabalho só de empurrar pro gol {teamOf}!',
    '{assist} acha um passe cirúrgico, {player} sai cara a cara com o goleiro e faz o gol {teamOf}!',
  ],
  [EVENT_TYPES.GOAL_CORNER]: [
    'Na cobrança de escanteio de {assist}, {player} sobe mais que a marcação e cabeceia para o gol {teamOf}!',
    '{assist} bate o escanteio, {player} aparece livre na área e testa para as redes — gol {teamOf}.',
    'Olha o cruzamento na área! {assist} manda na cabeça de {player}, que testa firme para estufar a rede {teamOf}!',
    'Saiu o escanteio! {assist} coloca a bola na cabeça de {player}, que fuzila para o fundo do gol {teamOf}!',
    '{assist} cobra o escanteio fechadinho, {player} ganha no alto e cabeceia direto para o gol {teamOf}!',
    'Bola alçada na área por {assist}, {player} sobe sozinho no meio da zaga e cabeceia para marcar {teamFor}!',
    'Vem o escanteio na direção de {player}! O cruzamento perfeito de {assist} vira gol {teamOf}!',
  ],
  [EVENT_TYPES.GOAL_LONG_SHOT]: [
    '{player} arrisca de longe e acerta um voleio incrível! Gol {teamOf}.',
    'De fora da área, {player} bate colocado e não dá chance para o goleiro. Golaço {teamOf}!',
    '{player} bate cruzado de fora da área e balança as redes {teamFor}.',
    '{player} arrisca de longe, a bola desvia em {victim} e engana o goleiro — gol {teamOf}!',
    'Chute de fora da área de {player} pega a marca de {victim} e muda de direção, morrendo no fundo do gol {teamOf}.',
    'Que pancada! {player} arriscou da intermediária e mandou no ângulo. Gol {teamOf}!',
    '{player} limpou a jogada em cima de {victim} e soltou o pé do meio da rua! Golaço {teamOf}!',
    'Viu a brecha e mandou ver! {player} bateu de muito longe e estufou as redes {teamFor}!',
  ],
  [EVENT_TYPES.GOAL_REFEREE_DEFLECTION]: [
    '{player} bate de longe, a bola desvia no juiz e sem querer engana o goleiro — gol {teamOf}! Nem o árbitro acredita no que fez.',
    'Cena inusitada: o chute de {player} bate no juiz, muda de direção e morre no fundo do gol. Gol validado {teamFor}!',
    '{player} arrisca de longe, a bola bate em cheio no árbitro e entra! Ninguém sabe se ri ou reclama, mas o gol é {teamOf}.',
    'Inacreditável! O chute de {player} explode no corpo do juiz, mata o goleiro e entra! Gol {teamOf}!',
    'Que momento bizarríssimo! {player} mandou a bomba, a bola carimbou o apito e foi pra rede! É gol {teamOf}!',
    'Assistência de quem? A bola bate na perna do árbitro depois da batida de {player} e desvia direto pro gol! Gol {teamOf}!',
    'Olha o gol mais esquisito do campeonato! {player} finalizou, a bola resvalou no homem do apito e morreu lá dentro. Gol {teamOf}!',
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
    'Escandaloso! {player} empurra a bola pra dentro com a mão e o juiz não vê nada — vale o gol {teamOf}!',
    'Que absurdo! A bola bate visivelmente no braço de {player} antes de entrar, mas a arbitragem não notou. Gol {teamOf}!',
    'Ninguém vai acreditar nisso: {player} completa pro gol com o punho fechado, e o árbitro manda seguir o jogo. Gol {teamOf}!',
    'Mão na bola, sem sombra de dúvida! {player} empurra pra rede e o juiz confirma o gol {teamOf} mesmo assim.',
    'Vergonhoso! {player} desvia a bola pra dentro com a mão erguida bem na frente de todo mundo, e o juiz não marca nada. Gol {teamOf}!',
  ],
  [EVENT_TYPES.GOAL_DEFENSIVE_BLUNDER]: [
    'Gol {teamOf}! {victim} erra feio o passe e entrega de bandeja para {player}, que não perdoa.',
    'GOOOOL! Zagueiro {victim} escorrega na hora errada e {player} aproveita a lambança para marcar {teamFor}.',
    'Que presente de {victim}! {player} toma a bola na área e estufa a rede! Gol {teamOf}!',
    'Que que é isso?! {victim} recua curto demais, {player} se antecipa e marca {teamFor}!',
    'Inacreditável o vacilo de {victim}! {player} recupera a posse e manda pro fundo do gol! É gol {teamOf}!',
    '{victim} dormiu com a bola nos pés! {player} tomou na esperteza e fez o gol {teamOf}!',
    '{victim} se enrolou todinho na zaga, {player} aproveitou a sobra e guardou! Gol {teamOf}!',
  ],
  [EVENT_TYPES.GOAL_GOALKEEPER_BLUNDER]: [
    'GOOOOL! Frango! {keeper} deixa a bola escapar das mãos e {player} só empurra para o gol {teamOf}.',
    'GOOOOL! {keeper} falha feio na saída e {player} aproveita o vacilo para marcar {teamFor}. Que vexame do goleiro!',
    'GOOOOL! Que lambança absurda! {keeper} fura o chute no recuo e dá o gol de presente para {player} marcar {teamFor}!',
    'GOOOOL! Aceitou! Um chute fraco de {player} e {keeper} engole um peru inacreditável! Gol {teamOf}!',
    'GOOOOL! Inacreditável! {keeper} tenta sair jogando de pé em pé, perde a bola para {player} e entrega o gol {teamFor}!',
    'GOOOOL! Bateu roupa! {keeper} solta uma bola fácil no pé de {player}, que só confere pro fundo da rede {teamOf}!',
    'GOOOOL! Que trapalhada! {keeper} tromba com a defesa, a bola sobra viva e {player} manda pro gol {teamOf}!',
  ],
  [EVENT_TYPES.GOAL_PENALTY]: [
    '{player} não trai a confiança e converte a cobrança de pênalti {teamFor}!',
    'Na marca da cal, {player} manda para o canto e marca de pênalti {teamFor}.',
    'De cavadinha! {player} engana o goleiro e marca de pênalti {teamFor}. Que frieza na hora da cobrança!',
    'Bateu bonito, na bochecha da rede! {player} cobra com categoria e faz o gol {teamOf}!',
    'Goleiro para um lado, bola para o outro! {player} só desloca e sai pro abraço! Gol {teamOf}!',
    'Calma de veterano! {player} vai pra bola, chapa no canto e marca {teamFor}!',
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
