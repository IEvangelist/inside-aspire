# Inside Aspire: The Architecture Behind the AI Loop

The public talk repository for Wisconsin .NET UG, November 17, 2026 at 6pm Central. All 60 minutes are presentation time; Q&A and networking are separate.

**[Open the live deck](https://ievangelist.github.io/inside-aspire/)** | [Presenter runbook](docs/RUNBOOK.md) | [Public abstract](docs/ABSTRACT.md) | [Source pins](docs/SOURCES.md)

**Aspire makes AI more efficient.** The talk drives home three benefits: **Know what's true. Act precisely. Stay current.** Each chapter starts with why it matters, proves it through direct CLI/app or reviewed-doc evidence, then explains the machinery. The opening action reaches the three-point roadmap; optional history, metrics, and sources follow the main close.

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

The deck has 32 slides: 29 in the main presentation, then three optional appendices. The menu's core links are `#/know-truth`, `#/act-precisely`, and `#/stay-current`; useful direct demos and existing hashes remain available. One-command/result **Recorded CLI run** surfaces appear before the supporting machinery. Next gives a short replay cue and expands the genuine captured response; Back restores it. This is static-site playback, not live browser execution or a latency benchmark. [Capture proof and controls](docs/CLI-REPLAY.md) link complete public output. Reading/print/reduced-motion expose the pairs immediately. Skill/tool definitions precede the shipped-skill names, and the outer docs supply graph precedes detailed workflow policy.

## The actual AI loop

The supporting trail is [microsoft/aspire#16531](https://github.com/microsoft/aspire/pull/16531), adding tracked-browser runtime configuration -> [successful existing run 25092695241](https://github.com/microsoft/aspire/actions/runs/25092695241) -> [bot-generated, maintainer-refined microsoft/aspire.dev#775](https://github.com/microsoft/aspire.dev/pull/775) -> [published browser-logs.md](https://aspire.dev/integrations/devtools/browser-logs.md).

The direct CLI demonstration follows returned document slugs, sections, and the exact `WithBrowserLogs` C# member ID. The guide explains runtime configuration, child-resource browser diagnostics, and screenshot artifacts. That API is an experimental documented extra, not wired into the unchanged weather app. The existing timeout scripts remain optional historical regressions rather than the audience story. Exit code zero with empty results or missing semantic content is not proof.

This is a published Markdown corpus consumed by a real C# fetcher/parser/index and the CLI. It is not a custom parser recreation, vector database, training step, or instant self-learning. The docs draft crosses human review, merge, and deployment before entering the retrievable corpus. Application skills, the docs repo's `doc-writer`, CLI tools, and MCP are distinct.

On stage we inspect an **existing** agentic workflow run and PR. We do not dispatch production automation or manufacture a failure/repair segment. The [docs-loop guide](docs/DOCS-LOOP.md) distinguishes the earlier personal post's MCP-first/`llms-small.txt` architecture from the current CLI/`llms-full.txt` surface.

## Publication and notifications

Reviewed pushes to `main` build and publish the deck through GitHub Pages Actions. Pull requests build and exercise the deck but do not deploy production. No scheduled or unattended content refresh changes the talk.

Windows and Linux CI publish/probe the native artifact; the browser gate covers the deck's navigation, assets, readability, accessibility, reduced motion, and print surface.

The separate, **manual-only** [live-link notification workflow](.github/workflows/notify-links.yml) can mention/assign `@IEvangelist` through `github-actions[bot]` after the final verified links are supplied. It is not sent on every deployment. GitHub account notification preferences control email; the workflow cannot guarantee email delivery.

## Reuse and limits

See [NOTICE.md](NOTICE.md) and [licenses/](licenses/). The retained sample is MIT; official artwork is CC0 subject to trademark rights; Poppins uses the SIL Open Font License. Original provider attribution stays in the map UI.

This is a public, unauthenticated local demo, not a production security template. Add appropriate authentication, authorization, rate limiting, provider quota/caching strategy, and operational policies before production use.
