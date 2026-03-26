import { callClaude } from './utils.js';

const SYSTEM_PROMPT = `You are a senior software architect. Given a project specification, generate a complete project scaffold.

Output ONLY valid JSON with this exact structure (no markdown fences, no extra text):
{
  "files": [
    {"path": "src/index.js", "content": "...", "purpose": "Entry point"},
    {"path": "src/routes/items.js", "content": "...", "purpose": "CRUD routes"}
  ],
  "dependencies": {"express": "^4.18.0", "pg": "^8.11.0"},
  "devDependencies": {"jest": "^29.0.0", "supertest": "^6.3.0"}
}

Requirements:
- Production-ready structure (not toy code)
- Include error handling, input validation, proper HTTP status codes
- Follow the language's standard conventions
- Include .gitignore, package.json as appropriate
- Every file must have complete, working code (no placeholders or TODOs)
- Include necessary configuration files (e.g., .env.example, jest.config.js)`;

export async function generate({ client, spec, model }) {
  return callClaude(client, {
    model,
    system: SYSTEM_PROMPT,
    userMessage: spec,
  });
}
