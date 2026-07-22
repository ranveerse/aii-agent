import { readFile } from 'fs/promises';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, isAuthed } from '@/lib/adminAuth';
import { rawEnv } from '@/lib/rawEnv';
import { sandboxRequestSchema, type SandboxFile } from '@/lib/validation/sandbox';

// Fixed, server-side-only mapping from the allowed file keys to their real paths —
// the request body only ever carries the key (validated against SANDBOX_FILES),
// never a path, so there's no way for a client to make this read an arbitrary file.
const FILE_PATHS: Record<SandboxFile, string> = {
  'ANALYSIS_ENGINE.md': path.join(process.cwd(), 'docs', 'ANALYSIS_ENGINE.md'),
  'MR_MARKET_INDEX_SPEC.md': path.join(process.cwd(), 'docs', 'MR_MARKET_INDEX_SPEC.md'),
};

export async function POST(request: NextRequest) {
  if (!isAuthed(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = rawEnv().ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured on the server' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = sandboxRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid sandbox payload', issues: parsed.error.issues }, { status: 400 });
  }

  const fileContents = await Promise.all(
    parsed.data.files.map(async (name) => ({
      name,
      content: await readFile(FILE_PATHS[name], 'utf-8'),
    })),
  );
  const system = fileContents.map(({ name, content }) => `<file name="${name}">\n${content}\n</file>`).join('\n\n');

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
      thinking: { type: 'adaptive', display: 'summarized' },
      output_config: { effort: 'high' },
      system,
      messages: [{ role: 'user', content: parsed.data.message }],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    const thinking = response.content
      .filter((block) => block.type === 'thinking')
      .map((block) => block.thinking)
      .join('\n');

    return NextResponse.json({
      text,
      thinking: thinking || null,
      stop_reason: response.stop_reason,
      usage: response.usage,
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Anthropic API error (${err.status}): ${err.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error calling Claude' }, { status: 502 });
  }
}
