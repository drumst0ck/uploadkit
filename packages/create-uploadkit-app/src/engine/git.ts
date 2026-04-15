import { execa } from 'execa';
import pc from 'picocolors';

const INITIAL_COMMIT_MESSAGE = 'chore: initial commit from create-uploadkit-app';

/**
 * Initialise a git repository in `dir` with a single "initial commit".
 * Soft-fails: if git is missing or any step errors, we warn and return so a
 * broken git environment never blocks scaffolding.
 */
export async function initGit(dir: string): Promise<void> {
  try {
    await execa('git', ['init'], { cwd: dir, stdio: 'ignore' });
    await execa('git', ['add', '-A'], { cwd: dir, stdio: 'ignore' });
    await execa('git', ['commit', '-m', INITIAL_COMMIT_MESSAGE], {
      cwd: dir,
      stdio: 'ignore',
      // `git commit` fails if user.email / user.name aren't configured. Pass
      // safe author envs so scaffolding succeeds on fresh machines.
      env: {
        GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME ?? 'UploadKit',
        GIT_AUTHOR_EMAIL: process.env.GIT_AUTHOR_EMAIL ?? 'noreply@uploadkit.dev',
        GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME ?? 'UploadKit',
        GIT_COMMITTER_EMAIL: process.env.GIT_COMMITTER_EMAIL ?? 'noreply@uploadkit.dev',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `${pc.yellow('!')} Skipped git init (${pc.dim(message.split('\n')[0] ?? 'unknown error')})\n`,
    );
  }
}
