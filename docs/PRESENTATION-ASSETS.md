# Presentation imagery, code, and motion

The refined deck keeps the approved title, abstract, event, native facts, and canonical PR/run/docs chain. Its main thesis is the CLI inner loop: **Aspire makes AI more efficient** by enabling precise decisions from current facts and targeted actions. That is a qualitative statement, not an invented timing, token, or accuracy metric.

## Actual imagery

| Asset | Public source and treatment |
| --- | --- |
| David Pine portrait | [Existing public GitHub author avatar](https://avatars.githubusercontent.com/u/7679720?v=4&s=512), also used by [the public site](https://github.com/IEvangelist/davidpine.dev/blob/37f77349eac2933503f2f4986c47620e69da76da/src/content/avatar.png). The supplied image is 300x300 even when a larger URL size is requested. Self-hosted WebP, full original aspect/face framing, 260px desktop display; not synthesized for this deck. |
| Product PR | Genuine browser capture of [microsoft/aspire#19478](https://github.com/microsoft/aspire/pull/19478): title/status area only, proportionally encoded as WebP. |
| Docs PR | Genuine browser capture of [microsoft/aspire.dev#1619](https://github.com/microsoft/aspire.dev/pull/1619): title/status area only, proportionally encoded as WebP. |
| Native map | Existing actual native-artifact Madison captures with public providers and visible attribution. These remain labeled rehearsal captures, not forecast promises. |

The portrait's downloaded PNG SHA256 is `f6b7c99ff0fa5ded75609eb438bdb53f17a31ac60ef53235eb5d7c6a5fa2d76f`; its WebP SHA256 is `209bc4571c67520bd634df6816654ee137cacbfc4dbe6f949abafbfabf174436`. There is no artificial face crop, generated person, stock headshot, fake terminal, or reconstructed GitHub/dashboard screenshot.

## Official branding and icons

The navigation uses the unchanged official Aspire compact mark. GitHub branding is secondary and identifies the GitHub-hosted workflow, PRs, and repository lineage; it does not replace Aspire or imply sponsorship.

The black/white GitHub Invertocat and wordmark files come unchanged from [GitHub's official logo archive](https://brand.github.com/GitHub_Logos.zip), linked by the [current usage guidance](https://brand.github.com/foundations/logo). Archive SHA256: `e2a67d6cc51d990a52c46c1cf6bcab688db4830982174bca50e0be7a5c2f3194`.

| Unmodified file | SHA256 |
| --- | --- |
| `github-black.svg` | `802172fd58f2956be454f45e07c351d5c3d6830554632796b8f16fcecc7d273b` |
| `github-white.svg` | `d26a77282b5f0fc5e36d52aa64d0a8dfeb042dab5b65802805ce83373d72f5f5` |
| `invertocat-black.svg` | `693d7abe6f899646cc2e96856723b45e95f71885a54910b2749f6decdf7e1ee1` |
| `invertocat-white.svg` | `ccd84c89b1056345608fc3489357f8acc7397e49a3cdc2d418b6c8016911d47b` |

No fills, proportions, effects, or paths are modified. The permitted marks link to GitHub and describe integration/source content. GitHub's trademark rights remain applicable.

Semantic toolbar/resource/review icons use only individual SVGs from [`@primer/octicons` 19.40.0](https://www.npmjs.com/package/@primer/octicons), under its [original MIT license](../deck/public/licenses/octicons-MIT.txt). The whole catalog is not bundled, and no replacement icon paths are hand-drawn.

## Actual code, not invented API calls

The deck explicitly labels snippets as excerpts, selected fields, or commands. Long source expressions are line-wrapped and noncontiguous sections are labeled; the complete source is always linked.

- `Weather.Api.csproj`, `WeatherJsonContext.cs`, and `demo/host/apphost.cs`: the [verified public repository source](https://github.com/IEvangelist/inside-aspire/tree/e6047c65c1898ba361149700c8ed4ac61af91fa8/demo), unchanged by this presentation refinement.
- CLI lifecycle/wait/describe/trace operations: the [verified runbook](RUNBOOK.md). The executable `$aspire` and exact `$apphost` path are prepared before using those commands.
- Native-summary JSON: selected actual fields from the verified Windows native rehearsal, not fabricated `aspire describe` output.
- `pr-docs-check.md` YAML: trigger and safe-output fields from [the pinned product workflow](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/.github/workflows/pr-docs-check.md). The full source retains merged-event guards, deterministic target resolution, and additional policy.
- Outcome JSON: selected fields from the actual accepted primary `create_pull_request` outcome for docs PR 1619. The secondary notification metadata can remain pending without changing that accepted/merged result.
- Conditional HTTP code: [CachedHttpDocumentFetcher.cs, lines 37-45](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/CachedHttpDocumentFetcher.cs#L37-L45).
- Parser/cache/weights: the [existing pinned C# excerpts](code/) and [source citations](SOURCES.md).
- Retrieval JSON: selected fields from the actual successful docs rehearsal. These are snapshot observations, not fabricated CLI output or a claim the changing corpus is permanently fixed.
- API Markdown TypeScript: the [actual compiler-derived C# member route](https://github.com/microsoft/aspire.dev/blob/1a61517655b4fd7811ef63fb5913f6fb623d9d6a/src/frontend/src/pages/reference/api/csharp/%5Bpackage%5D/%5Btype%5D/%5BmemberKind%5D.md.ts).

Highlighting uses [`highlight.js` 11.12.0](https://www.npmjs.com/package/highlight.js) core plus explicit C#, PowerShell, shell, YAML, JSON, TypeScript, and XML modules, under [BSD-3-Clause](../deck/public/licenses/highlightjs-BSD.txt). It does not auto-detect code or load the all-language plugin. Tokens have deliberate light/dark colors; inline-code backgrounds do not leak onto individual syntax tokens.

## Connected architecture and accessible motion

The main SVG cycle is agent/shipped skills -> native CLI -> managed AppHost/native app -> observed results -> next precise decision. The CLI is both a control and evidence hub.

The supporting docs cycle shows reviewed PR -> gh-aw/doc-writer -> safe-output draft -> human review/merge -> publish Markdown -> C# fetch/parse/cache/index -> CLI lookup -> shipped guidance -> next reviewed change. Human review and publication are explicit barriers; nothing trains the model or auto-merges.

The runtime and compiler-reference diagrams are separate. The former distinguishes native CLI/API, managed C# AppHost, DCP orchestration, Node/Vite, browser React, providers, and OTLP/dashboard. The latter shows DLL/XML/available PDB -> Roslyn canonical model -> deterministic schema/C# Markdown -> sitemap/API lookup.

Edges and selective code emphasis advance with the speaker, reverse correctly, and restore from deep links. There are no infinite decorative loops. Reading, print, and reduced motion expose the complete information immediately. Narrow layouts redraw stage/resource relationships with text and semantic icons instead of minuscule SVGs. Public speaker notes and original citations remain available.
