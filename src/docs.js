import { callClaude } from './utils.js';

const SYSTEM_PROMPT = `You are a technical writer. Given a project specification and its source code files, generate comprehensive API documentation.

Include:
- Endpoint descriptions (method, path, params, body, response)
- Authentication requirements
- Error codes and meanings
- Example requests/responses (curl)
- Data model schemas
- Setup and configuration instructions

Output ONLY valid JSON with this exact structure (no markdown fences, no extra text):
{
  "files": [
    {"path": "docs/API.md", "content": "...markdown content..."}
  ]
}

The documentation should be in Markdown format suitable for a README or docs site.`;

export async function generate({ client, spec, scaffold, model }) {
  const scaffoldSummary = scaffold.files
    .map((f) => `--- ${f.path} (${f.purpose || 'source file'}) ---\n${f.content}`)
    .join('\n\n');

  const userMessage = `## Original Specification\n${spec}\n\n## Project Source Code\n${scaffoldSummary}\n\nGenerate comprehensive API documentation for this project.`;

  return callClaude(client, {
    model,
    system: SYSTEM_PROMPT,
    userMessage,
  });
}
