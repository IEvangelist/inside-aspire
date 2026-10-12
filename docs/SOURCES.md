# Sources and provenance

Public material only. No unannounced versions or release dates are part of this talk. Raw workflow logs, local telemetry, CLI dumps, and private configuration stay gitignored.

## Canonical real-loop evidence

| Evidence | Public link |
| --- | --- |
| Merged product change: runtime tracked-browser configuration | [microsoft/aspire#16531](https://github.com/microsoft/aspire/pull/16531) |
| Successful existing `pr-docs-check` run | [25092695241](https://github.com/microsoft/aspire/actions/runs/25092695241) |
| Workflow Markdown at that exact run head | [`42e77dc9`](https://github.com/microsoft/aspire/blob/42e77dc98549f9cbce290709172ab629a2d3f191/.github/workflows/pr-docs-check.md) |
| Bot draft, maintainer-refined and merged docs | [microsoft/aspire.dev#775](https://github.com/microsoft/aspire.dev/pull/775) |
| Explicit maintainer refinement | [`49371cfd`](https://github.com/microsoft/aspire.dev/commit/49371cfd913e1c3eec5a058eca745c21679b848d): moved the guide and addressed feedback |
| Docs merge | [`d114c3ce`](https://github.com/microsoft/aspire.dev/commit/d114c3ce136dc2b331878f1c6b9479d132fab53e) |
| Published feature Markdown | [browser-logs.md](https://aspire.dev/integrations/devtools/browser-logs.md) |
| Current default corpus | [llms-full.txt](https://aspire.dev/llms-full.txt) |

The docs PR body links the source PR and exact successful run. Initial commit `6d08e7d6` is bot-authored; David Fowler's explicit refinement and merge are the human evidence. There are zero submitted GitHub review records, so no formal-review count is claimed. The historical run's gh-aw artifacts have expired; the deck uses verified GitHub merged-state fields rather than fabricated outcome metrics. [Public-safe provenance and executed CLI identities](evidence/browser-logs.json) record the complete chain.

Product PR 16531 adds the **Configure tracked browser** dashboard command with runtime configuration and optional persistence. It did not initially create all `WithBrowserLogs` capabilities. That API remains experimental (`ASPIREBROWSERLOGS001`) in `Aspire.Hosting.Browsers`, and it is not enabled in the unchanged weather app.

## Pinned source

| Source | Pin and role |
| --- | --- |
| Weather sample | [`microsoft/aspire-samples@5fb269526842727ff6cb945c27398b093895a758`](https://github.com/microsoft/aspire-samples/tree/5fb269526842727ff6cb945c27398b093895a758/samples/aspire-with-node): original React UI, hooks, types, API contract, screenshots, provider notices |
| Aspire implementation | [`microsoft/aspire@213aa53159663c6f3e4a29bf7df907179ae6e1c4`](https://github.com/microsoft/aspire/tree/213aa53159663c6f3e4a29bf7df907179ae6e1c4): C# docs/API architecture |
| Selected run's workflow | [`microsoft/aspire@42e77dc98549f9cbce290709172ab629a2d3f191`](https://github.com/microsoft/aspire/blob/42e77dc98549f9cbce290709172ab629a2d3f191/.github/workflows/pr-docs-check.md): actual historical source, not a later configuration |
| Current returned browser API source | [`BrowserLogsBuilderExtensions.cs@f4c27f2d`](https://github.com/microsoft/aspire/blob/f4c27f2d43ddc1cacd0dd083b30d1fea1cee7a62/src/Aspire.Hosting.Browsers/BrowserLogsBuilderExtensions.cs#L122-L289): exact member source returned by API get |
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
- [`pr-docs-check.md`](https://github.com/microsoft/aspire/blob/42e77dc98549f9cbce290709172ab629a2d3f191/.github/workflows/pr-docs-check.md) and [compiled lock workflow](https://github.com/microsoft/aspire/blob/42e77dc98549f9cbce290709172ab629a2d3f191/.github/workflows/pr-docs-check.lock.yml): selected run's product-repo agentic workflow.

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

The direct browser-evidence commands were executed with the repository-local public CLI 13.6.1: list/search returned `browser-logs`, get exposed `Configure browser logs`, and section retrieval contained the real runtime dialog, scope/configuration options, persistence, interaction-service requirement, and immediate application. Separate C# API search/get returned the exact `WithBrowserLogs` member, experimental diagnostic, CDP remarks, child-resource log stream, and screenshot artifacts. Only search used `--language`. Raw JSON and captures remain gitignored.

The user-directed three-area story is **AI loops**, **Aspire dashboard**, and
**Aspire deployment**. Real product/docs publication feeds the skill-guided
developer cycle. Direct CLI proof precedes compiler/parser explanation;
all seven replay panels render complete recorded stdout, while `api-code`
selects genuine member fields. Narrative lexical weights remain separate from
the API index. Exact scoped native observations retain their original
`demo\host\apphost.cs` target and immutable public captures.

## Dashboard, deployment and versioned context

The parent independently verified the current public documentation and
public CLI 13.6.1 help before these presentation-only additions. No new
startup, hosting integration, native build, artifact publication, deployment
or cloud provisioning was executed in this worktree.

| Surface | Verified public source |
| --- | --- |
| Integrated dashboard/resource service | [Dashboard overview](https://aspire.dev/dashboard/overview.md); actual official light/dark resource-page assets are self-hosted unchanged |
| Standalone CLI and OCI image | [Standalone dashboard](https://aspire.dev/dashboard/standalone.md); default authentication retained, loopback port bindings labeled as a safety adaptation |
| Model/publish/deploy distinctions | [Docker Compose deployment](https://aspire.dev/deployment/docker-compose.md), as an explicit documented example rather than a target selected for the weather demo |
| Compose environment API | [AddDockerComposeEnvironment source](https://github.com/microsoft/aspire/blob/f4c27f2d43ddc1cacd0dd083b30d1fea1cee7a62/src/Aspire.Hosting.Docker/DockerComposeEnvironmentExtensions.cs#L78-L101) and [WithDashboard](https://github.com/microsoft/aspire/blob/f4c27f2d43ddc1cacd0dd083b30d1fea1cee7a62/src/Aspire.Hosting.Docker/DockerComposeEnvironmentExtensions.cs#L176-L180) |
| Per-package-version API model | [PackageJsonGenerator README](https://github.com/microsoft/aspire.dev/blob/ce6d2424abb1414a581837605d8c793cfc869fb2/src/tools/PackageJsonGenerator/README.md) |
| Separate current narrative corpus | [Astro configuration](https://github.com/microsoft/aspire.dev/blob/ce6d2424abb1414a581837605d8c793cfc869fb2/src/frontend/astro.config.mjs), excluding `reference/api/**` |

[Exact image hashes, source pins, CLI/API shapes and safety boundaries](evidence/dashboard-deployment.json)
are retained separately from executed CLI replay proof. Release-published docs
and versioned API generation do not prove automatic CLI-semver matching or
review-free publication.
