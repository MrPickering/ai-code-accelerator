#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Anthropic from '@anthropic-ai/sdk';

import { generate as scaffoldGenerate } from './scaffold.js';
import { generate as testsGenerate } from './tests.js';
import { generate as docsGenerate } from './docs.js';
import { generate as reviewGenerate } from './review.js';
import { writeFiles } from './utils.js';
import { wrapStep, printReport } from './benchmark.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

const program = new Command();

program
  .name('ai-code-accelerator')
  .description('Generate project scaffolds, tests, docs, and code reviews from a spec using Claude')
  .option('--spec <file>', 'Path to spec file (markdown)')
  .option('--inline <text>', 'Inline spec description')
  .option('--output <dir>', 'Output directory', './output')
  .option('--model <model>', 'Claude model to use', DEFAULT_MODEL)
  .option('--benchmark', 'Show token usage and timing breakdown')
  .action(run);

program.parse();

async function run(options) {
  // Validate input
  if (!options.spec && !options.inline) {
    console.error(chalk.red('Error: Either --spec <file> or --inline <text> is required.'));
    process.exit(1);
  }

  // Read spec
  let spec;
  if (options.spec) {
    try {
      spec = await readFile(resolve(options.spec), 'utf-8');
    } catch (err) {
      console.error(chalk.red(`Error reading spec file: ${err.message}`));
      process.exit(1);
    }
  } else {
    spec = options.inline;
  }

  // Validate API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(chalk.red('Error: ANTHROPIC_API_KEY environment variable is not set.'));
    process.exit(1);
  }

  const client = new Anthropic();
  const outputDir = resolve(options.output);
  const model = options.model;

  await mkdir(outputDir, { recursive: true });

  console.log(chalk.bold('\n🚀 AI Code Accelerator'));
  console.log(chalk.dim(`   Model: ${model}`));
  console.log(chalk.dim(`   Output: ${outputDir}\n`));

  const spinner = ora();
  const allMetrics = [];

  try {
    // Step 1: Scaffold
    spinner.start('Generating project scaffold...');
    const { result: scaffold, metrics: scaffoldMetrics } = await wrapStep('scaffold', () =>
      scaffoldGenerate({ client, spec, model })
    );
    allMetrics.push(scaffoldMetrics);
    spinner.succeed(
      `Scaffold generated: ${scaffold.files.length} files (${scaffoldMetrics.durationMs}ms)`
    );

    // Write scaffold files
    await writeFiles(scaffold.files, outputDir);

    // Write generated package.json with dependencies
    if (scaffold.dependencies || scaffold.devDependencies) {
      const pkg = {
        name: 'generated-project',
        version: '1.0.0',
        dependencies: scaffold.dependencies || {},
        devDependencies: scaffold.devDependencies || {},
      };
      // Check if scaffold already includes a package.json
      const hasPackageJson = scaffold.files.some((f) => f.path === 'package.json');
      if (!hasPackageJson) {
        await writeFiles(
          [{ path: 'package.json', content: JSON.stringify(pkg, null, 2) }],
          outputDir
        );
      }
    }

    // Step 2: Tests
    spinner.start('Generating test suite...');
    const { result: tests, metrics: testsMetrics } = await wrapStep('tests', () =>
      testsGenerate({ client, spec, scaffold, model })
    );
    allMetrics.push(testsMetrics);
    const testFiles = tests.testFiles || tests.files || [];
    spinner.succeed(`Tests generated: ${testFiles.length} files (${testsMetrics.durationMs}ms)`);

    // Write test files
    await writeFiles(testFiles, outputDir);

    // Step 3: Documentation
    spinner.start('Generating API documentation...');
    const { result: docs, metrics: docsMetrics } = await wrapStep('docs', () =>
      docsGenerate({ client, spec, scaffold, model })
    );
    allMetrics.push(docsMetrics);
    spinner.succeed(`Docs generated: ${docs.files.length} files (${docsMetrics.durationMs}ms)`);

    // Write doc files
    await writeFiles(docs.files, outputDir);

    // Step 4: Code Review
    spinner.start('Generating code review...');
    const { result: review, metrics: reviewMetrics } = await wrapStep('review', () =>
      reviewGenerate({ client, spec, scaffold, tests, model })
    );
    allMetrics.push(reviewMetrics);
    spinner.succeed(
      `Review generated: ${review.files.length} files (${reviewMetrics.durationMs}ms)`
    );

    // Write review files
    await writeFiles(review.files, outputDir);

    // Summary
    const totalFiles =
      scaffold.files.length + testFiles.length + docs.files.length + review.files.length;
    console.log(chalk.green(`\n✅ Pipeline complete! ${totalFiles} files written to ${outputDir}`));

    // Benchmark report
    if (options.benchmark) {
      await printReport(allMetrics, outputDir, model);
    }
  } catch (err) {
    spinner.fail('Pipeline failed');
    console.error(chalk.red(`\nError: ${err.message}`));
    if (err.status) {
      console.error(chalk.dim(`API Status: ${err.status}`));
    }
    process.exit(1);
  }
}
