import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseJSONResponse, writeFiles, callClaude } from '../src/utils.js';
import { mkdir, writeFile } from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// --- parseJSONResponse ---

describe('parseJSONResponse', () => {
  it('parses a plain JSON object', () => {
    expect(parseJSONResponse('{"a": 1}')).toEqual({ a: 1 });
  });

  it('parses a JSON array', () => {
    expect(parseJSONResponse('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('strips ```json fences', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(parseJSONResponse(input)).toEqual({ key: 'value' });
  });

  it('strips ``` fences without language tag', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(parseJSONResponse(input)).toEqual({ key: 'value' });
  });

  it('handles whitespace around fences', () => {
    const input = '  ```json\n  {"key": "value"}  \n  ```  ';
    expect(parseJSONResponse(input)).toEqual({ key: 'value' });
  });

  it('handles leading/trailing whitespace on plain JSON', () => {
    expect(parseJSONResponse('  \n {"a": 1} \n  ')).toEqual({ a: 1 });
  });

  it('throws on invalid JSON with descriptive error', () => {
    expect(() => parseJSONResponse('not json')).toThrow('Failed to parse JSON response');
  });

  it('throws on empty string', () => {
    expect(() => parseJSONResponse('')).toThrow('Failed to parse JSON response');
  });

  it('includes raw response excerpt in error', () => {
    try {
      parseJSONResponse('bad data here');
    } catch (err) {
      expect(err.message).toContain('Raw response:');
      expect(err.message).toContain('bad data here');
    }
  });
});

// --- writeFiles ---

describe('writeFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes files and creates directories', async () => {
    const files = [
      { path: 'src/index.js', content: 'console.log("hello")' },
      { path: 'src/routes/api.js', content: 'module.exports = {}' },
    ];

    const result = await writeFiles(files, '/output');

    expect(mkdir).toHaveBeenCalledTimes(2);
    expect(mkdir).toHaveBeenCalledWith('/output/src', { recursive: true });
    expect(mkdir).toHaveBeenCalledWith('/output/src/routes', { recursive: true });

    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(writeFile).toHaveBeenCalledWith('/output/src/index.js', 'console.log("hello")', 'utf-8');
    expect(writeFile).toHaveBeenCalledWith('/output/src/routes/api.js', 'module.exports = {}', 'utf-8');

    expect(result).toEqual(['src/index.js', 'src/routes/api.js']);
  });

  it('returns empty array for empty files input', async () => {
    const result = await writeFiles([], '/output');
    expect(result).toEqual([]);
    expect(mkdir).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
  });
});

// --- callClaude ---

describe('callClaude', () => {
  let mockClient;

  function makeResponse(text, stopReason = 'end_turn', usage = { input_tokens: 100, output_tokens: 50 }) {
    return {
      content: [{ text }],
      stop_reason: stopReason,
      usage,
    };
  }

  beforeEach(() => {
    mockClient = { messages: { create: vi.fn() } };
    vi.restoreAllMocks();
  });

  it('returns parsed result and usage on success', async () => {
    mockClient.messages.create.mockResolvedValue(makeResponse('{"files": []}'));

    const result = await callClaude(mockClient, {
      model: 'claude-sonnet-4-20250514',
      system: 'You are helpful',
      userMessage: 'Generate code',
    });

    expect(result.result).toEqual({ files: [] });
    expect(result.usage).toEqual({ input_tokens: 100, output_tokens: 50 });
  });

  it('passes correct parameters to client.messages.create', async () => {
    mockClient.messages.create.mockResolvedValue(makeResponse('{}'));

    await callClaude(mockClient, {
      model: 'test-model',
      system: 'sys prompt',
      userMessage: 'user msg',
      maxTokens: 4096,
    });

    expect(mockClient.messages.create).toHaveBeenCalledWith({
      model: 'test-model',
      max_tokens: 4096,
      system: 'sys prompt',
      messages: [{ role: 'user', content: 'user msg' }],
    });
  });

  it('defaults maxTokens to 8192', async () => {
    mockClient.messages.create.mockResolvedValue(makeResponse('{}'));

    await callClaude(mockClient, {
      model: 'test-model',
      system: 'sys',
      userMessage: 'msg',
    });

    expect(mockClient.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 8192 })
    );
  });

  it('warns on max_tokens stop reason', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockClient.messages.create.mockResolvedValue(makeResponse('{}', 'max_tokens'));

    await callClaude(mockClient, {
      model: 'test-model',
      system: 'sys',
      userMessage: 'msg',
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('truncated'));
  });

  it('retries on 429 errors', async () => {
    vi.useFakeTimers();
    const error429 = new Error('Rate limited');
    error429.status = 429;

    mockClient.messages.create
      .mockRejectedValueOnce(error429)
      .mockResolvedValueOnce(makeResponse('{"ok": true}'));

    const promise = callClaude(mockClient, {
      model: 'test-model',
      system: 'sys',
      userMessage: 'msg',
    });

    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.result).toEqual({ ok: true });
    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('retries on 500+ errors', async () => {
    vi.useFakeTimers();
    const error500 = new Error('Server error');
    error500.status = 500;

    mockClient.messages.create
      .mockRejectedValueOnce(error500)
      .mockResolvedValueOnce(makeResponse('{"ok": true}'));

    const promise = callClaude(mockClient, {
      model: 'test-model',
      system: 'sys',
      userMessage: 'msg',
    });

    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(result.result).toEqual({ ok: true });
    vi.useRealTimers();
  });

  it('throws immediately on 400 errors (no retry)', async () => {
    const error400 = new Error('Bad request');
    error400.status = 400;

    mockClient.messages.create.mockRejectedValue(error400);

    await expect(
      callClaude(mockClient, { model: 'm', system: 's', userMessage: 'u' })
    ).rejects.toThrow('Bad request');

    expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retries', { timeout: 15000 }, async () => {
    const error429 = new Error('Rate limited');
    error429.status = 429;

    mockClient.messages.create.mockRejectedValue(error429);

    await expect(
      callClaude(mockClient, { model: 'm', system: 's', userMessage: 'u' })
    ).rejects.toThrow('Rate limited');

    // 1 initial + 3 retries = 4 attempts
    expect(mockClient.messages.create).toHaveBeenCalledTimes(4);
  });

  it('throws on invalid JSON in response', async () => {
    mockClient.messages.create.mockResolvedValue(makeResponse('not valid json'));

    await expect(
      callClaude(mockClient, { model: 'm', system: 's', userMessage: 'u' })
    ).rejects.toThrow('Failed to parse JSON response');
  });
});
