import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Parse a JSON response from Claude, stripping markdown code fences if present.
 */
export function parseJSONResponse(text) {
  let cleaned = text.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err.message}\n\nRaw response:\n${text.slice(0, 500)}`);
  }
}

/**
 * Write an array of { path, content } file objects to a base directory.
 */
export async function writeFiles(files, baseDir) {
  const written = [];
  for (const file of files) {
    const fullPath = join(baseDir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, 'utf-8');
    written.push(file.path);
  }
  return written;
}

/**
 * Call Claude API with retry and exponential backoff.
 */
export async function callClaude(client, { model, system, userMessage, maxTokens = 8192 }) {
  const maxRetries = 3;
  const baseDelay = 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMessage }],
      });

      if (response.stop_reason === 'max_tokens') {
        console.warn('\n⚠ Warning: Response was truncated (hit max_tokens). Output may be incomplete.');
      }

      const text = response.content[0].text;
      const result = parseJSONResponse(text);

      return { result, usage: response.usage };
    } catch (err) {
      if (attempt < maxRetries && (err.status === 429 || err.status >= 500)) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}
