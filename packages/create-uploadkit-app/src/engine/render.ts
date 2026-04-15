import fsp from 'node:fs/promises';
import path from 'node:path';

export interface TemplateVars {
  name: string;
  pkgManager: string;
  year: string;
}

/**
 * Replace `{{name}}`, `{{pkgManager}}`, `{{year}}` with the given values.
 * Literal string replace — no template engine, no escape handling. Unknown
 * placeholders are left untouched so future keys don't silently disappear.
 */
export function renderPlaceholders(content: string, vars: TemplateVars): string {
  return content
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{pkgManager\}\}/g, vars.pkgManager)
    .replace(/\{\{year\}\}/g, vars.year);
}

/**
 * Files in a scaffolded project that are allowed to contain placeholders.
 * Keep this list small and explicit — we never run a rendering pass over
 * user-authored code.
 */
export const RENDERABLE_FILES = [
  'package.json',
  'README.md',
  '.env',
  '.env.local',
  '.env.example',
];

/**
 * Render placeholders in-place for every `RENDERABLE_FILES` entry that
 * exists at the root of `projectDir`. No-op for missing files.
 */
export async function renderProjectFiles(projectDir: string, vars: TemplateVars): Promise<void> {
  for (const rel of RENDERABLE_FILES) {
    const target = path.join(projectDir, rel);
    let raw: string;
    try {
      raw = await fsp.readFile(target, 'utf8');
    } catch {
      continue; // file not present in this template — fine
    }
    const rendered = renderPlaceholders(raw, vars);
    if (rendered !== raw) {
      await fsp.writeFile(target, rendered);
    }
  }
}
