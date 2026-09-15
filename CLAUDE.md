# Imortais da Bola — contexto do projeto

Documento de handoff. Cole isto como primeira mensagem no Claude Code, ou salve
na raiz do projeto como `CLAUDE.md` para virar contexto permanente.

---

## O que é

Jogo de futebol manager, web, com contas de usuário. O jogador escolhe um clube
brasileiro, define formação e postura, **sorteia 11 titulares entre os jogadores
históricos daquele clube** (de qualquer época) e disputa uma copa em mata-mata.

O apelo central é nostalgia: um Corinthians sorteado pode juntar Sócrates,
Marcelinho Carioca e Cássio no mesmo time. Onze que nunca existiram.

## Escopo da primeira versão

1. Escolher clube
2. Escolher formação (4-4-2, 4-3-3, 4-2-4...) — define os slots do sorteio
3. Escolher postura (ofensivo / equilibrado / defensivo) e nível de catimba (0-3)
4. Sortear os 11 respeitando os slots da formação
5. "Jogar copa" — mata-mata com jogos de ida e volta (regulamento tipo Copa do Brasil)
6. Simular partida com eventos aparecendo na tela para leitura

Fora do escopo por enquanto: mercado de transferências, temporadas longas,
multiplayer, módulo continental.

## Sistema de overall

Não é precisão estatística — é **nostalgia e status de lenda**, ajustado pela
fase de carreira. Escala 0-99. Duas camadas:

```
overall = teto_lenda - penalidade_fase_carreira - penalidade_relevancia_no_clube
```

- **Teto de lenda**: o quão grande é o nome no imaginário do futebol.
  Garrincha = 99, um bom jogador de rotação sem fama = 78.
- **Modificadores**: Garrincha no Corinthians em 1966 já estava em declínio →
  overall ~80, não 99.

A maioria dos jogadores decentes deve cair entre 65 e 78. Só lendas em fase
excepcional passam de 90 — escala tipo FIFA, não linear.

### Curadoria de elenco real: pesquisar antes de montar

Ao montar a passagem de um clube real numa época específica, pesquisar com
notícias/fontes (Wikipédia, arquivos de jornal, transfermarkt etc.) se cada
jogador realmente fazia parte daquele elenco naquele ano — não presumir só
porque o nome é famoso ou "parece certo". Já aconteceu de um elenco
(São Paulo 2008) incluir um jogador que estava emprestado a outro clube
naquele ano, outro que já tinha sido vendido pra Europa meses antes da
temporada, e um terceiro que na verdade é um jogador famoso confundido com
uma época bem diferente da carreira dele (o Rafinha do Bayern de Munique,
que só foi pro São Paulo de verdade em 2021, não em 2008). Ver decisão 51
em `info/DECISOES.md` para o caso completo, incluindo como os 3 nomes foram
substituídos por jogadores reais daquele elenco.

## Traços (características)

Traços dão personalidade ao time sorteado — dois times de overall parecido
devem jogar diferente. Ficam ligados à **passagem**, não ao jogador, para que o
mesmo nome possa ter perfil diferente em fases distintas da carreira.

Conjunto inicial (começar com 6-8, não 20 — cada traço é curadoria manual):

| slug | efeito |
|---|---|
| `batedor_faltas` | mais chance de gol em falta |
| `pavio_curto` | escolhido como infrator mais vezes E mais chance de cartão |
| `catimbeiro` | aumenta a eficácia da catimba do time |
| `artilheiro` | mais chance de ser o finalizador e de converter |
| `garcom` | aumenta a chance de a jogada virar chance clara |
| `muralha` | goleiro/zagueiro decisivo, reduz conversão adversária |
| `driblador` | provoca mais faltas, cria mais chances |
| `lider` | reage melhor quando o time está atrás |

Cada traço tem `intensidade` de 1 a 3 (evita criar "batedor bom" e "batedor
excepcional" como traços separados).

`lider` não age só quando o time está atrás: times com líder em campo também
devem ter mais chance de **segurar um resultado** — por exemplo, defender um
empate nos minutos finais em vez de sofrer o gol de virada — e mais chance de
**virar o jogo** quando está perdendo. É um efeito tanto defensivo (segurar
resultado) quanto ofensivo (buscar a virada), não só de reação passiva a
desvantagem.

**Risco de calibragem:** traços multiplicativos empilhados estouram fácil. Um
jogador com três traços de intensidade 3 vira semideus sem querer. Colocar teto
no multiplicador combinado.

## Catimba

Mecânica diferencial do jogo. Precisa ser um trade-off real, não um botão de
"ficar mais forte":

- Catimba alta → mais eventos que queimam tempo e quebram ritmo do adversário
  (faltas táticas, demora na reposição, provocação). Bom para segurar resultado.
- Em troca → mais risco de cartão e expulsão.
- **Eficácia depende de ter catimbeiros em campo.** Time sorteado sem nenhum
  catimbeiro com catimba nível 3 só coleciona cartão sem ganhar nada.

Isso faz o sorteio importar para a decisão tática: você olha os 11 que saíram e
decide a postura em função deles.

## Motor de simulação

**Minuto a minuto, não Poisson.** O jogador vai ler os eventos na tela, então o
placar tem que ser consequência dos eventos, não o contrário.

A cada tick: sorteia se acontece algo (ataque, falta, cartão, gol), com as
probabilidades moduladas por força dos setores, postura, catimba e traços dos
dois times.

Traços entram em dois momentos distintos:
1. **Quem** protagoniza o evento (jogador com `pavio_curto` é sorteado mais
   vezes como infrator)
2. **Qual o desfecho** (esse mesmo jogador tem mais chance de que a infração
   vire cartão)

Usar RNG com semente — essencial para calibrar: roda 500 partidas, ajusta uma
constante, roda de novo com a mesma semente e sabe que a diferença veio do
ajuste, não do acaso.

## Tom dos eventos

Os eventos na tela não são só narração seca de placar — às vezes devem ser
**engraçados**. É parte do apelo nostalgia/pilhéria do jogo, não só simulação
séria.

Exemplo: um jogador com `pavio_curto` pode ser sorteado para um evento cômico
de baixa probabilidade em vez do desfecho padrão (cartão) — tipo dar um tapa na
cara do juiz. Isso sugere que eventos precisam de uma camada de "variações de
texto/desfecho" por traço, não só um número de probabilidade ajustando a mesma
frase genérica.

Implicação para o motor: cada (traço, situação) pode ter mais de um desfecho
possível, com pesos — a maioria séria/plausível, uma fatia pequena cômica/
exagerada. Calibragem deve cuidar pra não exagerar na frequência do cômico (vira
piada repetida) nem sumir com ele (perde a graça).

Outro exemplo: um `driblador` estilo Neymar do Santos pode, num drible bem
sucedido, dar um chapéu e mandar um beijo pro zagueiro humilhado — e essa
provocação vira gatilho pra uma **confusão em cadeia**: briga generalizada,
vários cartões saindo de uma vez (não só para os dois envolvidos).

Isso mostra que eventos cômicos não são sempre isolados — alguns devem poder
**encadear outros eventos** (evento cômico → reação do adversário → confusão →
múltiplos cartões). O motor precisa suportar eventos que disparam sub-eventos
em cascata, não só um evento → um desfecho.

## Modelagem de dados

**Princípio inegociável: clube é dado, não código.** Adicionar o Náutico ou o
Boca Juniors deve ser inserir linhas no banco, nunca mexer na lógica do jogo.

```
clubes
  id, slug, nome, apelido, cidade, estado,
  pais (default 'BR'), cor_primaria, cor_secundaria,
  jogavel (bool), fundacao

jogadores
  id, nome, posicao, nacionalidade

passagens          -- jogador X no clube Y, em tal período
  id, jogador_id, clube_id, ano_inicio, ano_fim,
  overall, elegivel_sorteio (bool)

tracos
  id, slug, nome, descricao

passagem_traco
  passagem_id, traco_id, intensidade (1-3)

formacoes
  id, nome ('4-4-2'), slots_json
  -- ex: [{pos:'GOL',qtd:1},{pos:'ZAG',qtd:2},{pos:'LAT',qtd:2},...]

competicoes
  id, slug, nome, tipo, ambito ('nacional' | 'continental')

competicao_clube
  competicao_id, clube_id

usuarios
  id, email, senha_hash, criado_em

partidas
  id, usuario_id, clube_casa_id, clube_fora_id,
  gols_casa, gols_fora, jogado_em

estatisticas
  usuario_id, vitorias, empates, derrotas, gols_pro, gols_contra

metas
  id, usuario_id, descricao, tipo, alvo, progresso, concluida
```

Por que isso resolve a extensibilidade:

- **Novo clube jogável** → insert em `clubes` com `jogavel = true` + passagens
- **Novo adversário de copa** → mesmo insert com `jogavel = false` + vínculo em
  `competicao_clube`. Guarani entra igualzinho ao Flamengo, só muda a flag.
- **Módulo continental futuro** → `pais` já existe desde o dia um. Boca Juniors
  entra como clube normal, competição com `ambito = 'continental'`. Zero
  refatoração.

**Passagens por período, não por temporada.** Um registro para Marcelinho
Carioca 1994-2001 com um overall. Curadoria muito mais leve, e o "Garrincha de
1966" vira só um caso de passagem curta.

**O overall da passagem é ancorado na melhor temporada dentro do período**, não
numa média do período inteiro. Um jogador com um ano de pico e o resto
irregular não deve ser penalizado por isso — o overall reflete o auge daquele
recorte, ver decisão 4 em `info/DECISOES.md`.

**O sorteio é uma consulta, não uma lista fixa:** "todas as passagens do clube X
elegíveis para sorteio". O motor de sorteio nunca sabe qual clube está
processando — recebe um pool e uma formação. Assim o mesmo código sorteia o
Corinthians, o Guarani ou o Boca.

## Clubes

**Jogáveis (os 13 do Clube dos 13):** Flamengo, Corinthians, São Paulo,
Palmeiras, Vasco da Gama, Fluminense, Botafogo, Santos, Atlético Mineiro,
Cruzeiro, Grêmio, Internacional, Bahia.

**Adversários de copa (peso histórico, menos projeção):** Sport, Guarani, Santa
Cruz, Goiás, Coritiba, Portuguesa, Ponte Preta, Bangu, Náutico, Vitória,
Athletico Paranaense, América-MG.

## Stack

- Frontend: React
- Backend: Node.js (ou Next.js API routes)
- Banco + auth: Supabase (Postgres, auth pronta)
- Hospedagem: Vercel
- Ambiente de dev: Windows nativo

## Convenção de idioma

**Todo código do projeto é escrito em inglês** — arquivos, variáveis, funções,
comentários. Os documentos de contexto e decisão (este arquivo, `DECISOES.md`)
continuam em português, por serem para consumo direto da equipe, não para
rodar. Ver decisão 13 em `info/DECISOES.md`.

## Ordem de construção

1. **Motor de simulação isolado**, rodando no terminal com times de teste.
   Sem banco, sem frontend, sem login. Rodar centenas de partidas e verificar se
   os placares fazem sentido, se cartão aparece na frequência certa, se catimba
   muda o jogo. Calibragem é a parte que mais dá trabalho e é muito mais rápida
   num script solto.
2. Sorteio dos 11 + formações
3. Chaveamento da copa (ida e volta)
4. Schema do banco + seed
5. Auth e persistência (contas, estatísticas, metas)
6. Frontend

## Cuidados de marca

O projeto vai ser público e monetizado com anúncios no futuro. Decisões tomadas:

- **Nomes de clubes e jogadores em texto**: ok. Precedente relevante é o
  Football Manager, que usa nomes reais de clubes sem licença desde 1992.
- **Nunca reproduzir escudo oficial nem uniforme licenciado.** A única ação
  judicial que o Manchester United moveu contra a Sega/Sports Interactive foi
  sobre o *crest*, não sobre o nome. No Brasil, toda a jurisprudência que
  encontramos é sobre venda de produto com escudo — nada sobre app de fã usando
  nome em texto.
- **Não usar a marca "Libertadores" nem "CONMEBOL"** no módulo continental
  futuro. A CONMEBOL licencia isso comercialmente (parceria ativa com EA Sports
  FC) e tem manual de marca próprio. Usar nome autoral.
- **Disclaimer visível** de "projeto de fã, sem afiliação oficial".
- Quando houver tráfego e receita reais, consultar advogado de propriedade
  intelectual.

## Primeira tarefa sugerida

Construir o motor de simulação minuto a minuto com traços, postura e catimba,
mais um script de calibragem que roda N partidas e reporta as distribuições
(média de gols, cartões, faltas por partida) para validar se os números saem
plausíveis.
