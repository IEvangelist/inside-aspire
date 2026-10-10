# The real, read-only docs loop

This rehearsal reads an already completed cross-repository docs change. It does
not dispatch a workflow, create a draft, merge a PR, change an AppHost, initialize
an agent, or manufacture a failure and repair.

The loop is **reviewed documentation getting back to the next agent through
retrieval**, not a model teaching or retraining itself:

```text
Product PR merged
  -> pr-docs-check reasons over the change and drafts docs
  -> constrained safe outputs open a docs PR
  -> an engineer reviews; humans merge
  -> the docs site publishes Markdown and its llms-full.txt corpus
  -> the C# CLI fetches, parses, caches and lexically searches that corpus
  -> an agent can retrieve current prose and API references
```

## Rehearse from the repository root

Requirements: PowerShell 7, the repository-local **public Aspire CLI 13.6.1**,
Git, and authenticated GitHub CLI with **gh-aw 0.85.4**. The public installer
helper is `scripts\Install-Aspire.ps1`; the default Windows executable is
`.tools\aspire\aspire.exe`. This rehearsal never resolves `aspire` through PATH
and refuses an executable outside the repository. There is no global CLI
fallback and no global profile or configuration edit.

```powershell
pwsh -NoProfile -File .\scripts\Show-DocsLoop.ps1
pwsh -NoProfile -File .\scripts\Test-DocsLoop.ps1
```

The only onstage options are an explicit repository-local `-AspirePath`,
`-OutputDirectory`, and `-SkipGitHub`:

```powershell
pwsh -NoProfile -File .\scripts\Show-DocsLoop.ps1 `
  -AspirePath .\.tools\aspire\aspire.exe `
  -OutputDirectory .artifacts\rehearsal\presenter-docs

# Useful when GitHub authentication or access is unavailable.
pwsh -NoProfile -File .\scripts\Show-DocsLoop.ps1 -SkipGitHub
```

`-SkipGitHub` explicitly skips the historical PR/run/outcome checks. It does
**not** claim to prove that whole chain. The CLI reads and the two fresh public
HTTP reads remain required; it is not an offline transcript replay.

Each invocation creates a unique run directory under gitignored
`.artifacts\rehearsal`. Any other output location is rejected, and
`git check-ignore` must confirm the destination before files are written.
Commands have bounded waits. stdout, stderr, command arguments, retrieved
Markdown/corpus, and gh-aw downloads stay there. A `proof.json` appears only
after every required check succeeds; an older run cannot masquerade as a new
successful rehearsal. Do not commit the raw captures or downloaded agent logs.

For the deck, import [the short command snippet](code/DocsLoop.ps1) and the
source excerpts below, not a pasted terminal transcript.

## The existing, verified example

1. [Product PR microsoft/aspire#19478](https://github.com/microsoft/aspire/pull/19478)
   merged. Its change stops AppHost preparation/build time consuming the CLI
   startup timeout.
2. [pr-docs-check run 33887017276](https://github.com/microsoft/aspire/actions/runs/33887017276)
   completed with `success`.
3. [Docs PR microsoft/aspire.dev#1619](https://github.com/microsoft/aspire.dev/pull/1619)
   links both the product PR and that workflow run. It merged as
   `7d461ec15f2eb79a601d4fc8c63f5a61a6e2cc76`.
4. [Published aspire start Markdown](https://aspire.dev/reference/cli/commands/aspire-start.md)
   and the current [llms-full.txt](https://aspire.dev/llms-full.txt) contain the
   exact preparation exclusion also retrieved by the CLI.

The script validates those PR states and links, the exact run ID/conclusion,
the exact docs merge, the downloaded usage artifact, and the primary safe
output's actual GitHub object. It is historical provenance plus verification
of current published content. It does not claim this checkout caused those
remote merges or deployments, or that today's page is byte-identical to the
original draft.

The current prose is also source-backed at
[aspire.dev commit 1a61517655b4fd7811ef63fb5913f6fb623d9d6a, line 74](https://github.com/microsoft/aspire.dev/blob/1a61517655b4fd7811ef63fb5913f6fb623d9d6a/src/frontend/src/content/docs/reference/cli/commands/aspire-start.mdx#L74).
The asserted sentence is:

> `ASPIRE_CLI_START_TIMEOUT` excludes AppHost preparation, including restore and build, guest dependency installation and pre-execution checks, and extension-owned builds.

Only whitespace is normalized for this check. Missing text, reversed semantics,
or removal of restore/build is a failure, not a success-with-warning fallback.
Fresh HTTP checks prevent a cached CLI answer alone being called live proof.

### gh-aw: history and outcomes, never dispatch

These are the actual read-only command forms used for the canonical repository
and run:

```powershell
gh aw status pr-docs-check --repo microsoft/aspire --json

'33887017276' | gh aw logs --repo microsoft/aspire --stdin --count 1 `
  --artifacts usage --json --timeout 2 `
  --output .artifacts\rehearsal\manual-gh-aw

gh aw outcomes 33887017276 --repo microsoft/aspire --json `
  --output .artifacts\rehearsal\manual-outcomes `
  --outcomes-dir .artifacts\rehearsal\manual-outcomes\outcomes
```

Caveats verified with gh-aw 0.85.4:

- `gh aw version` emits its version line on stderr even on exit zero. That
  one metadata command explicitly validates stderr; all JSON commands require
  stdout. An error message or JSON on stderr cannot replace empty JSON stdout.
- `status` returns an array of workflow-definition records. Today's `active`
  status is not evidence that a particular historical run succeeded.
- `logs --json` returns an object with `summary` and `runs`. With `--stdin`, the
  exact supplied run is retrieved instead of a moving "latest" run.
- `gh aw logs pr-docs-check --repo microsoft/aspire` could not resolve the
  workflow name in this rehearsal. The recorded GitHub workflow path is
  `.github/workflows/pr-docs-check.lock.yml`; exact-run `--stdin` retrieval
  avoids the Markdown-basename lookup mismatch.
- `--artifacts usage` requests compact usage evidence, not a full agent
  transcript. The script requires a nonempty, valid downloaded
  `agent_usage.json`. Missing or expired artifacts fail explicitly.
- Both output paths on `outcomes` are explicit. Do not let download/export
  defaults put raw files under `.github\aw`.
- `outcomes` returns `{ run_id, items, summary }`. The script filters the
  **primary** `create_pull_request` item by its actual
  `object_url = https://github.com/microsoft/aspire.dev/pull/1619`.
  The executed example reports `outcome_status = accepted`,
  `evidence_strength = strong`, `signal = merged`, and `human_reviews = 3`.
- The separate `notify_source_pr` item is `pending`, with
  `detail = no object reference to check`. Attribution is `unmapped` for the
  PR outcome. Neither is proof that the successful workflow failed, and the
  script does not assert every safe output was accepted.

The primary outcome's observed `time_to_outcome_hours` is about **461.14 hours**
for this single example. Do not mix it with a historical cohort median.

The product repository owns
[pr-docs-check.md](https://github.com/microsoft/aspire/blob/main/.github/workflows/pr-docs-check.md)
and its compiled
[pr-docs-check.lock.yml](https://github.com/microsoft/aspire/blob/main/.github/workflows/pr-docs-check.lock.yml).
The workflow uses the docs repository's **doc-writer** guidance to author MDX.
That is distinct from CLI-generated, project-local **application skills** in
this repository. Application skills guide Aspire app work; they neither write
the website corpus nor replace the engineer's review/merge gate.

## The live CLI JSON contract

All six documentation commands request `--format Json --non-interactive
--nologo`. Every external command must exit zero and return nonempty output;
JSON commands must also return valid, nonempty objects/arrays. Exit zero with
no results, `[]`, `{}`, `null`, scalar JSON, empty content, or mismatched
identifiers is not success.

| Command | Actual top-level shape | Relevant returned fields |
| --- | --- | --- |
| `docs list` | Array | `title`, `slug`, optional `summary` |
| `docs search "startup timeout"` | Array | `title`, `slug`, `content`, `section`, numeric `score` |
| `docs get <derived-slug>` | Object | `title`, `slug`, `summary`, **`content`**, `sections` |
| `docs get <derived-slug> --section <derived-heading>` | Object | The same fields; `content` is selected, `sections` still lists **all** page sections |
| `docs api search AddViteApp --language csharp` | Array | `id`, `name`, `language`, `kind`, `parentId`, `memberGroup`, `summary`, numeric `score` |
| `docs api get <derived-id>` | Object | `id`, `name`, `language`, `kind`, `url`, `parentId`, `memberGroup`, **`content`** |

The verified public baseline listed **539 pages** and returned **five search
results**, including `aspire-run-command` and `aspire-start-command`. The script does **not** take the first
ranked hit: it selects the unique returned title for `aspire start`, verifies
that its returned slug is in `docs list`, then retrieves that slug.

The heading is derived from the retrieved page's `sections` array, not a
hardcoded section label. The baseline selected
`Configuring the startup timeout`; the section response still listed nine
section names. The heading and preparation sentence must actually appear in
the selected `content`.

API lookup is a separate catalog. The observed baseline derived the member ID
`csharp/aspire.hosting.javascript/javascripthostingextensions/methods#addviteapp`
with `kind = member`. That identifier is an observation, not a constant in the
script. Search is language-filtered; **13.6.1 API get has no `--language`
option**. Get uses the returned ID and validates `language = csharp`, the
matching ID/kind/name, a public C# reference URL, and nonempty content
containing an actual `AddViteApp` C# block returning `ViteAppResource`.

The member response can contain the whole methods page, not just one method.
The script prints a small matching C# block from that real content. It does
not fabricate an AppHost sample or recreate the docs parser.

## The C# implementation behind the terminal

These are **short, verbatim, source-backed excerpts**, not a replacement parser
or a compilable local implementation. All are pinned to the public
`microsoft/aspire` implementation snapshot
`213aa53159663c6f3e4a29bf7df907179ae6e1c4`. This source pin explains the
architecture; it is separate from the public CLI binary version and the docs
source/merge pins.

| Local excerpt | Pinned public source lines | What to point out |
| --- | --- | --- |
| [DocsFetcher.cs](code/DocsFetcher.cs) | [34-38](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsFetcher.cs#L34-L38) | Delegates fetching to the shared cached HTTP fetcher |
| [DocsIndexService.cs](code/DocsIndexService.cs) | [102-106](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs#L102-L106), [193-210](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs#L193-L210) | Local field weights, corpus/schema fingerprint, cached index or parse/rebuild |
| [LlmsTxtParser.cs](code/LlmsTxtParser.cs) | [140-144](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/LlmsTxtParser.cs#L140-L144), [464-466](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/LlmsTxtParser.cs#L464-L466) | Fence regions guard H1 document boundaries and H2+ sections |
| [ApiDocsFetcher.cs](code/ApiDocsFetcher.cs) | [41-42](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsFetcher.cs#L41-L42), [50-55](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsFetcher.cs#L50-L55) | Separate sitemap and API Markdown fetches, sharing cached HTTP behavior |
| [ApiDocsIndexService.cs](code/ApiDocsIndexService.cs) | [538-555](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsIndexService.cs#L538-L555) | Fetches the member's reference page, rewrites links, and returns identity plus content |

Supporting implementation links:

- The real default URL is `https://aspire.dev/llms-full.txt`:
  [DocsSourceConfiguration.cs, 24-39](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsSourceConfiguration.cs#L24-L39).
  Do not mistake an old "small" XML comment for the configured source.
- ETags, conditional GET/304 handling, and persisted content are in
  [CachedHttpDocumentFetcher.cs, 37-86](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/CachedHttpDocumentFetcher.cs#L37-L86).
  The upstream implementation can use cached content on a fetch failure;
  this rehearsal separately requires fresh public HTTP proof.
- Section spans end at the next heading of the same or higher level:
  [LlmsTxtParser.cs, 457-492](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/LlmsTxtParser.cs#L457-L492).
  Code-fenced `#` comments are not new documents.
- The API catalog has its own sitemap fingerprint/cache and lexical weights:
  [ApiDocsIndexService.cs, 308-318](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsIndexService.cs#L308-L318)
  and [368-404](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsIndexService.cs#L368-L404).

The code is MIT-licensed by the .NET Foundation and contributors. The original
notices remain on the excerpts and [the full upstream MIT license](code/ASPIRE-LICENSE.txt)
is included. No full article, corpus, generated reference page, or raw workflow
transcript is copied into tracked files.

**Do not call this vector search, embeddings, RAG infrastructure, or training.**
It is local weighted lexical ranking over fetched and parsed documentation.
MCP is a tool-exposure protocol; a CLI is another consumer; skills are
instructions. Those are different mechanisms, not interchangeable names.

## The two articles: context, not a fresh SLA

- David Pine's
  [Aspire docs MCP tools article](https://davidpine.dev/posts/aspire-docs-mcp-tools/)
  explains the earlier `list_docs` / `search_docs` / `get_doc` design:
  reusable C# fetch/cache/index/parser services, weighted lexical matching,
  and an MCP-first consumer of `llms-small.txt`. That history motivated this
  demonstration. Today's pinned implementation defaults to **llms-full.txt**,
  and the public CLI exposes both prose-doc and separate API-doc commands.
  Do not present the article's earlier startup/cache/parser details as the
  current CLI contract.
- The
  [GitHub cross-repo documentation article](https://github.blog/ai-and-ml/github-copilot/automating-cross-repo-documentation-with-github-agentic-workflows/)
  explains the constrained cross-repo workflow, deterministic target-branch
  choice, safe outputs, draft PRs, doc-writer guidance, and engineer review.
  It reports **82 merged feature-docs PRs** and a **44.8-hour median** for the
  **May 3-June 2, 2026** measurement window spanning Aspire 13.3/13.4.
  Those are historical cohort observations, not new measurements, a current
  SLA, or the time-to-outcome of PR #1619.

Human review, merge, and website deployment sit between an agent's draft and
the corpus the next CLI process retrieves. Better grounding comes from
updated reviewed docs, not autonomous self-learning.

## Verification and failure behavior

`Test-DocsLoop.ps1` uses bounded child PowerShell fixtures for command
contracts, then runs `Show-DocsLoop.ps1` against the real public binary and
remote baseline. Fixtures are explicitly test data, never onstage output, and
their script/raw capture directory is removed in `finally`.

The tests cover exit failure even with valid JSON, empty/whitespace stdout,
malformed/null/empty/scalar JSON, zero-result arrays, timeouts, dynamic
slug/section/API IDs, missing or ambiguous matches, wrong section content,
empty/prose-drifted preparation text, empty/unrelated API code, the primary
accepted outcome despite an unresolved notification, the human-review gate,
global/missing CLI rejection, and unsafe output destinations.

The final live check requires the persisted proof, the nonempty real C# API
reference, both HTTP 200 content reads, and the requested GitHub-check mode.
It fails missing matches; it never substitutes an expected answer, a fake
transcript, a local Markdown parser, or a fabricated workflow outcome.

The executed Windows baseline on **October 10, 2026 (UTC)** passed **39 checks**,
including the full GitHub/public CLI rehearsal. A separate live
`-SkipGitHub` run also passed, saved `github.checked = false`, and issued no
GitHub commands. All eight excerpt ranges and the included MIT license were
checked against the pinned public source; authored tracked text is ASCII.
