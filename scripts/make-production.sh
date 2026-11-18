#!/usr/bin/env bash
# Builds the `production` branch from `main`: the same store, minus everything that only exists for
# development and testing (tests, test tooling, seed and demo scripts, catalogue sample data, the
# built-in test gateway, the design styleguide).
#
#   git checkout production
#   git merge main            # conflicts in package.json, the lockfile or deleted files are expected
#   ./scripts/make-production.sh   # resolves them and strips dev-only files again
#   git add -A && git commit -m "Production: merge main"
#
# Safe to run any number of times. Run it on the production branch only.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/theonlinestore" 2>/dev/null || cd "$(git rev-parse --show-toplevel)"

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "production" ]; then
  echo "Run this on the production branch (you're on '$branch')." >&2
  exit 1
fi

# Mid-merge from main: package.json and the lockfile always conflict (this script edits them), and files
# this script deletes may conflict too. Take main's versions; the steps below strip them again.
if git rev-parse -q --verify MERGE_HEAD >/dev/null; then
  echo "→ Resolving the merge with main's package.json and lockfile"
  git checkout --theirs package.json pnpm-lock.yaml 2>/dev/null || true
  git add package.json pnpm-lock.yaml
  pnpm install --frozen-lockfile >/dev/null
fi

remove() { for p in "$@"; do if [ -e "$p" ] || git ls-files --error-unmatch "$p" >/dev/null 2>&1; then git rm -rq --ignore-unmatch "$p"; rm -rf "$p"; echo "  removed $p"; fi; done; }

echo "→ Tests and test tooling"
remove tests playwright.config.ts vitest.config.mts vitest.setup.ts test.env

echo "→ Seed, demo and design-only scripts and data"
remove scripts/seed-demo.ts scripts/demo scripts/seed-catalog.ts scripts/seed-admin.ts scripts/devOnly.ts \
  scripts/screenshots.mjs scripts/check-contrast.ts seed public/catalogue

echo "→ Test gateway and styleguide"
remove "src/app/(frontend)/checkout/pay/test-gateway" "src/app/(frontend)/styleguide"
cat > src/lib/payments/simulator.ts <<'TS'
/**
 * Production build: there is no test gateway. Card and instalment payments only go through the real
 * gateways configured in Admin › Settings › Payments.
 */
export function simulatorPermitted(_mode: 'test' | 'live', _setting: boolean) {
  return false
}
TS
git add src/lib/payments/simulator.ts

echo "→ package.json: test, seed and design scripts"
node -e '
const fs = require("fs")
const p = JSON.parse(fs.readFileSync("package.json", "utf8"))
for (const k of ["test", "test:e2e", "test:int", "check:contrast", "seed:admin", "seed:catalog", "seed:demo"]) delete p.scripts[k]
fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n")
'
echo "→ Test-only dependencies"
pnpm remove @playwright/test @testing-library/react @vitejs/plugin-react jsdom vite-tsconfig-paths vitest >/dev/null
git add package.json pnpm-lock.yaml

echo "→ Local-only settings in the env template"
sed -i.bak -e '/ALLOW_TEST_GATEWAY/d' -e '/SEED_ADMIN/d' .env.example && rm -f .env.example.bak
git add .env.example

echo "→ Checking the result builds"
pnpm exec tsc --noEmit
pnpm lint >/dev/null
echo "✓ Production branch ready. Review with 'git status', then commit."
