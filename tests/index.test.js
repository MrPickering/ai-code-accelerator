import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function runCLI(args = []) {
  try {
    const { stdout, stderr } = await execFileAsync('node', ['src/index.js', ...args], {
      cwd: '/home/user/ai-code-accelerator',
      env: { ...process.env, ANTHROPIC_API_KEY: undefined },
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    return { stdout: err.stdout || '', stderr: err.stderr || '', exitCode: err.code };
  }
}

describe('CLI', () => {
  it('shows help with --help', async () => {
    const { stdout, exitCode } = await runCLI(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('--spec');
    expect(stdout).toContain('--inline');
    expect(stdout).toContain('--output');
    expect(stdout).toContain('--model');
    expect(stdout).toContain('--benchmark');
  });

  it('exits with error when no --spec or --inline provided', async () => {
    const { stderr, exitCode } = await runCLI([]);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Either --spec');
  });

  it('exits with error for non-existent spec file', async () => {
    const { stderr, exitCode } = await runCLI(['--spec', 'nonexistent.md']);
    expect(exitCode).not.toBe(0);
    expect(stderr).toContain('Error');
  });
});
