import { describe, it, expect } from 'vitest';

// Prevent the CLI's top-level auto-run from firing when this module is imported.
process.env.UPLOADKIT_CLI_SKIP_MAIN = '1';

const { HELP_TEXT, TEMPLATES } = await import('./index.js');

describe('create-uploadkit-app help text', () => {
  it('mentions the CLI name', () => {
    expect(HELP_TEXT).toContain('create-uploadkit-app');
  });

  it('mentions all four templates', () => {
    for (const template of TEMPLATES) {
      expect(HELP_TEXT).toContain(template);
    }
    expect(TEMPLATES).toEqual(['next', 'sveltekit', 'remix', 'vite']);
  });
});
