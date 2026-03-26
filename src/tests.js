import { callClaude } from './utils.js';

const SYSTEM_PROMPT = `You are a QA engineer. Given a project specification and its scaffold files, generate a comprehensive unit test suite.

For each source file:
1. Test happy path
2. Test edge cases (empty input, null, boundary values)
3. Test error handling paths
4. Include setup/teardown fixtures

Output ONLY valid JSON with this exact structure (no markdown fences, no extra text):
{
  "testFiles": [
    {"path": "tests/routes/items.test.js", "content": "...", "coverage": ["CRUD operations", "validation", "error handling"]}
  ],
  "testFramework": "jest",
  "testCommand": "npm test",
  "estimatedCoverage": "85%"
}

Requirements:
- Tests must be runnable without modification
- Use appropriate mocking for external dependencies (database, APIs)
- Include descriptive test names
- Group related tests with describe blocks`;

export async function generate({ client, spec, scaffold, model }) {
  const scaffoldSummary = scaffold.files
    .map((f) => `--- ${f.path} (${f.purpose || 'source file'}) ---\n${f.content}`)
    .join('\n\n');

  const userMessage = `## Original Specification\n${spec}\n\n## Project Scaffold\n${scaffoldSummary}\n\n## Dependencies\n${JSON.stringify(scaffold.dependencies, null, 2)}\n\nGenerate a comprehensive test suite for this project.`;

  return callClaude(client, {
    model,
    system: SYSTEM_PROMPT,
    userMessage,
  });
}
