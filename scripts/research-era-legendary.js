// Helps decide whether a newly-added club era file should be marked
// `legendary: true` — see CLAUDE.md's "cup-opponent eligibility" note and
// DECISOES.md decision 16: only eras marked `legendary` can be drawn as a
// cup opponent, and today that boolean is set by hand on every new era file,
// with zero automated checking. This script does NOT replace that manual
// boolean with a derived field (that was tried and reverted — see
// DECISOES.md decision 70's correction note); it stays a plain, hand-set
// `legendary: true/false` per era file. What this script does is help a
// human RESEARCH the call: it asks an LLM what real titles/achievements the
// given club had in the given year and prints a recommendation with its
// reasoning, for a human to verify and then edit the JSON file by hand.
//
// *** HALLUCINATION WARNING — read before trusting any output here. ***
// Unlike scripts/generate-narration-variants.js (creative text, where tone
// matters more than strict factual accuracy), this script asks the model
// for FACTUAL claims — did club X win title Y in year Z — with no live web
// search backing the answer, just the model's training data. This is a
// known, confirmed failure mode on this exact project: a WebSearch-backed
// research agent (which has actual search access, stronger than this
// script) still confused the real Edu (Corinthians 1977, ex-Santos/1970
// World Cup) with Tostão, a different, unrelated player — see DECISOES.md
// decision 68's correction note. This script has no search tool at all, so
// it is strictly more hallucination-prone than that. NEVER paste its output
// straight into a club JSON file — cross-check every claimed title against
// a real source (Wikipédia, RSSSF, ogol.com.br, contemporary sports
// journalism) exactly like CLAUDE.md's "Curadoria de elenco real" section
// already requires for roster curation, before touching `legendary` by
// hand.
//
// Usage:
//   node scripts/research-era-legendary.js corinthians 1977
//   node scripts/research-era-legendary.js corinthians 1977 --dry-run
//
// Requires GEMINI_API_KEY or OPENAI_API_KEY (see generate-narration-
// variants.js's doc comment for how those are resolved/loaded — identical
// mechanism, reused here) — not needed for --dry-run.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

function loadEnvFile(path) {
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(join(PROJECT_ROOT, '.env.local'));

function resolveProvider() {
  if (process.env.GEMINI_API_KEY) {
    return {
      label: 'Gemini',
      apiKey: process.env.GEMINI_API_KEY,
      baseUrl:
        process.env.LLM_BASE_URL ??
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      model: process.env.LLM_MODEL ?? 'gemini-3.6-flash',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      label: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1/chat/completions',
      model: process.env.LLM_MODEL ?? 'gpt-4o',
    };
  }
  return null;
}

function buildPrompt(clubName, era) {
  const system = `Você é um pesquisador de história do futebol brasileiro ajudando a decidir se uma passagem específica de um clube (um ano/época) merece ser marcada como "lendária" num jogo. "Lendária" aqui tem um critério concreto: a época deve corresponder a um recorte de título relevante conquistado pelo clube naquele ano civil, ou — mais raramente — a uma época amplamente reconhecida como icônica pelo elenco reunido, mesmo sem título (seja bem conservador nesse segundo caso).

Responda SOMENTE com um objeto JSON, sem markdown, no formato:
{
  "titles": ["nome do título 1", "nome do título 2"],
  "recommendation": true ou false,
  "confidence": "alta" | "média" | "baixa",
  "reasoning": "explicação curta, em português, citando os títulos/fatos específicos que embasam a recomendação",
  "uncertainNotes": "qualquer dúvida, lacuna ou possível confusão que você mesmo reconhece ter sobre essa resposta — string vazia se não houver nenhuma"
}

Regras:
- "titles" deve listar APENAS títulos que você tem razoável certeza que o clube venceu especificamente naquele ano civil — não invente, não arredonde de anos próximos.
- Se não tiver certeza sobre algo, isso deve aparecer em "uncertainNotes", não ser omitido silenciosamente.
- "confidence": seja honesto — se a resposta depende de detalhes obscuros ou você não tem certeza, marque "baixa", não "alta".`;

  const user = `Clube: ${clubName}\nAno: ${era}\n\nEsse ano deveria ser marcado como "legendary: true" para esse clube?`;

  return { system, user };
}

async function callLLM({ system, user }) {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error(
      'Nenhuma chave definida. Defina GEMINI_API_KEY (grátis, aistudio.google.com) ou OPENAI_API_KEY — exportada no ambiente, ou num .env.local na raiz do projeto — ou rode com --dry-run pra só ver o prompt sem chamar a API.',
    );
  }

  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${provider.label} respondeu ${response.status}: ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Resposta da API sem conteúdo utilizável.');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(`Resposta não veio como JSON válido:\n${content}`);
  }
  return parsed;
}

function printReport(clubSlug, era, result) {
  console.log(`\n=== ${clubSlug} ${era} — proposta de "legendary" ===\n`);
  console.log(
    `Títulos apontados: ${result.titles?.length ? result.titles.join(', ') : '(nenhum)'}`,
  );
  console.log(`Recomendação do modelo: legendary: ${result.recommendation}`);
  console.log(`Confiança do modelo: ${result.confidence ?? '(não informada)'}`);
  console.log(`\nJustificativa: ${result.reasoning ?? '(nenhuma)'}`);
  if (result.uncertainNotes) {
    console.log(`\n⚠ Dúvidas que o próprio modelo reconhece: ${result.uncertainNotes}`);
  }
  console.log(
    '\n*** NÃO edite o JSON com base só nisso. *** Confirme cada título citado acima numa\n' +
      'fonte de verdade (Wikipédia, RSSSF, ogol.com.br, jornal da época) antes de marcar\n' +
      '"legendary" na mão — este script não tem acesso a busca ao vivo e já se provou capaz\n' +
      'de confundir jogadores/fatos neste mesmo projeto (ver DECISOES.md decisão 68).\n' +
      'Nada foi escrito em nenhum arquivo.\n',
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((a) => a !== '--dry-run');
  const [clubSlug, era] = positional;

  if (!clubSlug || !era) {
    throw new Error(
      'Uso: node scripts/research-era-legendary.js <club-slug> <era> [--dry-run]\nExemplo: node scripts/research-era-legendary.js corinthians 1977',
    );
  }

  const { system, user } = buildPrompt(clubSlug, era);

  if (dryRun) {
    console.log('--- PROMPT DE SISTEMA ---\n' + system);
    console.log('\n--- PROMPT DE USUÁRIO ---\n' + user);
    return;
  }

  const result = await callLLM({ system, user });
  printReport(clubSlug, era, result);
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
