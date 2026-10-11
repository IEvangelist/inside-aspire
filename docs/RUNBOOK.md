# Presenter runbook

**Inside Aspire: The Architecture Behind the AI Loop**

Wisconsin .NET UG, November 17, 2026 at 6pm Central. A 60-minute speaker slot includes questions.

Use the prepared app and actual repository in VS Code for the application demo, and a real terminal for CLI decisions and results. The audience deck explains architecture rather than narrating compilation or test checks. Keep the app healthy; inspect the existing PR/run without production dispatch or a failure/repair scenario.

## Pre-talk preparation only

Use PowerShell 7, a released .NET 10 SDK, and Node 22.12+ (or 20.19+) on Windows/Linux x64. Windows needs existing Visual Studio C++ x64 tools and a Windows SDK. Linux needs clang and zlib development headers. The publish script checks these and does not install global tools.

```powershell
$aspire = & .\scripts\Install-Aspire.ps1
$env:PATH = (Split-Path $aspire) + [IO.Path]::PathSeparator + $env:PATH
$apphost = Join-Path $PWD 'demo\host\apphost.cs'
pwsh -NoProfile -File .\scripts\Publish-Native.ps1
pwsh -NoProfile -File .\scripts\Test-Native.ps1
pwsh -NoProfile -File .\scripts\Verify-Skills.ps1
pwsh -NoProfile -File .\scripts\Test-DocsLoop.ps1
```

The installer verifies a pinned public release archive digest in gitignored `.tools`. It never replaces the presenter's global CLI. Publishing compiles the React bundle, native API, and native provider fixture into `demo/.artifacts/native/<rid>`. A missing artifact produces an explicit prep error; there is no managed API fallback.

The PATH change above belongs only to this terminal process, so bare `aspire` resolves the prepared public 13.6.1 executable instead of any global prerelease. Confirm `aspire --version` before screen sharing. Preparation scripts are optional automation before the talk; no `.ps1` entry point is required on stage. The unchanged docs test retains its historical timeout regression, not the new audience feature story.

Native compilation is preparation, not AppHost lifecycle. The Windows script runs `vcvars64.bat` and the compiler in the same process. Keep the publish step off the presentation clock.

All raw captures, telemetry, downloaded gh-aw usage, browser screenshots, and private configuration stay gitignored. Do not commit them or expose dashboard login tokens on public slides.

## Live app and source in VS Code

Open the prepared repository in VS Code using the editor's normal folder picker. If its optional CLI is already installed, `code .` opens this workspace; it is not a dependency or an instruction to install/launch the editor automatically.

| Source to show | Exact repository path |
| --- | --- |
| C# application/resource model | `demo\host\apphost.cs` |
| Native API entry point | `demo\Weather.Api\Program.cs` |
| Complete generated JSON coverage | `demo\Weather.Api\WeatherJsonContext.cs` |
| Native publication settings | `demo\Weather.Api\Weather.Api.csproj` |
| Retained React frontend | `demo\frontend\src` |

Choose the editor, app, dashboard, and terminal windows while screen sharing. Native compilation and compatibility verification above must already be complete; they are not audience slides or live build steps.

## Real terminal: exact target and observed results

Run the Aspire CLI directly from the prepared terminal. The exact AppHost launches the already-published native artifact with isolated worktree state and the HTTP launch profile.

```powershell
aspire start --apphost $apphost --isolated --non-interactive --launch-profile http
aspire wait api --apphost $apphost --status healthy --timeout 120 --non-interactive
aspire wait frontend --apphost $apphost --status healthy --timeout 120 --non-interactive
aspire describe --apphost $apphost --format Json --non-interactive
```

Then use the exact `wait`, `describe`, and `otel` commands here to show readiness, returned endpoints, and actual traces/logs. `Start-Demo.ps1` remains an optional preparation convenience; do not run it as well as direct start for the same AppHost. The `#/live-cli` slide contains real CLI commands to copy, not a wrapper or simulated terminal.

Use the **returned** native API and frontend URLs. Search for Madison, select a result, inspect current conditions, the eight visible hourly cells, five days, units, map styles, and radar/provider attribution. Open `/openapi.json` and `/reference` on the discovered native API URL.

The native API serves the production React bundle; Vite remains a separate dev resource for HMR. `API_HTTP` and `API_HTTPS` aliases are explicit. Node is not the API runtime. External provider health is visible without making reverse-geocode outages prevent app startup.

For a repeatable live-browser probe, restore the verifier's pinned dependencies only if missing, then pass those discovered URLs:

```powershell
npm ci --prefix demo\verification --registry=https://registry.npmjs.org
node .\demo\verification\browser.mjs --api <returned-api-url> --frontend <returned-frontend-url> --live true
```

The live mode checks actual temperatures and Madison search, waits for loaded map coverage, and captures dark/light native images. It is distinct from deterministic provider fixtures; do not call fixture weather real.

## Show actual telemetry and shipped skills

Invoke the project-local `aspire-orchestration` skill for lifecycle and `aspire-monitoring` for observation. Copilot discovers all seven under `.github/skills`; [the actual named invocation and complete source provenance are recorded](SKILLS.md).

```powershell
aspire otel logs api --apphost $apphost --format Json --non-interactive
aspire otel traces api --apphost $apphost --format Json --non-interactive
aspire otel spans api --apphost $apphost --format Json --non-interactive
```

Show the actual native process, a weather/provider trace, a correlated log, and its meter data in the dashboard. The deterministic native probe also verifies trace/log/metric payloads forwarded unchanged to Aspire and counts accepted metric points.

**Do not rerun local `aspire agent init`.** The released installer configures usage hooks even with `--mcp=false`. The complete unmodified trees were generated on a fresh Actions runner with a separate real profile. This presenter profile was not modified. Optional MCP/browser-log/extra inspection experiments are outside the baseline.

## Direct CLI: the browser-evidence docs and exact API

```powershell
aspire docs list --format Json --non-interactive
aspire docs search "Configure tracked browser" --format Json --non-interactive
aspire docs get browser-logs --format Json --non-interactive
aspire docs get browser-logs --section "Configure browser logs" --format Json --non-interactive
aspire docs api search WithBrowserLogs --language csharp --format Json --non-interactive
aspire docs api get "csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs" --format Json --non-interactive
```

These commands were executed with the public CLI. Search returns the real `browser-logs` slug; its best search section may be `Add browser logs to a resource`. Read the full document's `sections` before selecting `Configure browser logs`. The selected content explains the runtime dialog, browser/profile/user-data options, immediate application, interaction-service requirement, and optional user-secret persistence. Do not assume the search result's section is the one you want.

API search returns the shown C# member ID and signature. Only search accepts `--language`; get follows the actual returned ID and must contain its member reference, experimental diagnostic, parameters, and CDP/browser evidence remarks. An empty result or name-only hit is not proof. [Public-safe provenance and exact commands](evidence/browser-logs.json) are recorded separately from gitignored raw captures.

The real input chain is [product PR 16531](https://github.com/microsoft/aspire/pull/16531) -> [successful existing run 25092695241](https://github.com/microsoft/aspire/actions/runs/25092695241) -> [docs PR 775](https://github.com/microsoft/aspire.dev/pull/775) -> [published browser-logs.md](https://aspire.dev/integrations/devtools/browser-logs.md) -> current CLI retrieval. The product change adds runtime browser configuration, not the initial creation of every browser-logs capability. The bot drafted the guide; [David Fowler's explicit refinement commit](https://github.com/microsoft/aspire.dev/commit/49371cfd913e1c3eec5a058eca745c21679b848d) corrected scope, configuration precedence, naming, and sharing before merge. There are no submitted review records on this docs PR; do not claim three reviews.

Inspect only the existing GitHub run/PR. The run's gh-aw artifacts have expired, so do not reconstruct outcome JSON or imply a new dispatch. The slide uses actual GitHub merged-state fields and the workflow Markdown pinned to the selected run head. If disconnected, label a prior capture as prior evidence rather than claiming a live result.

`WithBrowserLogs` is experimental (`ASPIREBROWSERLOGS001`) in `Aspire.Hosting.Browsers`. It creates a child browser resource whose console stream receives browser diagnostics; screenshots are command artifacts. This is a documented extra capability, **not wired into this weather app**. Do not add the package, enable browser automation, or change the native app merely to tell this story.

The unchanged `Show-DocsLoop.ps1` / `Test-DocsLoop.ps1` helpers are optional pre-talk historical regressions. Their timeout example and old safe-output outcome are not the audience story or required live commands; [the guide](DOCS-LOOP.md) keeps that distinction explicit.

Show [the real C# excerpts](code/) and [source links](SOURCES.md): conditional fetch/cache, fenced H1/H2+ parsing, fingerprint/cached indexing, and weighted lexical ranking. The API reference is separately generated from DLL/XML/PDB source information through a Roslyn canonical model into C# Markdown and its CLI API index.

The docs repo's `doc-writer` and the seven CLI-shipped application skills are distinct. Draft -> human review -> merge -> deploy -> retrieval is the boundary. Shipped skills and retrieved facts inform the next app/product change and reviewed PR. Nothing in this story retrains a model or auto-merges production.

## Deck and pacing

Open [the published deck](https://ievangelist.github.io/inside-aspire/). **Start presentation** advances to slide 2, `#/thesis`, without skipping it. Direct chapter links remain available: `#/weather`, `#/skills`, `#/the-loop`, `#/live-cli`, and `#/api-index`.

The CLI remains the main inner-loop enabler: current docs/API/state -> precise actions -> runtime evidence -> next grounded decision. The richer browser-configuration PR story supplies context at `#/docs-supply`; it does not turn docs automation into the whole AI loop. The title, exact approved abstract, event, and native facts are unchanged.

| Time | Segment |
| --- | --- |
| 0:00-0:05 | Speaker introduction and CLI-first payoff |
| 0:05-0:10 | Draw the main skills/CLI/resources/evidence inner loop |
| 0:10-0:23 | Prepared app/VS Code source and real CLI lifecycle/telemetry |
| 0:23-0:28 | Shipped skills and the skill/tool/MCP distinction |
| 0:28-0:38 | Browser-configuration PR/run/guide, safe outputs, explicit maintainer refinement |
| 0:38-0:44 | Actual C# parser and cached lexical index |
| 0:44-0:54 | Real terminal docs retrieval and separate C# API lookup |
| 0:54-1:00 | Historical context, close, and questions |

The 56px bar uses the unchanged compact Aspire mark and a single prioritized advance group. The menu contains chapter navigation, reading mode, theme, overview, notes, and print. Arrow keys advance slides and graph/code steps; `Esc` closes an open menu and restores focus, or opens overview outside it. `R` changes reading mode, `T` changes theme, and `S` opens public-safe notes. Focus a scrollable code region to use its arrow-key scrolling without advancing slides.

Advance the graphs to reveal boxes and their connections together. Paths, arrowheads, and edge labels never point toward still-hidden boxes, including the return leg; there are no faint future guides. The workflow filename/compile/lockfile strip is centered as one compact sequence, while code stays left-aligned.

Phones, narrow windows, and short screens default to natural reading. `?mode=read` and `?mode=present` explicitly choose the mode without conflicting with reveal.js's reserved view option. Real internal links, chapter jumps, and browser history use actual generated page offsets. Reading/print/reduced-motion expose all stages immediately; presentation steps reveal connected graph paths and selected source lines. Print retains the complete graph and code content.

The blog's 82 PRs/44.8-hour median is explicitly historical May 3-June 2, 2026 data, not today's SLA or this example's individual duration. Omit all unannounced versions and release dates.

## Evidence and stop

[Windows/Linux native CI 38025689486](https://github.com/IEvangelist/inside-aspire/actions/runs/38025689486) passed: 50 parity tests, warning-as-error native compilation, Windows 280/Linux 273 native assertions, OpenAPI 3.1.1, rendered Scalar/native/Vite browsers, and actual traces/logs/metrics. The native format and runtime flags prove AOT; they do not establish a startup or memory benchmark.

The separate live-provider rehearsal returned actual Madison weather/geocoding and loaded maps. The deck's native screenshots are labeled captures, not forecasts or fake UI. The lean 23-slide deck contains David's actual public portrait, unchanged GitHub branding, genuine public PR imagery, and the requested GitHub/X/Bluesky/LinkedIn profile links. [Presentation assets and source excerpts](PRESENTATION-ASSETS.md) have explicit provenance.

The build/native-proof/operational-result slides are removed from the audience deck. Their real source and verified evidence stay in this repository and in pre-talk preparation. Old `#/aot` and `#/native-proof` links resolve to `#/compiler`; `#/commands` resolves to `#/live-cli`.

The weather image displays the entire original 1440x1000 capture at a larger proportional footprint, not in a letterboxed wide box. Reading uses the available width. PR images also use their actual aspect ratio. The former `#/timeout` audience link resolves to the browser-evidence explanation at `#/browser-evidence`.

The browser gate checks actual token spans/colors for the six remaining displayed languages, all 11 code blocks, rounded inline code, connected cycles, fragments/line focus, notes, accessibility, and read/print/reduced motion. It checks 320/390/768/790/1024/16:9/4:3 and short screens, actual pointer links, 44px controls, Escape focus, and removed-anchor aliases. Ordinary code wraps without altering copyable text; an explicitly layout-preserving wide line can scroll only its full code body, with the scrollbar at the panel bottom.

```powershell
aspire stop --apphost $apphost --non-interactive
```

Stop only this exact AppHost. Do not use `--force` for ordinary cleanup, kill unrelated processes, or delete locked build output. The native probe stops any AppHost it owns in `finally`.

Reviewed main pushes publish the deck; PRs build without production deployment. The separate manual notification workflow sends one bot-authored mention/assignment only when final verified URLs are supplied. Account preferences control email delivery.

Notification preflight checks links sequentially. Only transient 429/5xx and network failures are retried, at most three attempts per link with a capped wait. A permanent or persistent failure stops before issue creation. The issue POST itself is never retried; verify whether an issue exists before another manual dispatch.

Own-repo `blob/main` file links use GitHub's official contents API to avoid unreliable HTML delivery. The response must be HTTP 200, `type=file`, and contain the exact supplied `html_url`; the notification link stays unchanged. The workflow token is sent only to the fixed `api.github.com` endpoint, with redirects disabled, never to article, event, or site hosts.
