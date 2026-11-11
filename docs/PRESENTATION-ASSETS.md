# Presentation imagery, code, and motion

The deck keeps the approved title, abstract, event and native facts. Its payoff is **Aspire makes AI more efficient**, now organized around the user's three areas: **AI loops**, **Aspire dashboard**, **Aspire deployment**. The reviewed product/docs supply loop feeds the skill-guided developer cycle; the dashboard exposes outcomes; a configured deployment model carries intent. No timing, token or accuracy metric is invented.

## Actual imagery

| Asset | Public source and treatment |
| --- | --- |
| David Pine portrait | [Existing public GitHub author avatar](https://avatars.githubusercontent.com/u/7679720?v=4&s=512), also used by [the public site](https://github.com/IEvangelist/davidpine.dev/blob/37f77349eac2933503f2f4986c47620e69da76da/src/content/avatar.png). The supplied image is 300x300 even when a larger URL size is requested. Self-hosted WebP, full original aspect/face framing, 260px desktop display; not synthesized for this deck. |
| Product PR | Genuine browser capture of [microsoft/aspire#16531](https://github.com/microsoft/aspire/pull/16531): title/status/header area, proportionally encoded as WebP. SHA256 `ae29e23535094d9af4a47293ec4694b509fabf8e94ea50a945eb4835dd9f0d8b`. |
| Docs PR | Genuine browser capture of [microsoft/aspire.dev#775](https://github.com/microsoft/aspire.dev/pull/775): title/status/header area, proportionally encoded as WebP. SHA256 `76cae24c0f55e24de030ab8a0486060ab0502dec9e15f456b6847ab57d5a728c`. |
| Native map | Existing actual native-artifact Madison captures with public providers and visible attribution. These remain labeled rehearsal captures, not forecast promises. |
| Integrated dashboard | Original official 2560x800 resource-page screenshots from the published overview, self-hosted unchanged in light/dark themes. Attributed as documentation imagery, not this weather run. Source URLs, byte lengths and SHA256 are in [dashboard/deployment provenance](evidence/dashboard-deployment.json). |

The portrait's downloaded PNG SHA256 is `f6b7c99ff0fa5ded75609eb438bdb53f17a31ac60ef53235eb5d7c6a5fa2d76f`; its WebP SHA256 is `209bc4571c67520bd634df6816654ee137cacbfc4dbe6f949abafbfabf174436`. There is no artificial face crop, generated person, stock headshot, fake terminal, or reconstructed GitHub/dashboard screenshot.

## Official branding and icons

The additive UX sync uses [template 719b552](https://github.com/IEvangelist/aspire-deck-template/tree/719b552b592c85f31fa5d257a1860117ea785f58)
as a read-only shell reference. Existing artwork/portrait/native/PR/dashboard
image bytes remain unchanged. The only new font is self-hosted
`@fontsource/fira-code` 5.3.0, with its original
[SIL OFL](../deck/public/licenses/FiraCode-OFL.txt). It changes glyph rendering,
not copied operators, whitespace, recorded output or generated JSON.
The clipboard write argument retains the original LF source exactly; Windows
can normalize LF to CRLF in its native clipboard readback. Range copy and
immutable linked stdout keep their original contents.
Template traffic-light window chrome is decorative; original captions,
recorded-run labels, source links and graph semantics remain.

The parent-produced `social/inside-aspire-og.png` (`1200x630`) and
`social/inside-aspire-social.png` (`1280x640`) retain the existing portrait's
bytes/framing and the official white wordmark. They were reviewed at native
size with actual painted Poppins/Fira Code and text contrast at least 4.5:1.
No competing portrait, generated person or altered logo is introduced.
The final user-requested icon revision adds the unmodified official GitHub mark,
existing Primer Octicons globe/code, and a real Segoe UI Emoji nerd-face glyph
beside the speaker name. The image is self-contained, with no new runtime font
or icon dependency.
[Asset SHA256, metadata and one-time GitHub setup](evidence/social-artwork.json)
distinguish deployed site OG activation from the separate repository setting.

New source-window legends follow the shared package contract, not arbitrary
syntax colors. Exact identifiers, labels, underlines and group rails agree;
core APIs remain neutral. [Pinned source mappings](evidence/package-accents.json)
cover JavaScript/Docker and the two explicitly illustrative C#/Go reference
blocks. The optional example is specifically a C# AppHost running a Go
workload, distinct from the AppHost's authoring language. Its code was not
run or used to produce the weather rehearsal. Current draft source/output
changes are explicitly identified below; original capture files are immutable.

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

Under the portrait, the GitHub, [X](https://x.com/davidpine7), [Bluesky](https://bsky.app/profile/davidpine.dev), and [LinkedIn](https://www.linkedin.com/in/dpine/) links form a vertical list. Their unchanged icons sit in left-aligned 44px tiles, with 20px visible URLs to the right. Visible text omits the scheme and trailing slash; full HTTPS hrefs and safe new-tab attributes are unchanged. Each whole row is a keyboard-focusable link named by its visible URL; the icons are decorative. No other profiles are added.

Those three brand glyphs come from maintained [`@fortawesome/free-brands-svg-icons` 7.1.0](https://www.npmjs.com/package/@fortawesome/free-brands-svg-icons), imported individually rather than drawing substitute symbols. [The original license](../deck/public/licenses/fontawesome-brands.txt) identifies icons as CC BY 4.0 and code as MIT. Trademark rights are unchanged. This brand-only set is separate from the single Octicons family used for semantic operation/resource icons.

## Actual code, not invented API calls

The deck labels snippets as excerpts, selected fields, or commands. Long
source expressions are line-wrapped and noncontiguous sections are labeled.
Complete source links, capture versions/dates and verification context are
preserved in speaker notes and the sources appendix, not repeated on stage.

- `demo/host/apphost.cs`: the linked [published development baseline](https://github.com/IEvangelist/inside-aspire/tree/e6047c65c1898ba361149700c8ed4ac61af91fa8/demo) predates the 13.6.4 update and publish-only Compose packaging. Service source and development semantics remain unchanged.
- `Weather.Api.csproj`, `WeatherJsonContext.cs`, native-summary evidence, and compile/compatibility probes remain in the repository and [pre-talk runbook](RUNBOOK.md), not build/proof cards in the audience deck.
- CLI lifecycle/wait/describe/trace operations run directly in the prepared real terminal. The terminal's process-local PATH selects the public executable, and `$apphost` holds the exact target; no `.ps1` entry point is required on stage.
- `pr-docs-check.md` YAML: trigger and safe-output fields from [the selected run's actual workflow head](https://github.com/microsoft/aspire/blob/42e77dc98549f9cbce290709172ab629a2d3f191/.github/workflows/pr-docs-check.md). The full source retains merged-event guards, deterministic target resolution, and additional policy.
- Docs PR JSON: selected actual GitHub REST fields for merged PR 775, including merger `davidfowl`. Its old gh-aw artifacts are expired; no accepted/strong outcome or fabricated review count is shown. The explicit maintainer refinement commit is linked.
- Conditional HTTP code: [CachedHttpDocumentFetcher.cs, lines 37-45](https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/CachedHttpDocumentFetcher.cs#L37-L45).
- Parser/cache/weights: the [existing pinned C# excerpts](code/) and [source citations](SOURCES.md).
- The docs/API commands use the actual returned slug, section and experimental member ID. [Original 13.6.1 evidence](evidence/browser-logs.json) remains intact. Plain get commands return the Markdown content by default; the [November 6 captures](evidence/default-markdown-2026-11-06.json) contain that content rendered as text. JSON stays useful for discovery. Browser logging is still an unapplied proposal.

The deck has 33 command/output/source blocks using [`highlight.js` 11.12.0](https://www.npmjs.com/package/highlight.js) core with explicit C#, PowerShell, shell, YAML, JSON, Go and plaintext, under [BSD-3-Clause](../deck/public/licenses/highlightjs-BSD.txt). The Markdown recordings show the CLI's default rendering. Publish/deploy have complete recordings; alternative standalone startup commands remain labeled references.

Soft wrapping leaves literal/copied source text intact. The panel header stays fixed outside the scrollable code body, and the body grows to the rounded panel bottom. Only a line explicitly requiring preserved horizontal layout uses `data-preserve-layout`; its accessible body scrolls without clipping content or introducing token/line/page scrollbars.

The publish/deploy recordings retain their original plaintext and receive terminal-style status, duration and timeline highlighting in the deck. Their redirected captures have no ANSI color codes. System monospace glyphs, fixed one-cell checkmarks and unwrapped timeline rows preserve the terminal columns; long log lines still wrap. No recording bytes or timings are changed.

## Connected architecture and accessible motion

The main SVG cycle is agent/shipped skills -> native CLI -> managed AppHost/native app -> observed results -> next precise decision. The CLI is both a control and evidence hub.

The supporting docs cycle shows reviewed PR -> gh-aw/doc-writer -> safe-output draft -> human review/merge -> publish Markdown -> C# fetch/parse/cache/index -> CLI lookup -> shipped guidance -> next reviewed change. Human review and publication are explicit barriers; nothing trains the model or auto-merges.

The runtime and compiler-reference diagrams are separate. The former distinguishes native CLI/dashboard/API, managed C# AppHost, DCP orchestration, Node/Vite, browser React, providers, and OTLP/dashboard. The dashboard is published with NativeAOT in the demo's pinned public release. The latter shows DLL/XML/available PDB -> Roslyn canonical model -> deterministic schema/C# Markdown -> sitemap/API lookup.

Edges and selective code emphasis advance with the speaker, reverse correctly, and restore from deep links. There are no infinite decorative loops. Reading, print, and reduced motion expose the complete information immediately. Narrow layouts redraw stage/resource relationships with text and semantic icons instead of minuscule SVGs. Public speaker notes and original citations remain available.

Graph connections have no unfragmented background guides: each complete path/arrow/label appears only after both linked boxes have appeared, and hides again when a back step removes an endpoint. The full return cycle appears at its final stage. Static reading, print, and reduced motion retain every connection.

Shortened on-screen graph labels preserve their detailed accessible descriptions. Node text keeps 22px titles and 20px details with horizontal padding and separate title/subtitle baselines; no text is truncated, hidden, or compressed with `textLength`. All 66 rendered labels across the four graphs are checked against their actual SVG node boxes after font loading. Every audience slide is also checked using rendered text ranges and container bounds in light/dark presentation and reading layouts.

The three-item workflow strip uses a compact centered grouping, rather than justified spacing across the slide. It reflows vertically on narrow layouts, with source code retaining left alignment.

The adjusted connector ports are derived from the linked node bounds. The DLL/XML/PDB fan-in has three symmetric Roslyn entry ports separated by a quarter of the model height, matching orthogonal elbows, and a straight XML/model centerline. The rest of the API pipeline shares that row. Browser/Vite/API and observed-result/decision rows also align their centers; separate launch, published-traffic, telemetry, and return ports keep their distinct roles. Inner-loop captions sit clear of their routes. The reviewed docs supply graph is unchanged.

Rendered connector checks measure all 32 routes across both themes, projector/aspect layouts, reading, and print. They check boundary positions and arrow direction, inbound arrowhead spacing, final-elbow clearance, viewBox containment, unrelated-node crossings, and label collisions. Narrow reading retains all node identities and relationships; the existing full forward/back checks still require both endpoints before any connection appears.

## Sequential opening and actual image area

In the local story draft, **Start presentation** goes to the second slide, `setup`; `thesis` follows as slide 3. Chapter links still jump directly to their named sections. The removed timeout story aliases to `browser-evidence`.

The original 1440x1000 native captures are unchanged. Presentation uses a larger 580px proportional image footprint instead of a 500px contain box; reading uses full available width. The image's box matches its actual painted aspect, so increasing layout space increases real map/weather content rather than blank side bands. PR header captures also retain their intrinsic aspect and full available width. Rendered tests measure painted area, not a CSS size string, and preserve attribution and viewport containment.

## Three benefits, proof before internals

The roadmap, primary entries and close repeat **AI loops**, **Aspire dashboard**, **Aspire deployment**. The draft introduces the older guidance assistants learned, reads the CLI response, then follows the page back to its PR and human refinement. The selected CLI member JSON keeps its `id`/`name`/`language`/`kind`, before the separate compiler/API graph. Narrative weights, release-published context and per-package-version API generation remain distinct.

The three operations use the existing exact `demo\host\apphost.cs` target for
`wait`, `describe`, and `otel traces`. Public CLI 13.6.1 was executed against
the prepared native artifact to collect real readiness/state and nonempty
weather telemetry. Dedicated recorded replay surfaces follow the unchanged
weather image before the skill/tool definition, not inside a half-width
taxonomy column or on new build/test slides. [Capture proof](CLI-REPLAY.md)
records hashes, privacy redactions, native format, and safe runtime cleanup.
AppHost/parser/workflow excerpts, native/PR imagery, and connector
geometry remain intact.

The local 43-slide draft has 40 timed main slides and three optional appendices after
the close. Notes cover exactly 60 presentation minutes with Q&A/networking
separate. Approved abstract, service source, official skill trees, brand assets
and verified PR chain are unchanged. The AppHost is explicitly updated to
public 13.6.4 and gains publish-only native packaging. Nine genuine recorded
surfaces retain one bounded output scroller; header and command stay anchored.
Read/print/no-JS expose complete responses. All 14 original capture files and
their frozen hashes remain intact. November 6 default-output captures replace
the displayed get responses; the Compose captures remain unchanged.
[Default-output provenance](evidence/default-markdown-2026-11-06.json) and
[deployment provenance](evidence/chapter-demos.json) record exact commands, hashes,
normalization, native format, image digest and scoped cleanup; it does not
rewrite the historical inventory.

## Dashboard and deployment reference boundaries

Official dashboard screenshot hashes are
`7e4b0c2cd12c8f64c6d7caadd7d764608b34eab7ea3cd3d7a59547661204ee42`
(dark) and `f936cd9d38eb12863bb59f122ad4003d7ef32a0364ba1beab2df201f00feefac`
(light). Images are downloaded unchanged from the overview's public assets,
not generated UI or new native captures.

The independent dashboard examples preserve browser authentication and use
explicitly labeled loopback container-port bindings. `latest` is the documented
mutable public image tag, not a pinned-version claim. Instrumentation/OTLP is
required; standalone is not automatic AppHost orchestration or unlimited
production retention. Those direct standalone startup commands remain
references; the actual rehearsal ran the dashboard through the Compose target.

Compose is now David's selected local target. The same AppHost publishes a
Linux NativeAOT API/React image and an authenticated standalone dashboard.
The new environment snippet reflects the local source, with image tag
13.6.2 distinct from CLI/SDK/integration 13.6.4. The real deploy used project
`aspire-talk-compose-5ea99390`, random loopback ports and private OTLP.
Actual map/Scalar/provider traces/correlated logs/weather metrics were observed.
Exact target teardown and owned cache/image removal restored the original
0 containers, 2 images, 13 volumes and 3 default networks. No cloud
resources, anonymous public dashboard or production workflow were enabled.
