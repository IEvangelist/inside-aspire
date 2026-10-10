# Inside Aspire: The Architecture Behind the AI Loop

The public talk repository for Wisconsin .NET UG, November 17, 2026 at 6pm Central. The 60-minute session follows a healthy NativeAOT weather app and a real, human-reviewed documentation loop.

**[Open the live deck](https://ievangelist.github.io/inside-aspire/)** | [Presenter runbook](docs/RUNBOOK.md) | [Public abstract](docs/ABSTRACT.md) | [Source pins](docs/SOURCES.md)

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

# Compile the browser bundle and the actual NativeAOT API before presenting.
pwsh .\scripts\Publish-Native.ps1
pwsh .\scripts\Test-Native.ps1

# Aspire owns AppHost lifecycle, readiness, and endpoint discovery.
pwsh .\scripts\Start-Demo.ps1

# Inspect the real existing PR/run/docs chain and current docs/API indexes.
pwsh .\scripts\Show-DocsLoop.ps1
```

The shipped skills are already prepared. **Do not run `aspire agent init` on the presenter's profile just to rehearse.** The released installer configures usage hooks even with MCP disabled; [the preparation workflow uses an ephemeral runner](docs/SKILLS.md).

## Rehearse the deck

```powershell
npm ci --prefix deck --registry=https://registry.npmjs.org
npm run build --prefix deck
node .\deck\node_modules\vite\bin\vite.js preview deck --host 127.0.0.1 --port 4180 --strictPort
```

Open the exact URL printed by Vite, including `/inside-aspire/`. Arrow keys present; `Esc` opens overview; `R` switches reading mode; `T` switches theme; `S` opens speaker notes. Chapter links and slide IDs are stable. Phones default to scrolling. The Print control opens reveal.js's printable view. Reduced motion and light/dark modes are supported.

## The actual AI loop

The canonical trail is [microsoft/aspire#19478](https://github.com/microsoft/aspire/pull/19478) -> [successful existing run 33887017276](https://github.com/microsoft/aspire/actions/runs/33887017276) -> [microsoft/aspire.dev#1619](https://github.com/microsoft/aspire.dev/pull/1619) -> [published aspire-start.md](https://aspire.dev/reference/cli/commands/aspire-start.md).

The rehearsal follows returned document slugs, sections, and C# API member IDs. It asserts the current `ASPIRE_CLI_START_TIMEOUT` clarification excluding AppHost preparation, including restore and build. Exit code zero with invalid JSON, empty results, or missing prose is failure.

This is a published Markdown corpus consumed by a real C# fetcher/parser/index and the CLI. It is not a custom parser recreation, vector database, training step, or instant self-learning. The docs draft crosses human review, merge, and deployment before entering the retrievable corpus. Application skills, the docs repo's `doc-writer`, CLI tools, and MCP are distinct.

On stage we inspect an **existing** agentic workflow run and PR. We do not dispatch production automation or manufacture a failure/repair segment. The [docs-loop guide](docs/DOCS-LOOP.md) distinguishes the earlier personal post's MCP-first/`llms-small.txt` architecture from the current CLI/`llms-full.txt` surface.

## Publication and notifications

Reviewed pushes to `main` build and publish the deck through GitHub Pages Actions. Pull requests build and exercise the deck but do not deploy production. No scheduled or unattended content refresh changes the talk.

Windows and Linux CI publish/probe the native artifact; the browser gate covers the deck's navigation, assets, readability, accessibility, reduced motion, and print surface.

The separate, **manual-only** [live-link notification workflow](.github/workflows/notify-links.yml) can mention/assign `@IEvangelist` through `github-actions[bot]` after the final verified links are supplied. It is not sent on every deployment. GitHub account notification preferences control email; the workflow cannot guarantee email delivery.

## Reuse and limits

See [NOTICE.md](NOTICE.md) and [licenses/](licenses/). The retained sample is MIT; official artwork is CC0 subject to trademark rights; Poppins uses the SIL Open Font License. Original provider attribution stays in the map UI.

This is a public, unauthenticated local demo, not a production security template. Add appropriate authentication, authorization, rate limiting, provider quota/caching strategy, and operational policies before production use.
