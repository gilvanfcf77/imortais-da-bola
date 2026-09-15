import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import eslintConfigPrettier from 'eslint-config-prettier';

const __dirname = dirname(fileURLToPath(import.meta.url));

// FlatCompat lets eslint-config-next's still-legacy-shaped config ("next/
// core-web-vitals") load under ESLint 9's flat config system.
const compat = new FlatCompat({ baseDirectory: __dirname });

// `next/core-web-vitals` alone only covers React/Next/accessibility/import
// concerns — it does NOT include general JS correctness rules (confirmed by
// hand: a throwaway file with `var`, unreachable code, and no semicolons
// passed silently under next/core-web-vitals by itself). Most of this repo
// (src/engine/, scripts/, test/) is plain Node, not React, so
// js.configs.recommended is layered in first to actually catch that class
// of bug there — next/core-web-vitals then adds its own rules on top,
// scoped to wherever JSX/React/Next patterns actually appear.
//
// eslintConfigPrettier goes last so it can switch off any stylistic rule
// (indentation, line length, etc.) the earlier configs might enable —
// formatting is Prettier's job (see .prettierrc.json/.prettierignore and
// the `format`/`format:check` npm scripts), not ESLint's. Keeping the two
// concerns in separate tools avoids the classic failure mode of a
// formatting rule and an editor's auto-format fighting each other.
const eslintConfig = [
  { ignores: ['.next/**', 'node_modules/**', 'logs/**'] },
  js.configs.recommended,
  ...compat.extends('next/core-web-vitals'),
  eslintConfigPrettier,
];

export default eslintConfig;
