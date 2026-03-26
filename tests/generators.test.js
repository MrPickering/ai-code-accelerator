import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callClaude } from '../src/utils.js';
import { generate as scaffoldGenerate } from '../src/scaffold.js';
import { generate as testsGenerate } from '../src/tests.js';
import { generate as docsGenerate } from '../src/docs.js';
import { generate as reviewGenerate } from '../src/review.js';

vi.mock('../src/utils.js', () => ({
  callClaude: vi.fn().mockResolvedValue({
    result: { files: [] },
    usage: { input_tokens: 100, output_tokens: 50 },
  }),
}));

const mockClient = { messages: { create: vi.fn() } };
const spec = '# Test Spec\nBuild a REST API';
const model = 'claude-sonnet-4-20250514';

const scaffold = {
  files: [
    { path: 'src/index.js', content: 'const app = express();', purpose: 'Entry point' },
    { path: 'src/routes.js', content: 'router.get("/")', purpose: 'Routes' },
  ],
  dependencies: { express: '^4.18.0' },
};

const tests = {
  testFiles: [
    { path: 'tests/index.test.js', content: 'test("works", () => {})' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- scaffold.js ---

describe('scaffold.generate', () => {
  it('calls callClaude with system prompt about software architect', async () => {
    await scaffoldGenerate({ client: mockClient, spec, model });

    expect(callClaude).toHaveBeenCalledTimes(1);
    const [client, options] = callClaude.mock.calls[0];
    expect(client).toBe(mockClient);
    expect(options.model).toBe(model);
    expect(options.system).toContain('senior software architect');
    expect(options.userMessage).toBe(spec);
  });

  it('returns callClaude result directly', async () => {
    const mockReturn = { result: { files: [{ path: 'a.js' }] }, usage: { input_tokens: 10, output_tokens: 20 } };
    callClaude.mockResolvedValueOnce(mockReturn);

    const result = await scaffoldGenerate({ client: mockClient, spec, model });
    expect(result).toBe(mockReturn);
  });
});

// --- tests.js ---

describe('tests.generate', () => {
  it('calls callClaude with QA engineer system prompt', async () => {
    await testsGenerate({ client: mockClient, spec, scaffold, model });

    const [, options] = callClaude.mock.calls[0];
    expect(options.system).toContain('QA engineer');
  });

  it('includes spec and scaffold files in user message', async () => {
    await testsGenerate({ client: mockClient, spec, scaffold, model });

    const [, options] = callClaude.mock.calls[0];
    expect(options.userMessage).toContain('Test Spec');
    expect(options.userMessage).toContain('src/index.js');
    expect(options.userMessage).toContain('const app = express()');
    expect(options.userMessage).toContain('express');
  });
});

// --- docs.js ---

describe('docs.generate', () => {
  it('calls callClaude with technical writer system prompt', async () => {
    await docsGenerate({ client: mockClient, spec, scaffold, model });

    const [, options] = callClaude.mock.calls[0];
    expect(options.system).toContain('technical writer');
  });

  it('includes spec and scaffold files in user message', async () => {
    await docsGenerate({ client: mockClient, spec, scaffold, model });

    const [, options] = callClaude.mock.calls[0];
    expect(options.userMessage).toContain('Test Spec');
    expect(options.userMessage).toContain('src/index.js');
  });
});

// --- review.js ---

describe('review.generate', () => {
  it('calls callClaude with code reviewer system prompt', async () => {
    await reviewGenerate({ client: mockClient, spec, scaffold, tests, model });

    const [, options] = callClaude.mock.calls[0];
    expect(options.system).toContain('senior code reviewer');
  });

  it('includes spec, scaffold, and test files in user message', async () => {
    await reviewGenerate({ client: mockClient, spec, scaffold, tests, model });

    const [, options] = callClaude.mock.calls[0];
    expect(options.userMessage).toContain('Test Spec');
    expect(options.userMessage).toContain('src/index.js');
    expect(options.userMessage).toContain('tests/index.test.js');
  });

  it('handles tests with files property instead of testFiles', async () => {
    const testsAlt = {
      files: [{ path: 'tests/alt.test.js', content: 'test("alt")' }],
    };

    await reviewGenerate({ client: mockClient, spec, scaffold, tests: testsAlt, model });

    const [, options] = callClaude.mock.calls[0];
    expect(options.userMessage).toContain('tests/alt.test.js');
  });
});
