import { callClaude } from './utils.js';

const SYSTEM_PROMPT = `You are a senior code reviewer. Given a project's source code and test suite, generate a thorough code review checklist.

Check for:
- Security vulnerabilities (injection, auth bypass, data exposure)
- Performance issues (N+1 queries, missing indexes, memory leaks)
- Error handling gaps
- Test coverage gaps
- Naming/style consistency
- Documentation completeness
- Dependency concerns (outdated, vulnerable, unnecessary)

Output ONLY valid JSON with this exact structure (no markdown fences, no extra text):
{
  "files": [
    {"path": "review/REVIEW.md", "content": "...markdown checklist..."}
  ]
}

The checklist should use markdown with severity ratings:
- 🔴 CRITICAL: Must fix before deploy
- 🟡 WARNING: Should fix soon
- 🔵 INFO: Consider improving`;

export async function generate({ client, spec, scaffold, tests, model }) {
  const scaffoldSummary = scaffold.files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');

  const testSummary = (tests.testFiles || tests.files || [])
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');

  const userMessage = `## Original Specification\n${spec}\n\n## Source Code\n${scaffoldSummary}\n\n## Test Suite\n${testSummary}\n\nGenerate a comprehensive code review checklist.`;

  return callClaude(client, {
    model,
    system: SYSTEM_PROMPT,
    userMessage,
  });
}
