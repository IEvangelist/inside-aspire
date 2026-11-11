# Inside Aspire: The Architecture Behind the AI Loop

The public talk repository for Wisconsin .NET UG, November 17, 2026 at 6pm Central. All 60 minutes are presentation time; Q&A and networking are separate.

**[Open the live deck](https://ievangelist.github.io/inside-aspire/)** | [Presenter runbook](docs/RUNBOOK.md) | [Public abstract](docs/ABSTRACT.md) | [Source pins](docs/SOURCES.md)

**Aspire makes AI more efficient.** The talk starts with the older Aspire assistants learned, then asks three questions: which API, what happened, and how to ship. **AI loops**, **Aspire dashboard**, and **Aspire deployment** each replace a guess with something to check. Meet the weather app after the AI-loop overview, then read the CLI's guide and exact API, follow the page back to its PR and human refinement, return to the app's runtime evidence, and deploy from the model. Optional history, metrics, and sources follow the main close.

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
# Install the checksum-verified CLI side-by-side, not over the global CLI.
$aspire = & .\scripts\Install-Aspire.ps1 -Version '13.6.4'
if ((& $aspire --version | Out-String).Trim() -notmatch '^13\.6\.4(?:\+.*)?$') {
    throw 'Unexpected CLI; do not fall back to the global installation.'
}
$env:PATH = (Split-Path $aspire) + [IO.Path]::PathSeparator + $env:PATH
$env:ASPIRE_HOME = Join-Path $PWD '.artifacts\chapter-demos\aspire-home-13.6.4'

# Compile the browser bundle and the actual NativeAOT API before presenting.
pwsh .\scripts\Publish-Native.ps1

# Aspire owns AppHost lifecycle, readiness, and endpoint discovery.
aspire start --apphost demo\host\apphost.cs --isolated --non-interactive --launch-profile http
aspire wait api --apphost demo\host\apphost.cs --status healthy --timeout 120 --non-interactive
aspire describe --apphost demo\host\apphost.cs --format Json --non-interactive

# Inspect the real existing PR/run/docs chain and current docs/API indexes.
aspire docs search "Configure tracked browser" --format Json
aspire docs get browser-logs --section "Configure browser logs"
```

The app and native verification use the public 13.6.4 CLI and AppHost SDK.
The original docs regression and shipped skills retain their separate 13.6.1
provenance; the installer defaults to that version for those workflows.

The shipped skills are already prepared. **Do not run `aspire agent init` on the presenter's profile just to rehearse.** The released installer configures usage hooks even with MCP disabled; [the preparation workflow uses an ephemeral runner](docs/SKILLS.md).

The PATH selection belongs only to this terminal process, not the user's global configuration. Preparation helpers remain available, but no `.ps1` wrapper is required on stage. The runbook includes direct docs/API and telemetry commands.

## Rehearse the deck

```powershell
npm ci --prefix deck --registry=https://registry.npmjs.org
npm run build --prefix deck
node .\deck\node_modules\vite\bin\vite.js preview deck --host 127.0.0.1 --port 4180 --strictPort
```

Open the exact URL printed by Vite, including `/inside-aspire/`. Arrow keys present; `Esc` opens overview; `R` switches reading mode; `T` switches theme; `S` opens speaker notes. Chapter links and slide IDs are stable. Phones default to scrolling. The Print control opens reveal.js's printable view. Reduced motion and light/dark modes are supported.

The slide count is a high-contrast badge outside the Previous/Next controls,
visible at the bottom-left by default. In `deck/index.html`, edit
`#slide-position`'s `data-position` to `top-left`, `top-right`, `bottom-left`, or
`bottom-right`; set `data-visible="false"` to hide it. Invalid values stop
initialization with an explicit error. Print and speaker-preview frames always
hide the badge.

The presentation shell additively adopts [Aspire deck template 719b552](https://github.com/IEvangelist/aspire-deck-template/tree/719b552b592c85f31fa5d257a1860117ea785f58):
official-site typography/surfaces, self-hosted Fira Code, shared window chrome,
fixed menu controls, numbered navigation and reliable reading/overview/print.
The HTML-authored talk keeps highlighted code-line navigation, desktop paired
layouts, click-to-expand full-output replays and the original graph
reveal rules. Copy buttons preserve exact source; print includes complete code
on one variable-height page per slide. This manual sync does not make future
template changes automatic. [Preservation/source proof](docs/evidence/template-ux.json).

Package callouts now label the real integration and `aspire add` name, matching
only the APIs that package owns. Contiguous code highlights have rounded ends,
not rounded seams on every line. The optional history appendix includes clearly
separated top-level C# AppHost and Go workload references. Original capture
files and application service source are unchanged; the AppHost now has
publish-only native packaging. **S** or **Speaker notes** opens Reveal's
native second-screen presenter console with notes, previews and timer.
Native transitions are configurable per deck, real chapter and individual
slide, with explicit slide attributes winning. Reduced-motion/read/print and
presenter previews remain immediate. [Authoring and presenter guidance](docs/RUNBOOK.md).

The intro's four social links are a vertical list with left-aligned 44px icon
tiles and visible URLs on the right. The whole row is the link. Visible text
omits `https://` and trailing slashes; full HTTPS destinations are unchanged.

The deployed site's OG/Twitter card uses the approved portrait artwork.
For the separate GitHub repository setting, download
[`inside-aspire-social.png`](deck/public/social/inside-aspire-social.png), then use
**Repository Settings > Social preview > Edit > Upload an image**.
Committing the PNG does not set that GitHub setting automatically. [Artwork
hashes and setup boundary](docs/evidence/social-artwork.json).

The deck has 43 slides: 40 in the full-hour presentation, then three untimed appendices. Start presentation opens `#/setup`; `#/thesis` follows with the three questions. `#/takeaways` recaps AI efficiency, the dev inner loop and deployment before the closing call to action. Nine **Recorded CLI run** pairs show four JSON discovery/runtime responses, two default-output responses, readiness and Compose publish/deploy output. The original seven 13.6.1 captures and the Compose recordings remain immutable. The two plain get commands now use [November 6 default-output captures](docs/evidence/default-markdown-2026-11-06.json); [capture controls](docs/CLI-REPLAY.md) and [native/deployment proof](docs/evidence/chapter-demos.json) keep the recordings distinct. Each complete response has one output-only scroller; read/print do not clip it.

## The actual AI loops

The chapter openers define the capability and show the mechanism: AI
feedback loops support product development, feature-driven docs updates
and application development/debugging. The dashboard connects a request
with its signals, and deployment carries one AppHost model into a target's execution environment.
The demo instructions remain in speaker notes.

Audience slides keep the point, code and demo content. Citation links,
capture dates/versions and verification details live in speaker notes and
the sources appendix, rather than in repeated on-slide footers. Recorded
terminals retain a short **Recorded CLI run** label.

The supporting trail is [microsoft/aspire#16531](https://github.com/microsoft/aspire/pull/16531), adding tracked-browser runtime configuration -> [successful existing run 25092695241](https://github.com/microsoft/aspire/actions/runs/25092695241) -> [bot-generated, maintainer-refined microsoft/aspire.dev#775](https://github.com/microsoft/aspire.dev/pull/775) -> [published browser-logs.md](https://aspire.dev/integrations/devtools/browser-logs.md).

The AI demo uses this Copilot prompt:

> Use the shipped aspireify skill to propose browser logging for this Vite frontend. Read current docs and the exact C# API. Do not edit files or install packages. Call out the package and the experimental diagnostic.

JSON preserves discovery IDs; the default output of `aspire docs get` and `aspire docs api get` is the Markdown content, rendered for reading. Add `--format Json` for the structured record with the same content. The audience slide explains the CLI's value; the presenter task stays in speaker notes. `WithBrowserLogs` remains experimental and unapplied. The existing timeout scripts are historical regressions, not the audience story.

This is a published Markdown corpus consumed by a real C# fetcher/parser/index and the CLI. It is not a custom parser recreation, vector database, training step, or instant self-learning. The docs draft crosses human review, merge, and deployment before entering the retrievable corpus. Application skills, the docs repo's `doc-writer`, CLI tools, and MCP are distinct.

That internal product/docs loop feeds the developer cycle: shipped skills ->
CLI -> current published docs, separate versioned API references and exact
resource evidence -> scoped operation -> observed results -> next decision.
Package-version API generation and the narrative corpus are separate; the
current captures do not prove automatic CLI-semver matching.

Each chapter has a task, a visible result and a return to the deck. AI produces
a reviewable proposal. Dashboard follows one Madison request through provider
spans, correlated logs and the request counter. Deployment publishes and runs
the same weather app with local Compose, a Linux NativeAOT API/React image and
the authenticated standalone dashboard. The real rehearsal was torn down;
Docker returned to its original two images, 13 volumes, three default networks
and no containers. No cloud resources or production workflows were dispatched.
The [historical reference/image proof](docs/evidence/dashboard-deployment.json)
and [new executed-rehearsal proof](docs/evidence/chapter-demos.json) are separate.

On stage we inspect an **existing** agentic workflow run and PR. We do not dispatch production automation or manufacture a failure/repair segment. The [docs-loop guide](docs/DOCS-LOOP.md) distinguishes the earlier personal post's MCP-first/`llms-small.txt` architecture from the current CLI/`llms-full.txt` surface.

## Publication and notifications

Reviewed pushes to `main` build and publish the deck through GitHub Pages Actions. Pull requests build and exercise the deck but do not deploy production. No scheduled or unattended content refresh changes the talk.

Windows and Linux CI publish/probe the native artifact; the browser gate covers the deck's navigation, assets, readability, accessibility, reduced motion, and print surface.

The separate, **manual-only** [live-link notification workflow](.github/workflows/notify-links.yml) can mention/assign `@IEvangelist` through `github-actions[bot]` after the final verified links are supplied. It is not sent on every deployment. GitHub account notification preferences control email; the workflow cannot guarantee email delivery.

## Reuse and limits

See [NOTICE.md](NOTICE.md) and [licenses/](licenses/). The retained sample is MIT; official artwork is CC0 subject to trademark rights; Poppins uses the SIL Open Font License. Original provider attribution stays in the map UI.

This is a public, unauthenticated local demo, not a production security template. Add appropriate authentication, authorization, rate limiting, provider quota/caching strategy, and operational policies before production use.
