# Sources and provenance

Public material only. No unannounced versions or release dates are part of this talk. Raw workflow logs, local telemetry, CLI dumps, and private configuration stay gitignored.

## Canonical real-loop evidence

| Evidence | Public link |
| --- | --- |
| Merged product change: startup timeout excludes builds | [microsoft/aspire#19478](https://github.com/microsoft/aspire/pull/19478) |
| Successful existing `pr-docs-check` run | [33887017276](https://github.com/microsoft/aspire/actions/runs/33887017276) |
| Reviewed and merged docs | [microsoft/aspire.dev#1619](https://github.com/microsoft/aspire.dev/pull/1619) |
| Docs merge | [`7d461ec15f2eb79a601d4fc8c63f5a61a6e2cc76`](https://github.com/microsoft/aspire.dev/commit/7d461ec15f2eb79a601d4fc8c63f5a61a6e2cc76) |
| Published command Markdown | [aspire-start.md](https://aspire.dev/reference/cli/commands/aspire-start.md) |
| Current default corpus | [llms-full.txt](https://aspire.dev/llms-full.txt) |

The primary `gh aw outcomes` item is the `create_pull_request` outcome pointing at docs PR 1619: accepted, with a merged signal and human reviews. A secondary `notify_source_pr` metadata item can remain pending because it has no object reference to check. That does not mean the successful workflow or merged docs PR failed; do not assert every outcome item is accepted.

## Pinned source

| Source | Pin and role |
| --- | --- |
| Weather sample | [`microsoft/aspire-samples@5fb269526842727ff6cb945c27398b093895a758`](https://github.com/microsoft/aspire-samples/tree/5fb269526842727ff6cb945c27398b093895a758/samples/aspire-with-node): original React UI, hooks, types, API contract, screenshots, provider notices |
| Aspire implementation | [`microsoft/aspire@213aa53159663c6f3e4a29bf7df907179ae6e1c4`](https://github.com/microsoft/aspire/tree/213aa53159663c6f3e4a29bf7df907179ae6e1c4): workflow and C# docs/API architecture |
| Docs implementation | [`microsoft/aspire.dev@1a61517655b4fd7811ef63fb5913f6fb623d9d6a`](https://github.com/microsoft/aspire.dev/tree/1a61517655b4fd7811ef63fb5913f6fb623d9d6a): published docs-source context |
| Official brand | [`microsoft/aspire-brand@f9eb464dec47870de23d55dd7b3c00d39122813d`](https://github.com/microsoft/aspire-brand/tree/f9eb464dec47870de23d55dd7b3c00d39122813d): unchanged logos, brand palette, Poppins guidance, CC0/trademark notice |
| Public CLI/tool baseline | [Aspire 13.6.1 release](https://github.com/microsoft/aspire/releases/tag/v13.6.1): checksum-pinned Windows/Linux installers, not the presenter's global CLI |
| Complete skill bundle | [Source, generation run, artifact digest, and file hashes](SKILLS.md) |

The public source snapshot and the released CLI baseline are distinct provenance records. The live rehearsal queries the currently published corpus; it does not pretend the corpus is frozen at the source snapshot.

## Architecture anchors

- [`DocsFetcher.cs`](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsFetcher.cs): default corpus, conditional HTTP/ETag fetching and cache behavior.
- [`LlmsTxtParser.cs`](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/LlmsTxtParser.cs): fenced-code-aware H1 document and H2+ section parsing.
- [`DocsIndexService.cs`](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs): fingerprint/cached indexing and local weighted lexical ranking.
- [`ApiDocsIndexService.cs`](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsIndexService.cs): separate API-reference index.
- [`PackageJsonGenerator`](https://github.com/microsoft/aspire.dev/tree/1a61517655b4fd7811ef63fb5913f6fb623d9d6a/src/tools/PackageJsonGenerator): DLL metadata and XML documentation analyzed through Roslyn into the canonical API model; available PDB information adds source locations.
- [`PdbSourceReader.cs`](https://github.com/microsoft/aspire.dev/blob/1a61517655b4fd7811ef63fb5913f6fb623d9d6a/src/tools/PackageJsonGenerator/Helpers/PdbSourceReader.cs) and [C# member Markdown route](https://github.com/microsoft/aspire.dev/blob/1a61517655b4fd7811ef63fb5913f6fb623d9d6a/src/frontend/src/pages/reference/api/csharp/%5Bpackage%5D/%5Btype%5D/%5BmemberKind%5D.md.ts): compiler-derived source/schema information becomes published C# reference Markdown, which is ingested by the separate CLI API index.
- [`pr-docs-check.md`](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/.github/workflows/pr-docs-check.md) and [compiled lock workflow](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/.github/workflows/pr-docs-check.lock.yml): product-repo agentic workflow.

Short, source-backed C# excerpts are under [code/](code/); the real implementation is linked rather than recreated.

## Public articles

**[Automating cross-repo documentation with GitHub Agentic Workflows](https://github.blog/ai-and-ml/github-copilot/automating-cross-repo-documentation-with-github-agentic-workflows/)** explains the product/docs-repo boundary, deterministic context, constrained tools, safe-output handler, draft PR, and engineer review.

Its **82 merged feature-docs PRs and 44.8-hour median** describe the historical **May 3-June 2, 2026** reporting window. They are not fresh measurements or an SLA. The canonical run's individual duration is not that aggregate median.

**[Aspire docs MCP tools: the C# architecture story](https://davidpine.dev/posts/aspire-docs-mcp-tools/)** is historical context for the reusable services: the earlier `llms-small.txt`/MCP-first surface. The current rehearsal uses `llms-full.txt`, CLI docs commands, and a separate API index. Historical weights and surfaces are not silently presented as current contracts.

The articles are cited and summarized, not reproduced in full.

## NativeAOT compatibility references

- [ASP.NET Core NativeAOT](https://learn.microsoft.com/aspnet/core/fundamentals/native-aot?view=aspnetcore-10.0): Minimal APIs, slim builder, and source-generated serialization.
- [ASP.NET Core OpenAPI support](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/overview?view=aspnetcore-10.0): built-in `Microsoft.AspNetCore.OpenApi`, including native/trimming considerations.
- [Scalar ASP.NET Core source](https://github.com/scalar/scalar/tree/main/integrations/dotnet): integration compatibility metadata and source.
- [OpenTelemetry .NET source](https://github.com/open-telemetry/opentelemetry-dotnet): AOT compatibility metadata and analysis tests.

Source compatibility declarations are supporting evidence. Windows/Linux native publication and probes plus the exact native process's browser/OpenAPI/Scalar and Aspire traces/logs/metrics are the runtime proof. A managed build alone is insufficient.

## Official assets

Use [https://aka.ms/aspire/brand](https://aka.ms/aspire/brand), not the hyphenated alias. The deck's original SVG bytes are unchanged and preserve proportions and fills. Primary purple `#7455dd`, deep purple `#512bd4`, and dark `#1f1e33` come from the pinned brand source. Poppins is self-hosted from a pinned package.

See [NOTICE.md](../NOTICE.md) for licenses, trademarks, and provider attribution.

## Executed evidence

[Native Windows and Linux gates, run 38025689486](https://github.com/IEvangelist/inside-aspire/actions/runs/38025689486) passed warning-as-error native publication, native format checks, 50 parity tests, browser/OpenAPI/Scalar, and native OTLP traces/logs/metrics. Windows passed 280 assertions; Linux passed 273 because native executable formats have different checks.

The separate live-provider rehearsal called the native API for Madison, returned five forecast days and five geocoding matches, and exercised the actual native/Vite browser plus Scalar. The deck uses those native live captures, not a mock dashboard. Provider-fixture assertions and live-provider evidence are explicitly separate. This is runtime/contract proof, not a startup, memory, or throughput benchmark.
