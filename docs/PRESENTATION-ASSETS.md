# Presentation imagery, code, and motion

The refined deck keeps the approved title, abstract, event, and native facts. Its main thesis is the CLI inner loop: **Aspire makes AI more efficient** by enabling precise decisions from current facts and targeted actions. The supporting feature chain now demonstrates browser runtime configuration and maintainer-refined evidence guidance. No timing, token, or accuracy metric is invented.

## Actual imagery

| Asset | Public source and treatment |
| --- | --- |
| David Pine portrait | [Existing public GitHub author avatar](https://avatars.githubusercontent.com/u/7679720?v=4&s=512), also used by [the public site](https://github.com/IEvangelist/davidpine.dev/blob/37f77349eac2933503f2f4986c47620e69da76da/src/content/avatar.png). The supplied image is 300x300 even when a larger URL size is requested. Self-hosted WebP, full original aspect/face framing, 260px desktop display; not synthesized for this deck. |
| Product PR | Genuine browser capture of [microsoft/aspire#16531](https://github.com/microsoft/aspire/pull/16531): title/status/header area, proportionally encoded as WebP. SHA256 `ae29e23535094d9af4a47293ec4694b509fabf8e94ea50a945eb4835dd9f0d8b`. |
| Docs PR | Genuine browser capture of [microsoft/aspire.dev#775](https://github.com/microsoft/aspire.dev/pull/775): title/status/header area, proportionally encoded as WebP. SHA256 `76cae24c0f55e24de030ab8a0486060ab0502dec9e15f456b6847ab57d5a728c`. |
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

Under the portrait, the existing GitHub link is joined by only the three requested current public profiles: [X](https://x.com/davidpine7), [Bluesky](https://bsky.app/profile/davidpine.dev), and [LinkedIn](https://www.linkedin.com/in/dpine/). There is no email, Mastodon, stale Bluesky domain, or extra profile. Each link has a platform label, visible focus, a 44px rendered target, and safe new-tab attributes.

Those three brand glyphs come from maintained [`@fortawesome/free-brands-svg-icons` 7.1.0](https://www.npmjs.com/package/@fortawesome/free-brands-svg-icons), imported individually rather than drawing substitute symbols. [The original license](../deck/public/licenses/fontawesome-brands.txt) identifies icons as CC BY 4.0 and code as MIT. Trademark rights are unchanged. This brand-only set is separate from the single Octicons family used for semantic operation/resource icons.

## Actual code, not invented API calls

The deck explicitly labels snippets as excerpts, selected fields, or commands. Long source expressions are line-wrapped and noncontiguous sections are labeled; the complete source is always linked.

- `demo/host/apphost.cs`: the [verified application/resource-model source](https://github.com/IEvangelist/inside-aspire/tree/e6047c65c1898ba361149700c8ed4ac61af91fa8/demo), unchanged by this presentation refinement.
- `Weather.Api.csproj`, `WeatherJsonContext.cs`, native-summary evidence, and compile/compatibility probes remain in the repository and [pre-talk runbook](RUNBOOK.md), not build/proof cards in the audience deck.
- CLI lifecycle/wait/describe/trace operations run directly in the prepared real terminal. The terminal's process-local PATH selects the public executable, and `$apphost` holds the exact target; no `.ps1` entry point is required on stage.
- `pr-docs-check.md` YAML: trigger and safe-output fields from [the selected run's actual workflow head](https://github.com/microsoft/aspire/blob/42e77dc98549f9cbce290709172ab629a2d3f191/.github/workflows/pr-docs-check.md). The full source retains merged-event guards, deterministic target resolution, and additional policy.
- Docs PR JSON: selected actual GitHub REST fields for merged PR 775, including merger `davidfowl`. Its old gh-aw artifacts are expired; no accepted/strong outcome or fabricated review count is shown. The explicit maintainer refinement commit is linked.
- Conditional HTTP code: [CachedHttpDocumentFetcher.cs, lines 37-45](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/CachedHttpDocumentFetcher.cs#L37-L45).
- Parser/cache/weights: the [existing pinned C# excerpts](code/) and [source citations](SOURCES.md).
- The live-command slide contains actual, copyable `aspire docs search/get` and `aspire docs api search/get` commands. Slug `browser-logs`, section `Configure browser logs`, and the exact experimental `WithBrowserLogs` member ID were returned by public CLI 13.6.1. [Evidence and scope](evidence/browser-logs.json) distinguish this documented extra capability from the unchanged native app.
- API Markdown TypeScript: the [actual compiler-derived C# member route](https://github.com/microsoft/aspire.dev/blob/1a61517655b4fd7811ef63fb5913f6fb623d9d6a/src/frontend/src/pages/reference/api/csharp/%5Bpackage%5D/%5Btype%5D/%5BmemberKind%5D.md.ts).

The deck has 12 code blocks using [`highlight.js` 11.12.0](https://www.npmjs.com/package/highlight.js) core plus explicit C#, PowerShell, shell, YAML, JSON, and TypeScript modules, under [BSD-3-Clause](../deck/public/licenses/highlightjs-BSD.txt). It does not auto-detect code or load the all-language plugin. Tokens have deliberate light/dark colors; inline-code backgrounds do not leak onto individual syntax tokens.

Soft wrapping leaves literal/copied source text intact. The panel header stays fixed outside the scrollable code body, and the body grows to the rounded panel bottom. Only a line explicitly requiring preserved horizontal layout uses `data-preserve-layout`; its accessible body scrolls without clipping content or introducing token/line/page scrollbars.

## Connected architecture and accessible motion

The main SVG cycle is agent/shipped skills -> native CLI -> managed AppHost/native app -> observed results -> next precise decision. The CLI is both a control and evidence hub.

The supporting docs cycle shows reviewed PR -> gh-aw/doc-writer -> safe-output draft -> human review/merge -> publish Markdown -> C# fetch/parse/cache/index -> CLI lookup -> shipped guidance -> next reviewed change. Human review and publication are explicit barriers; nothing trains the model or auto-merges.

The runtime and compiler-reference diagrams are separate. The former distinguishes native CLI/API, managed C# AppHost, DCP orchestration, Node/Vite, browser React, providers, and OTLP/dashboard. The latter shows DLL/XML/available PDB -> Roslyn canonical model -> deterministic schema/C# Markdown -> sitemap/API lookup.

Edges and selective code emphasis advance with the speaker, reverse correctly, and restore from deep links. There are no infinite decorative loops. Reading, print, and reduced motion expose the complete information immediately. Narrow layouts redraw stage/resource relationships with text and semantic icons instead of minuscule SVGs. Public speaker notes and original citations remain available.

Graph connections have no unfragmented background guides: each complete path/arrow/label appears only after both linked boxes have appeared, and hides again when a back step removes an endpoint. The full return cycle appears at its final stage. Static reading, print, and reduced motion retain every connection.

Shortened on-screen graph labels preserve their detailed accessible descriptions. Node text keeps 22px titles and 20px details with horizontal padding and separate title/subtitle baselines; no text is truncated, hidden, or compressed with `textLength`. All 66 rendered labels across the four graphs are checked against their actual SVG node boxes after font loading. Every audience slide is also checked using rendered text ranges and container bounds in light/dark presentation and reading layouts.

The three-item workflow strip uses a compact centered grouping, rather than justified spacing across the slide. It reflows vertically on narrow layouts, with source code retaining left alignment.

The adjusted connector ports are derived from the linked node bounds. The DLL/XML/PDB fan-in has three symmetric Roslyn entry ports separated by a quarter of the model height, matching orthogonal elbows, and a straight XML/model centerline. The rest of the API pipeline shares that row. Browser/Vite/API and observed-result/decision rows also align their centers; separate launch, published-traffic, telemetry, and return ports keep their distinct roles. Inner-loop captions sit clear of their routes. The reviewed docs supply graph is unchanged.

Rendered connector checks measure all 32 routes across both themes, projector/aspect layouts, reading, and print. They check boundary positions and arrow direction, inbound arrowhead spacing, final-elbow clearance, viewBox containment, unrelated-node crossings, and label collisions. Narrow reading retains all node identities and relationships; the existing full forward/back checks still require both endpoints before any connection appears.

## Sequential opening and actual image area

**Start presentation** goes to the second slide, `thesis`; chapter links still jump directly to their named sections. The removed timeout story aliases to `browser-evidence`.

The original 1440x1000 native captures are unchanged. Presentation uses a larger 580px proportional image footprint instead of a 500px contain box; reading uses full available width. The image's box matches its actual painted aspect, so increasing layout space increases real map/weather content rather than blank side bands. PR header captures also retain their intrinsic aspect and full available width. Rendered tests measure painted area, not a CSS size string, and preserve attribution and viewport containment.

## Three benefits, proof before internals

The opening roadmap, chapter entries, and main close repeat **Know what's true. Act precisely. Stay current.** Why-first copy is visible on the three entries, not only in notes. The selected CLI member JSON at `api-code` matches the actual public response's `id`, `name`, `language`, and `kind`; it precedes the compiler/API diagram. The TypeScript renderer excerpt remains supporting source, and narrative-doc weights are explicitly separate from the API catalog.

The added three-command operations excerpt uses the existing exact `demo\host\apphost.cs` target for `wait`, `describe`, and `otel traces`. Public CLI 13.6.1 help and the recorded app rehearsal verify the flags. It sits with the skill/tool definition after the healthy-app proof, not on a new build/test slide. AppHost/parser/renderer/workflow excerpts, native screenshots, PR captures, and all connector geometry remain intact.

The 26-slide order has 23 timed main slides and three optional appendices after the close. Notes cover exactly 60 presentation minutes with Q&A/networking separate. No approved abstract, runtime, skill tree, brand asset, or public evidence chain changed.
