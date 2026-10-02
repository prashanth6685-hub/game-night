#!/usr/bin/env bash
# Runs every game-logic test with node's built-in test runner.
# TypeScript files run directly via node's type stripping (node >= 22.6).
set -euo pipefail
cd "$(dirname "$0")/.."

mapfile -t files < <(find client/src server/src shared -name '*.test.ts' 2>/dev/null | sort)
if [ "${#files[@]}" -eq 0 ]; then
  echo "no test files found"
  exit 1
fi
printf 'test files:\n  %s\n' "${files[@]}"
node --test "${files[@]}"
