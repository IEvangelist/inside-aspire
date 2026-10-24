# Inside Aspire: The Architecture Behind the AI Loop

The public talk repository for Wisconsin .NET UG, November 17, 2026 at 6pm Central. All 60 minutes are presentation time; Q&A and networking are separate.

**[Open the live deck](https://ievangelist.github.io/inside-aspire/)** | [Presenter runbook](docs/RUNBOOK.md) | [Public abstract](docs/ABSTRACT.md) | [Source pins](docs/SOURCES.md)

**Aspire makes AI more efficient.** The user's three primary areas are **AI loops**, **Aspire dashboard**, and **Aspire deployment**. Reviewed product/docs publication supplies the skill-guided developer loop; the dashboard makes outcomes inspectable with an AppHost or independently; deployment carries application intent into configured targets. Each area starts with why, then source-backed proof and machinery. The opening reaches the three-area roadmap; optional history, metrics, and sources follow the main close.

## What is here

| Path | Purpose |
| --- | --- |
| [`demo/`](demo/) | C# AppHost, actual NativeAOT ASP.NET Core weather API, and the retained React map UI |
| [`deck/`](deck/) | Custom reveal.js + Vite + TypeScript deck, official Aspire assets, self-hosted Poppins |
| [`.github/skills/`](.github/skills/) | Seven complete, unmodified CLI-supplied application skills |
| [`scripts/`](scripts/) | Pinned CLI preparation, native publication/probes, and the read-only docs rehearsal |
| [`docs/`](docs/) | Runbook, actual C# architecture excerpts, public abstract, and provenance |

Node is still a frontend development/build dependency. It is not the weather API runtime. The AppHost launches the native-published executable; an ordinary `dotnet build` is not AOT proof and there is no managed API fallback.

## Prepare and run

Use PowerShell 7 on Windows or Linux x64, a released .NET 10 SDK, and Node 22.12+ (or 20.19+). Native publishing also needs the platform's native compiler prerequisites described in the [runbook](docs/RUNBOOK.md).

```powershell
# Downloads a checksum-verified public CLI into gitignored .tools.
# Does not replace the user's global CLI or install global agent hooks.
$aspire = & .\scripts\Install-Aspire.ps1
$env:PATH = (Split-Path $aspire) + [IO.Path]::PathSeparator + $env:PATH

# Compile the browser bundle and the actual NativeAOT API before presenting.
pwsh .\scripts\Publish-Native.ps1
pwsh .\scripts\Test-Native.ps1

# Aspire owns AppHost lifecycle, readiness, and endpoint discovery.
aspire start --apphost demo\host\apphost.cs --isolated --non-interactive --launch-profile http
aspire wait api --apphost demo\host\apphost.cs --status healthy --timeout 120 --non-interactive
aspire describe --apphost demo\host\apphost.cs --format Json --non-interactive

# Inspect the real existing PR/run/docs chain and current docs/API indexes.
aspire docs search "Configure tracked browser" --format Json
aspire docs get browser-logs --section "Configure browser logs" --format Json
```

The shipped skills are already prepared. **Do not run `aspire agent init` on the presenter's profile just to rehearse.** The released installer configures usage hooks even with MCP disabled; [the preparation workflow uses an ephemeral runner](docs/SKILLS.md).

The PATH selection belongs only to this terminal process, not the user's global configuration. Preparation helpers remain available, but no `.ps1` wrapper is required on stage. The runbook includes direct docs/API and telemetry commands.

## Rehearse the deck

```powershell
npm ci --prefix deck --registry=https://registry.npmjs.org
npm run build --prefix deck
node .\deck\node_modules\vite\bin\vite.js preview deck --host 127.0.0.1 --port 4180 --strictPort
```

Open the exact URL printed by Vite, including `/inside-aspire/`. Arrow keys present; `Esc` opens overview; `R` switches reading mode; `T` switches theme; `S` opens speaker notes. Chapter links and slide IDs are stable. Phones default to scrolling. The Print control opens reveal.js's printable view. Reduced motion and light/dark modes are supported.

The presentation shell additively adopts [Aspire deck template 719b552](https://github.com/IEvangelist/aspire-deck-template/tree/719b552b592c85f31fa5d257a1860117ea785f58):
official-site typography/surfaces, self-hosted Fira Code, shared window chrome,
fixed menu controls, numbered navigation and reliable reading/overview/print.
The HTML-authored talk keeps highlighted code-line navigation, desktop paired
layouts, all seven click-to-expand full-output replays and the original graph
reveal rules. Copy buttons preserve exact source; print includes complete code
on one variable-height page per slide. This manual sync does not make future
template changes automatic. [Preservation/source proof](docs/evidence/template-ux.json).

Package callouts now label the real integration and `aspire add` name, matching
only the APIs that package owns. Contiguous code highlights have rounded ends,
not rounded seams on every line. The optional history appendix includes clearly
separated top-level C# AppHost and Go workload references; the original demo
and all recorded output are unchanged. **S** or **Speaker notes** opens Reveal's
native second-screen presenter console with notes, previews and timer.
Native transitions are configurable per deck, real chapter and individual
slide, with explicit slide attributes winning. Reduced-motion/read/print and
presenter previews remain immediate. [Authoring and presenter guidance](docs/RUNBOOK.md).

The deployed site's OG/Twitter card uses the approved portrait artwork.
For the separate GitHub repository setting, download
[`inside-aspire-social.png`](deck/public/social/inside-aspire-social.png), then use
**Repository Settings > Social preview > Edit > Upload an image**.
Committing the PNG does not set that GitHub setting automatically. [Artwork
hashes and setup boundary](docs/evidence/social-artwork.json).

The deck has 41 slides: 38 in the full-hour presentation, then three untimed appendices. The core links are `#/ai-loops`, `#/dashboard`, and `#/deployment`; direct demos and legacy hashes remain available. Seven **Recorded CLI run** pairs retain full genuine stdout in one bounded output-only scroller, with no visible status row. Six JSON responses preserve their full envelopes and escaped Markdown strings; wait is plaintext. [Capture proof and controls](docs/CLI-REPLAY.md) link immutable output. Read/print/reduced motion expose pairs immediately; read/print do not clip output. New dashboard/deployment commands are honestly labeled source-backed references, not additional captures or executed infrastructure.

## The actual AI loops

The supporting trail is [microsoft/aspire#16531](https://github.com/microsoft/aspire/pull/16531), adding tracked-browser runtime configuration -> [successful existing run 25092695241](https://github.com/microsoft/aspire/actions/runs/25092695241) -> [bot-generated, maintainer-refined microsoft/aspire.dev#775](https://github.com/microsoft/aspire.dev/pull/775) -> [published browser-logs.md](https://aspire.dev/integrations/devtools/browser-logs.md).

The direct CLI demonstration follows returned document slugs, sections, and the exact `WithBrowserLogs` C# member ID. The guide explains runtime configuration, child-resource browser diagnostics, and screenshot artifacts. That API is an experimental documented extra, not wired into the unchanged weather app. The existing timeout scripts remain optional historical regressions rather than the audience story. Exit code zero with empty results or missing semantic content is not proof.

This is a published Markdown corpus consumed by a real C# fetcher/parser/index and the CLI. It is not a custom parser recreation, vector database, training step, or instant self-learning. The docs draft crosses human review, merge, and deployment before entering the retrievable corpus. Application skills, the docs repo's `doc-writer`, CLI tools, and MCP are distinct.

That internal product/docs loop feeds the developer cycle: shipped skills ->
CLI -> current published docs, separate versioned API references and exact
resource evidence -> scoped operation -> observed results -> next decision.
Package-version API generation and the narrative corpus are separate; the
current captures do not prove automatic CLI-semver matching.

The dashboard chapter contrasts the integrated resource service with the
standalone OTLP viewer and its official container image. The deployment
chapter uses an explicitly labeled Docker Compose example to separate model,
publish and deploy. It does not change or deploy the weather AppHost, enable
anonymous dashboard access, or provision any cloud infrastructure. [Source
verification and official screenshot hashes](docs/evidence/dashboard-deployment.json)
retain those boundaries.

On stage we inspect an **existing** agentic workflow run and PR. We do not dispatch production automation or manufacture a failure/repair segment. The [docs-loop guide](docs/DOCS-LOOP.md) distinguishes the earlier personal post's MCP-first/`llms-small.txt` architecture from the current CLI/`llms-full.txt` surface.

## Publication and notifications

Reviewed pushes to `main` build and publish the deck through GitHub Pages Actions. Pull requests build and exercise the deck but do not deploy production. No scheduled or unattended content refresh changes the talk.

Windows and Linux CI publish/probe the native artifact; the browser gate covers the deck's navigation, assets, readability, accessibility, reduced motion, and print surface.

The separate, **manual-only** [live-link notification workflow](.github/workflows/notify-links.yml) can mention/assign `@IEvangelist` through `github-actions[bot]` after the final verified links are supplied. It is not sent on every deployment. GitHub account notification preferences control email; the workflow cannot guarantee email delivery.

## Reuse and limits

See [NOTICE.md](NOTICE.md) and [licenses/](licenses/). The retained sample is MIT; official artwork is CC0 subject to trademark rights; Poppins uses the SIL Open Font License. Original provider attribution stays in the map UI.

This is a public, unauthenticated local demo, not a production security template. Add appropriate authentication, authorization, rate limiting, provider quota/caching strategy, and operational policies before production use.
