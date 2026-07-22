import * as z from 'zod';

// The only .md files the admin Sandbox is allowed to load as system-prompt context.
// Keyed here (not by client-supplied path) so the API route never reads an
// arbitrary filesystem path chosen by the request body. CLAUDE.md isn't included —
// it's a map that tells a coding agent to go read these two files, not a system
// prompt itself; sent to the model verbatim it wouldn't drive any actual behavior.
export const SANDBOX_FILES = ['ANALYSIS_ENGINE.md', 'MR_MARKET_INDEX_SPEC.md'] as const;
export type SandboxFile = (typeof SANDBOX_FILES)[number];

export const sandboxRequestSchema = z.object({
  files: z.array(z.enum(SANDBOX_FILES)).min(1, 'Select at least one .md file'),
  message: z.string().trim().min(1, 'Enter a prompt or data dump to send'),
});

export type SandboxRequestInput = z.infer<typeof sandboxRequestSchema>;
