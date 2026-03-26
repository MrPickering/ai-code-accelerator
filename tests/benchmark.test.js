import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wrapStep, printReport } from '../src/benchmark.js';
import { writeFile } from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// --- wrapStep ---

describe('wrapStep', () => {
  it('returns result from wrapped function', async () => {
    const fn = () => Promise.resolve({
      result: { files: ['a.js'] },
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const { result } = await wrapStep('test-step', fn);
    expect(result).toEqual({ files: ['a.js'] });
  });

  it('sets step name in metrics', async () => {
    const fn = () => Promise.resolve({
      result: {},
      usage: { input_tokens: 0, output_tokens: 0 },
    });

    const { metrics } = await wrapStep('scaffold', fn);
    expect(metrics.step).toBe('scaffold');
  });

  it('captures token counts from usage', async () => {
    const fn = () => Promise.resolve({
      result: {},
      usage: { input_tokens: 1234, output_tokens: 5678 },
    });

    const { metrics } = await wrapStep('test', fn);
    expect(metrics.inputTokens).toBe(1234);
    expect(metrics.outputTokens).toBe(5678);
  });

  it('computes cost correctly (input * $3/MTok + output * $15/MTok)', async () => {
    const fn = () => Promise.resolve({
      result: {},
      usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 },
    });

    const { metrics } = await wrapStep('test', fn);
    // 1M * $3/MTok + 1M * $15/MTok = $18
    expect(metrics.cost).toBeCloseTo(18, 4);
  });

  it('computes cost for small token counts', async () => {
    const fn = () => Promise.resolve({
      result: {},
      usage: { input_tokens: 1000, output_tokens: 500 },
    });

    const { metrics } = await wrapStep('test', fn);
    // 1000 * 3/1M + 500 * 15/1M = 0.003 + 0.0075 = 0.0105
    expect(metrics.cost).toBeCloseTo(0.0105, 6);
  });

  it('measures duration in milliseconds', async () => {
    const fn = () => Promise.resolve({
      result: {},
      usage: { input_tokens: 0, output_tokens: 0 },
    });

    const { metrics } = await wrapStep('test', fn);
    expect(typeof metrics.durationMs).toBe('number');
    expect(metrics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('propagates errors from wrapped function', async () => {
    const fn = () => Promise.reject(new Error('API failure'));

    await expect(wrapStep('test', fn)).rejects.toThrow('API failure');
  });
});

// --- printReport ---

describe('printReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  const sampleMetrics = [
    { step: 'scaffold', durationMs: 4200, inputTokens: 1234, outputTokens: 3456, cost: 0.0556 },
    { step: 'tests', durationMs: 3800, inputTokens: 4567, outputTokens: 2890, cost: 0.0571 },
  ];

  it('writes benchmark.json with correct structure', async () => {
    await printReport(sampleMetrics, '/output', 'claude-sonnet-4-20250514');

    expect(writeFile).toHaveBeenCalledTimes(1);
    const [filePath, content] = writeFile.mock.calls[0];
    expect(filePath).toBe('/output/benchmark.json');

    const parsed = JSON.parse(content);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed.model).toBe('claude-sonnet-4-20250514');
    expect(parsed.steps).toEqual(sampleMetrics);
    expect(parsed.totals).toBeDefined();
  });

  it('computes correct totals', async () => {
    await printReport(sampleMetrics, '/output', 'test-model');

    const content = writeFile.mock.calls[0][1];
    const parsed = JSON.parse(content);

    expect(parsed.totals.durationMs).toBe(8000);
    expect(parsed.totals.inputTokens).toBe(5801);
    expect(parsed.totals.outputTokens).toBe(6346);
    expect(parsed.totals.cost).toBeCloseTo(0.1127, 4);
  });

  it('handles empty metrics array', async () => {
    await printReport([], '/output', 'test-model');

    const content = writeFile.mock.calls[0][1];
    const parsed = JSON.parse(content);

    expect(parsed.totals.durationMs).toBe(0);
    expect(parsed.totals.inputTokens).toBe(0);
    expect(parsed.totals.outputTokens).toBe(0);
    expect(parsed.totals.cost).toBe(0);
  });

  it('logs to console', async () => {
    await printReport(sampleMetrics, '/output', 'test-model');
    expect(console.log).toHaveBeenCalled();
  });
});
