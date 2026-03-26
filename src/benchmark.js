import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import chalk from 'chalk';

// Sonnet 4 pricing: $3/MTok input, $15/MTok output
const INPUT_COST_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 15 / 1_000_000;

/**
 * Wrap an async function to measure wall-clock time and capture token usage.
 * The wrapped function must return { result, usage: { input_tokens, output_tokens } }.
 */
export async function wrapStep(name, fn) {
  const start = performance.now();
  const { result, usage } = await fn();
  const durationMs = Math.round(performance.now() - start);

  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cost = inputTokens * INPUT_COST_PER_TOKEN + outputTokens * OUTPUT_COST_PER_TOKEN;

  return {
    result,
    metrics: { step: name, durationMs, inputTokens, outputTokens, cost },
  };
}

/**
 * Print a formatted benchmark report to the terminal and write benchmark.json.
 */
export async function printReport(allMetrics, outputDir, model) {
  const totals = allMetrics.reduce(
    (acc, m) => ({
      durationMs: acc.durationMs + m.durationMs,
      inputTokens: acc.inputTokens + m.inputTokens,
      outputTokens: acc.outputTokens + m.outputTokens,
      cost: acc.cost + m.cost,
    }),
    { durationMs: 0, inputTokens: 0, outputTokens: 0, cost: 0 }
  );

  // Terminal table
  console.log('\n' + chalk.bold('Benchmark Report'));
  console.log('─'.repeat(72));
  console.log(
    padRight('Step', 14) +
      padRight('Duration', 12) +
      padRight('Input Tok', 14) +
      padRight('Output Tok', 14) +
      padRight('Cost', 10)
  );
  console.log('─'.repeat(72));

  for (const m of allMetrics) {
    console.log(
      padRight(m.step, 14) +
        padRight(formatDuration(m.durationMs), 12) +
        padRight(m.inputTokens.toLocaleString(), 14) +
        padRight(m.outputTokens.toLocaleString(), 14) +
        padRight('$' + m.cost.toFixed(4), 10)
    );
  }

  console.log('─'.repeat(72));
  console.log(
    chalk.bold(
      padRight('TOTAL', 14) +
        padRight(formatDuration(totals.durationMs), 12) +
        padRight(totals.inputTokens.toLocaleString(), 14) +
        padRight(totals.outputTokens.toLocaleString(), 14) +
        padRight('$' + totals.cost.toFixed(4), 10)
    )
  );
  console.log('─'.repeat(72));

  // Write benchmark.json
  const report = {
    timestamp: new Date().toISOString(),
    model,
    steps: allMetrics,
    totals,
  };

  await writeFile(join(outputDir, 'benchmark.json'), JSON.stringify(report, null, 2), 'utf-8');
}

function padRight(str, len) {
  return String(str).padEnd(len);
}

function formatDuration(ms) {
  return ms >= 1000 ? (ms / 1000).toFixed(1) + 's' : ms + 'ms';
}
