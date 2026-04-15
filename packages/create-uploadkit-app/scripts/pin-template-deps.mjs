#!/usr/bin/env node
/**
 * Rewrites template package.json SDK deps before publish.
 *
 * For each template in ../templates/*:
 *   - Every dep/devDep matching @uploadkitdev/* is rewritten to ^<workspace-version>
 *     (resolved from the monorepo's own packages package.json files).
 *   - Every other dep/devDep pinned to "latest" is resolved via
 *     `npm view <name> version` and rewritten to ^<resolved>.
 *
 * Runs from `prepublishOnly`, so only the tarball sent to npm gets pinned.
 * Local git-tracked files retain "latest" / "workspace:*" for dev ergonomics.
 *
 * Flags:
 *   --dry-run   Print planned rewrites, don't touch disk.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const templatesDir = join(pkgRoot, 'templates');
const monorepoPackagesDir = resolve(pkgRoot, '..');

const DRY = process.argv.includes('--dry-run');

/** @type {Record<string, string>} */
const workspaceVersions = {};
for (const entry of readdirSync(monorepoPackagesDir)) {
  const pj = join(monorepoPackagesDir, entry, 'package.json');
  try {
    const stat = statSync(pj);
    if (!stat.isFile()) continue;
    const json = JSON.parse(readFileSync(pj, 'utf8'));
    if (json.name && json.version && json.name.startsWith('@uploadkitdev/')) {
      workspaceVersions[json.name] = json.version;
    }
  } catch {
    /* not a package dir */
  }
}

/** @type {Map<string, string>} */
const npmCache = new Map();
function resolveLatest(name) {
  if (npmCache.has(name)) return npmCache.get(name);
  const out = execSync(`npm view ${name} version`, { encoding: 'utf8' }).trim();
  npmCache.set(name, out);
  return out;
}

function processPackageJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  const json = JSON.parse(raw);
  let changed = false;
  const rewrites = [];

  for (const depKey of ['dependencies', 'devDependencies']) {
    const deps = json[depKey];
    if (!deps) continue;
    for (const [name, spec] of Object.entries(deps)) {
      let next = null;
      if (name.startsWith('@uploadkitdev/')) {
        const v = workspaceVersions[name];
        if (!v) {
          throw new Error(
            `Cannot resolve workspace version for ${name} (template: ${filePath}).`
          );
        }
        next = `^${v}`;
      } else if (spec === 'latest' || spec === '*') {
        const v = resolveLatest(name);
        next = `^${v}`;
      }
      if (next && next !== spec) {
        rewrites.push(`  ${depKey}.${name}: ${spec} -> ${next}`);
        deps[name] = next;
        changed = true;
      }
    }
  }

  if (rewrites.length) {
    console.log(`${filePath.replace(pkgRoot + '/', '')}`);
    for (const r of rewrites) console.log(r);
  }

  if (changed && !DRY) {
    writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  }
}

function main() {
  if (DRY) console.log('[pin-template-deps] DRY RUN — no files will be modified.\n');

  const templates = readdirSync(templatesDir).filter((e) =>
    statSync(join(templatesDir, e)).isDirectory()
  );
  for (const t of templates) {
    const pj = join(templatesDir, t, 'package.json');
    try {
      statSync(pj);
    } catch {
      console.warn(`[pin-template-deps] No package.json in template "${t}", skipping.`);
      continue;
    }
    processPackageJson(pj);
  }

  console.log(
    `\n[pin-template-deps] Done. Workspace versions used: ${JSON.stringify(workspaceVersions)}`
  );
}

main();
