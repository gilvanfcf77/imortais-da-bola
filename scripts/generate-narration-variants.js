// Proposes new narration variants for an existing EVENT_TYPES template pool
// (src/engine/narration/, split by category — see index.js there) or a
// specific player's `specialAbility.templates`
// (a club era JSON file) — see CLAUDE.md "Tom dos eventos" and DECISOES.md
// for why this exists as an offline, human-reviewed batch tool instead of a
// live call from inside the match engine: the engine has to stay pure,
// synchronous and deterministic (DECISOES.md #12), an LLM call per narrated
// event would be far too slow/expensive for a match that already narrates
// dozens of events, and non-deterministic wording would break calibration's
// "same seed, same result" workflow.
//
// This script NEVER writes into src/engine/narration/ or a club JSON file —
// it only prints candidates for a human to review and paste in by hand,
// same as every other piece of narration text in this project. Two rules
// baked into the prompt come from real mistakes caught while piloting this
// by hand before this script existed (see the memory files
// narration-crowd-is-home-only and narration-must-sound-spoken-not-written):
// don't invent an unqualified crowd reaction, and reject anything that
// reads like written prose instead of something a commentator would say
// out loud.
//
// Usage:
//   node scripts/generate-narration-variants.js event GOAL 5
//   node scripts/generate-narration-variants.js ability corinthians 2000 edilson-corinthians-t6nb 5
//   node scripts/generate-narration-variants.js event GOAL 5 --dry-run
//
// Requires GEMINI_API_KEY (free, aistudio.google.com) or OPENAI_API_KEY —
// not needed for --dry-run. Either already exported in the shell, or in a
// .env.local file at the project root (see loadEnvFile below and
// .env.local.example; both .env and .env.local are gitignored). A real
// exported env var always wins over the file, same convention as dotenv.
// If both keys are set, Gemini wins (see resolveProvider below). Both
// providers speak the same OpenAI-compatible chat-completions request/
// response shape, so swapping one for the other needed no prompt/parsing
// changes. Model defaults to gemini-2.0-flash / gpt-4o; override with
// LLM_MODEL. Base URL defaults per-provider; override with LLM_BASE_URL.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { EVENT_TYPES, templatesFor } from '../src/engine/index.js';
import { getClubEras } from '../src/data/clubs/index.js';

// Minimal .env-file loader — no `dotenv` dependency, this project avoids
// adding a package for something this small (same reasoning as using plain
// `fetch` below instead of the `openai` SDK). Handles `KEY=value`,
// `KEY="value with spaces"`, blank lines, and `#` comments; nothing
// fancier than that (no multiline values, no variable expansion).
function loadEnvFile(path) {
  let content;
  try {
    content = readFileSync(path, 'utf8');
  } catch {
    return; // no .env.local — fine, OPENAI_API_KEY may already be exported
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
    // Real environment variables always win — same precedence dotenv uses.
    process.env[key] ??= value;
  }
}

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(join(PROJECT_ROOT, '.env.local'));

const PLACEHOLDER_RE = /\{(\w+)\}/g;

function extractPlaceholders(template) {
  return new Set([...template.matchAll(PLACEHOLDER_RE)].map((m) => m[1]));
}

function allPlaceholdersUsed(templates) {
  const all = new Set();
  for (const t of templates) for (const p of extractPlaceholders(t)) all.add(p);
  return all;
}

// The whole point of piloting this by hand first — see the module doc
// comment above. `mentionsCrowd` is a soft heuristic (a few common words),
// not exhaustive; it exists to flag candidates for a human to double-check,
// not to silently auto-approve or auto-reject on its own.
const CROWD_WORDS = ['torcida', 'arquibancada', 'público', 'estádio vai', 'plateia'];
function mentionsCrowd(template) {
  const lower = template.toLowerCase();
  return CROWD_WORDS.some((w) => lower.includes(w));
}

function buildPrompt({ existingTemplates, placeholders, count, subject }) {
  const crowdAlreadyUsed = existingTemplates.some(mentionsCrowd);
  const placeholderList = [...placeholders].map((p) => `{${p}}`).join(', ') || '(nenhum)';

  const system = `Você escreve narração de eventos de partida de futebol brasileiro para o jogo Imortais da Bola — frases curtas, no tom de um narrador/comentarista de TV ou rádio falando ao vivo, não texto escrito/literário. Regras obrigatórias:

1. Cada frase deve soar como algo que um narrador realmente diria em voz alta durante uma transmissão — direto, natural, sem construções rebuscadas ou "de página" (ex.: evite algo como "encobre o marcador de calcanhar"; prefira o jeito cru que um narrador fala).
2. Use exatamente estes placeholders quando fizer sentido, e NENHUM outro: ${placeholderList}. Não invente placeholders novos.
3. ${
    crowdAlreadyUsed
      ? 'Os templates existentes já mencionam a torcida — pode continuar mencionando, mas lembre-se que essa "torcida" é sempre a do mandante (o motor só modela a torcida da casa), nunca do visitante. Não escreva nada que só faça sentido se o time estiver jogando fora.'
      : 'NÃO mencione reação de torcida, arquibancada ou público — o motor só modela a torcida do mandante, e o time deste evento nem sempre está jogando em casa, então qualquer menção de torcida sem essa garantia fica errada.'
  }
4. Varie a estrutura das frases entre si — não repita o mesmo formato de frase várias vezes.
5. Às vezes pode ser engraçado/exagerado (ver CLAUDE.md "Tom dos eventos"), mas a maioria deve ser séria/plausível — não exagere na piada a ponto de virar bobagem repetida.
6. Não repita nenhuma das frases já existentes, nem uma reformulação óbvia delas.
7. Frases curtas o bastante para caber numa tela de celular — não escreva parágrafos.

Responda SOMENTE com um array JSON de strings, nada mais — sem markdown, sem comentário, só o array.`;

  const user = `Contexto: ${subject}

Frases já existentes (não repita nem parafraseie estas):
${existingTemplates.map((t) => `- ${t}`).join('\n') || '(nenhuma ainda)'}

Gere ${count} frases novas seguindo as regras do prompt de sistema.`;

  return { system, user };
}

// Provider is picked by which API key is actually present — GEMINI_API_KEY
// wins if both are set, since it's free and was the one set up first. Both
// providers speak the same OpenAI-compatible chat-completions shape (that's
// the whole reason a free swap was possible without touching the prompt
// logic below), so this is the only place that knows the two are different.
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

async function callOpenAI({ system, user }) {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error(
      'Nenhuma chave definida. Defina GEMINI_API_KEY (grátis, aistudio.google.com) ou OPENAI_API_KEY — exportada no ambiente, ou num .env.local na raiz do projeto (carregado automaticamente, já está no .gitignore; ver .env.local.example) — ou rode com --dry-run pra só ver o prompt sem chamar a API.',
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
      temperature: 0.9,
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
  if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === 'string')) {
    throw new Error(`Resposta não é um array de strings:\n${content}`);
  }
  return parsed;
}

// Every candidate goes through this before being shown as "ready to use" —
// a candidate that fails stays visible (so a human can still hand-fix it)
// but gets flagged instead of silently presented as safe to paste in.
function validateCandidate(candidate, { existingTemplates, placeholders, crowdAlreadyUsed }) {
  const problems = [];
  const usedPlaceholders = extractPlaceholders(candidate);
  for (const p of usedPlaceholders) {
    if (!placeholders.has(p))
      problems.push(`usa {${p}}, que não está entre os placeholders existentes`);
  }
  if (existingTemplates.includes(candidate)) problems.push('idêntica a um template já existente');
  if (mentionsCrowd(candidate) && !crowdAlreadyUsed) {
    problems.push(
      'menciona torcida/arquibancada sem que os templates existentes já façam isso — confira o lado casa/fora (ver memória narration-crowd-is-home-only)',
    );
  }
  if (candidate.length > 160)
    problems.push(
      `longa (${candidate.length} caracteres) — pode não caber bem numa tela de celular`,
    );
  return problems;
}

function printReport(candidates, { existingTemplates, placeholders, crowdAlreadyUsed }) {
  console.log(
    `\nPlaceholders disponíveis: ${[...placeholders].map((p) => `{${p}}`).join(', ') || '(nenhum)'}\n`,
  );
  console.log('Candidatas geradas:\n');
  let okCount = 0;
  for (const candidate of candidates) {
    const problems = validateCandidate(candidate, {
      existingTemplates,
      placeholders,
      crowdAlreadyUsed,
    });
    if (problems.length === 0) {
      okCount++;
      console.log(`  [OK] ${candidate}`);
    } else {
      console.log(`  [REVISAR] ${candidate}`);
      for (const p of problems) console.log(`           - ${p}`);
    }
  }
  console.log(`\n${okCount}/${candidates.length} passaram na validação automática.`);
  console.log(
    'Nada foi escrito em nenhum arquivo — revise e cole manualmente as que valerem a pena.\n',
  );
}

async function runEventMode(eventTypeName, count, dryRun) {
  const eventType = EVENT_TYPES[eventTypeName];
  if (!eventType) {
    throw new Error(
      `EVENT_TYPES.${eventTypeName} não existe. Veja os nomes válidos em src/engine/narration/event-types.js.`,
    );
  }
  const existingTemplates = templatesFor(eventType);
  const placeholders = allPlaceholdersUsed(existingTemplates);
  const subject = `Tipo de evento: ${eventTypeName} (${eventType}).`;
  const { system, user } = buildPrompt({ existingTemplates, placeholders, count, subject });

  if (dryRun) {
    console.log('--- PROMPT DE SISTEMA ---\n' + system);
    console.log('\n--- PROMPT DE USUÁRIO ---\n' + user);
    return;
  }

  const candidates = await callOpenAI({ system, user });
  printReport(candidates, {
    existingTemplates,
    placeholders,
    crowdAlreadyUsed: existingTemplates.some(mentionsCrowd),
  });
}

async function runAbilityMode(clubSlug, era, personIdOrName, count, dryRun) {
  const eras = getClubEras(clubSlug);
  const eraEntry = eras.find((e) => String(e.era) === String(era));
  if (!eraEntry) throw new Error(`Não achei a época ${era} para o clube ${clubSlug}.`);

  const player = eraEntry.pool.find(
    (p) => p.personId === personIdOrName || p.name.toLowerCase() === personIdOrName.toLowerCase(),
  );
  if (!player)
    throw new Error(
      `Não achei um jogador com personId/nome "${personIdOrName}" em ${clubSlug}/${era}.`,
    );
  if (!player.specialAbility) {
    throw new Error(
      `${player.name} não tem specialAbility definida — não há templates existentes pra usar de base.`,
    );
  }

  const existingTemplates = player.specialAbility.templates;
  const placeholders = allPlaceholdersUsed(existingTemplates);
  const subject = `Habilidade especial de ${player.name} (${clubSlug}, ${era}). minLead: ${
    player.specialAbility.minLead ?? '(nenhum)'
  }, chancePerMinute: ${player.specialAbility.chancePerMinute}.`;
  const { system, user } = buildPrompt({ existingTemplates, placeholders, count, subject });

  if (dryRun) {
    console.log('--- PROMPT DE SISTEMA ---\n' + system);
    console.log('\n--- PROMPT DE USUÁRIO ---\n' + user);
    return;
  }

  const candidates = await callOpenAI({ system, user });
  printReport(candidates, {
    existingTemplates,
    placeholders,
    crowdAlreadyUsed: existingTemplates.some(mentionsCrowd),
  });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((a) => a !== '--dry-run');
  const [mode, ...rest] = positional;

  if (mode === 'event') {
    const [eventTypeName, countStr] = rest;
    if (!eventTypeName)
      throw new Error(
        'Uso: node scripts/generate-narration-variants.js event <EVENT_TYPE> [count] [--dry-run]',
      );
    await runEventMode(eventTypeName, Number(countStr ?? 5), dryRun);
  } else if (mode === 'ability') {
    const [clubSlug, era, personIdOrName, countStr] = rest;
    if (!clubSlug || !era || !personIdOrName) {
      throw new Error(
        'Uso: node scripts/generate-narration-variants.js ability <club-slug> <era> <personId-ou-nome> [count] [--dry-run]',
      );
    }
    await runAbilityMode(clubSlug, era, personIdOrName, Number(countStr ?? 5), dryRun);
  } else {
    throw new Error(
      'Uso:\n  node scripts/generate-narration-variants.js event <EVENT_TYPE> [count] [--dry-run]\n  node scripts/generate-narration-variants.js ability <club-slug> <era> <personId-ou-nome> [count] [--dry-run]',
    );
  }
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
