import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type CapturedRun = {
  id: string;
  command: string;
  arguments: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  publicStdoutSha256: string;
  publicStderrSha256: string;
  rawStdoutSha256: string;
  rawStderrSha256: string;
  outputLanguage: string;
  capturedAt?: string;
  omitFinalNewline?: boolean;
};

type NewRun = Omit<CapturedRun, 'id' | 'command'> & { id: string; replayId: string };
const historical: { runs: CapturedRun[] } = JSON.parse(
  readFileSync(resolve('..', 'docs', 'evidence', 'cli-replay.json'), 'utf8'));
const defaults: { runs: NewRun[] } = JSON.parse(
  readFileSync(resolve('..', 'docs', 'evidence', 'default-markdown-2026-11-06.json'), 'utf8'));
const compose: { runs: NewRun[] } = JSON.parse(
  readFileSync(resolve('..', 'docs', 'evidence', 'chapter-demos.json'), 'utf8'));

function original(id: string): CapturedRun {
  const run = historical.runs.find((item) => item.id === id);
  if (!run) throw new Error(`Missing historical replay: ${id}`);
  return { ...run, omitFinalNewline: true };
}

function current(runs: NewRun[], id: string, command: string): CapturedRun {
  const run = runs.find((item) => item.replayId === id);
  if (!run) throw new Error(`Missing current replay: ${id}`);
  return { ...run, id, command };
}

export const displayedRuns: CapturedRun[] = [
  original('docs-search'),
  current(defaults.runs, 'docs-section', 'aspire docs get browser-logs --section "Configure browser logs"'),
  original('api-search'),
  current(defaults.runs, 'api-member', 'aspire docs api get "csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs"'),
  original('runtime-wait'),
  original('runtime-describe'),
  original('runtime-traces'),
  ...(['publish', 'deploy'] as const).map((action) => current(compose.runs, `compose-${action}`,
    `aspire ${action} --apphost demo\\host\\apphost.cs \`\n  --environment Talk --output-path .artifacts\\chapter-demos\\compose \`\n  --non-interactive`)),
];

export const surfaces = [
  ['live-cli', 'docs-search'], ['docs-section', 'docs-section'], ['api-search', 'api-search'],
  ['api-member', 'api-member'], ['runtime-wait', 'runtime-wait'], ['runtime-state', 'runtime-describe'],
  ['runtime-traces', 'runtime-traces'], ['deployment-publish', 'compose-publish'],
  ['deployment-deploy', 'compose-deploy'],
] as const;

export function displayedRun(id: string): CapturedRun {
  const run = displayedRuns.find((item) => item.id === id);
  if (!run) throw new Error(`Missing displayed replay: ${id}`);
  return run;
}

export function completeStdout(run: CapturedRun): string {
  const stdout = readFileSync(resolve('public', 'replays', run.stdout.split('/').at(-1)!), 'utf8')
    .replace(/\r\n/g, '\n');
  return run.omitFinalNewline ? stdout.replace(/\n$/, '') : stdout;
}
