// Builds packages/mcp/src/docs-index.json from apps/docs/content/docs/**/*.mdx
// Runs as prebuild step so the index ships with the published npm package.

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(__dirname, '../../../apps/docs/content/docs');
const OUT = resolve(__dirname, '../src/docs-index.json');
const SITE = 'https://docs.uploadkit.dev/docs';

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (full.endsWith('.mdx')) yield full;
  }
}

/**
 * Tiny frontmatter parser — avoids a gray-matter dependency.
 * Supports the subset actually used in this repo: string title/description,
 * optional unquoted values.
 */
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };
  const head = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\n/, '');
  const data = {};
  for (const line of head.split('\n')) {
    const m = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    data[m[1]] = val;
  }
  return { data, body };
}

/** Strip MDX imports + JSX components for cleaner LLM text. */
function stripMdx(body) {
  return body
    .replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/<([A-Z]\w*)[^>]*\/>/g, '') // self-closing capitalised components
    .replace(/<([A-Z]\w*)[^>]*>[\s\S]*?<\/\1>/g, (m) => {
      // keep inner text of components like Callout/Tab — drop the tags
      return m.replace(/<\/?[^>]+>/g, '');
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const pages = [];
for (const abs of walk(DOCS_ROOT)) {
  const rel = relative(DOCS_ROOT, abs).replace(/\\/g, '/').replace(/\.mdx$/, '');
  const slug = rel === 'index' ? '' : `/${rel}`;
  const raw = readFileSync(abs, 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const content = stripMdx(body);
  pages.push({
    path: rel,
    url: `${SITE}${slug}`,
    title: data.title ?? rel,
    description: data.description ?? '',
    content,
  });
}

pages.sort((a, b) => a.path.localeCompare(b.path));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: pages.length,
      pages,
    },
    null,
    2,
  ),
);

const totalBytes = pages.reduce((n, p) => n + p.content.length, 0);
console.log(
  `✓ docs-index: ${pages.length} pages · ${(totalBytes / 1024).toFixed(1)} KB content → ${relative(process.cwd(), OUT)}`,
);
