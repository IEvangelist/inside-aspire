# Presenter runbook

**Inside Aspire: The Architecture Behind the AI Loop**

Wisconsin .NET UG, November 17, 2026 at 6pm Central. All 60 minutes are presentation time. Q&A and networking are separate.

Use the prepared app and actual repository in VS Code for the application demo, and a real terminal for CLI decisions and results. The audience deck explains architecture rather than narrating compilation or test checks. Keep the app healthy; inspect the existing PR/run without production dispatch or a failure/repair scenario.

The story has exactly three main points, repeated verbatim on the opening roadmap, chapter entries, and close:

| Main point | Why first | Concrete proof, then supporting machinery |
| --- | --- | --- |
| **Know what's true.** | A confident answer isn't evidence. | Direct docs/API CLI retrieval and an actual returned member; then the separate compiler-derived API pipeline and narrative-doc fetch/cache/parser/ranking |
| **Act precisely.** | Writing code isn't operating a system. | Healthy weather app, scoped readiness/state/telemetry, and real results; then skill/tool definitions, shipped skills, native/managed process model, executable wiring, and the inner loop |
| **Stay current.** | Correct today can be stale tomorrow. | Browser feature value, real PR/run/guide, and explicit maintainer refinement; then the outer context supply loop before workflow/write-policy internals |

NativeAOT, C#, Roslyn, DCP, and gh-aw support these benefits; they are not additional main points. History, the MCP comparison, historical metrics, and sources are optional appendices after the main close.

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

## Know what's true. Direct evidence first (0:04-0:22)

Run these commands early, before the compiler graph or parser excerpts:

```powershell
aspire docs search "Configure tracked browser" --format Json --non-interactive
aspire docs get browser-logs --section "Configure browser logs" --format Json --non-interactive
aspire docs api search WithBrowserLogs --language csharp --format Json --non-interactive
aspire docs api get "csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs" --format Json --non-interactive
```

If you want to inspect the catalog and available section names, use `aspire docs list --format Json --non-interactive` and `aspire docs get browser-logs --format Json --non-interactive`. The verified search returns `browser-logs`, but its best section can be `Add browser logs to a resource`; do not assume that is the requested configuration section.

Show the actual returned content: runtime configuration, browser/profile/user-data options, optional persistence, interaction-service requirement, and immediate apply. Then point to the exact C# member ID and signature. Only API search accepts `--language`; get follows the current returned ID. A zero exit, empty result, or name-only hit is not the payoff.

The `#/api-code` JSON is explicitly selected fields from a recorded public CLI response, not a new live capture. Its renderer excerpt supports the identity just shown. Explain the DLL/XML/available-PDB -> Roslyn -> reference Markdown/API-index machinery afterward at `#/api-index`. Then switch explicitly to narrative docs at `#/index`, `#/parser`, and `#/lexical`: `llms-full.txt`, ETag/fingerprint reuse, fence-aware boundaries, and the narrative index's own lexical weights. Do not attribute those weights to the separate API catalog.

## Act precisely. Healthy app and source (0:22-0:44)

Open the prepared repository in VS Code using the editor's normal folder picker. If its optional CLI is already installed, `code .` opens this workspace; it is not a dependency or an instruction to install/launch the editor automatically.

| Source to show | Exact repository path |
| --- | --- |
| C# application/resource model | `demo\host\apphost.cs` |
| Native API entry point | `demo\Weather.Api\Program.cs` |
| Complete generated JSON coverage | `demo\Weather.Api\WeatherJsonContext.cs` |
| Native publication settings | `demo\Weather.Api\Weather.Api.csproj` |
| Retained React frontend | `demo\frontend\src` |

Choose the editor, app, dashboard, and terminal windows while screen sharing. Native compilation and compatibility verification above must already be complete; they are not audience slides or live build steps.

### Real terminal: exact target and observed results

Run the Aspire CLI directly from the prepared terminal. The exact AppHost launches the already-published native artifact with isolated worktree state and the HTTP launch profile.

```powershell
aspire start --apphost $apphost --isolated --non-interactive --launch-profile http
aspire wait api --apphost $apphost --status healthy --timeout 120 --non-interactive
aspire wait frontend --apphost $apphost --status healthy --timeout 120 --non-interactive
aspire describe --apphost $apphost --format Json --non-interactive
```

Then use the exact `wait`, `describe`, and `otel` commands here to show readiness, returned endpoints, and actual traces/logs. `Start-Demo.ps1` remains an optional preparation convenience; do not run it as well as direct start for the same AppHost. The `#/live-cli` slide contains real CLI commands to copy, not a wrapper or simulated terminal.

The weather demo is the proof, before the process graph and wiring. At `#/skills-vs-tools`, define a skill as file-based workflow guidance and the CLI as executable operations before listing names at `#/skills`. The displayed wait/describe/trace excerpt uses `demo\host\apphost.cs`; its flags were checked against the public 13.6.1 help and existing rehearsal. Invoke the shipped orchestration/monitoring guidance, inspect real results, then explain the native CLI/API, managed AppHost/dashboard, DCP, and explicit resource wiring. End this chapter with the main inner-loop graph at `#/the-loop`.

Use the **returned** native API and frontend URLs. Search for Madison, select a result, inspect current conditions, the eight visible hourly cells, five days, units, map styles, and radar/provider attribution. Open `/openapi.json` and `/reference` on the discovered native API URL.

The native API serves the production React bundle; Vite remains a separate dev resource for HMR. `API_HTTP` and `API_HTTPS` aliases are explicit. Node is not the API runtime. External provider health is visible without making reverse-geocode outages prevent app startup.

For a repeatable live-browser probe, restore the verifier's pinned dependencies only if missing, then pass those discovered URLs:

```powershell
npm ci --prefix demo\verification --registry=https://registry.npmjs.org
node .\demo\verification\browser.mjs --api <returned-api-url> --frontend <returned-frontend-url> --live true
```

The live mode checks actual temperatures and Madison search, waits for loaded map coverage, and captures dark/light native images. It is distinct from deterministic provider fixtures; do not call fixture weather real.

### Show actual telemetry and shipped skills

Invoke the project-local `aspire-orchestration` skill for lifecycle and `aspire-monitoring` for observation. Copilot discovers all seven under `.github/skills`; [the actual named invocation and complete source provenance are recorded](SKILLS.md).

```powershell
aspire otel logs api --apphost $apphost --format Json --non-interactive
aspire otel traces api --apphost $apphost --format Json --non-interactive
aspire otel spans api --apphost $apphost --format Json --non-interactive
```

Show the actual native process, a weather/provider trace, a correlated log, and its meter data in the dashboard. The deterministic native probe also verifies trace/log/metric payloads forwarded unchanged to Aspire and counts accepted metric points.

**Do not rerun local `aspire agent init`.** The released installer configures usage hooks even with `--mcp=false`. The complete unmodified trees were generated on a fresh Actions runner with a separate real profile. This presenter profile was not modified. Optional MCP/browser-log/extra inspection experiments are outside the baseline.

## Stay current. Feature value before provenance (0:44-0:57)

Start with why correct context can become stale, then the browser feature's value at `#/browser-evidence`. The same current configuration guide and exact member were already retrieved in the first chapter; now explain how they became available to the next CLI decision. [Public-safe provenance and exact commands](evidence/browser-logs.json) remain separate from gitignored raw captures.

The real input chain is [product PR 16531](https://github.com/microsoft/aspire/pull/16531) -> [successful existing run 25092695241](https://github.com/microsoft/aspire/actions/runs/25092695241) -> [docs PR 775](https://github.com/microsoft/aspire.dev/pull/775) -> [published browser-logs.md](https://aspire.dev/integrations/devtools/browser-logs.md) -> current CLI retrieval. The product change adds runtime browser configuration, not the initial creation of every browser-logs capability. The bot drafted the guide; [David Fowler's explicit refinement commit](https://github.com/microsoft/aspire.dev/commit/49371cfd913e1c3eec5a058eca745c21679b848d) corrected scope, configuration precedence, naming, and sharing before merge. There are no submitted review records on this docs PR; do not claim three reviews.

Inspect only the existing GitHub run/PR. The run's gh-aw artifacts have expired, so do not reconstruct outcome JSON or imply a new dispatch. The slide uses actual GitHub merged-state fields and the workflow Markdown pinned to the selected run head. If disconnected, label a prior capture as prior evidence rather than claiming a live result.

`WithBrowserLogs` is experimental (`ASPIREBROWSERLOGS001`) in `Aspire.Hosting.Browsers`. It creates a child browser resource whose console stream receives browser diagnostics; screenshots are command artifacts. This is a documented extra capability, **not wired into this weather app**. Do not add the package, enable browser automation, or change the native app merely to tell this story.

The unchanged `Show-DocsLoop.ps1` / `Test-DocsLoop.ps1` helpers are optional pre-talk historical regressions. Their timeout example and old safe-output outcome are not the audience story or required live commands; [the guide](DOCS-LOOP.md) keeps that distinction explicit.

Show [the real C# excerpts](code/) and [source links](SOURCES.md): conditional fetch/cache, fenced H1/H2+ parsing, fingerprint/cached indexing, and weighted lexical ranking. The API reference is separately generated from DLL/XML/PDB source information through a Roslyn canonical model into C# Markdown and its CLI API index.

The docs repo's `doc-writer` and the seven CLI-shipped application skills are distinct. Draft -> human review -> merge -> deploy -> retrieval is the boundary. Shipped skills and retrieved facts inform the next app/product change and reviewed PR. Nothing in this story retrains a model or auto-merges production.

Show the feature value before the PR trail, the maintainer's real refinement before the model of the pipeline, and the `#/docs-supply` outer loop before the `#/workflow` YAML and write-policy details. This is the context supply chain supporting the main CLI inner loop, not a fourth topic.

## Deck and pacing

Open [the published deck](https://ievangelist.github.io/inside-aspire/). **Start presentation** advances to slide 2, `#/thesis`, without skipping the three-point roadmap. The three core chapter entries are `#/know-truth`, `#/act-precisely`, and `#/stay-current`. Useful direct jumps and existing public hashes remain available, including `#/weather`, `#/skills`, `#/the-loop`, `#/live-cli`, and `#/api-index`.

The CLI remains the main inner-loop enabler: current docs/API/state -> precise actions -> runtime evidence -> next grounded decision. The richer browser-configuration PR story supplies context at `#/docs-supply`; it does not turn docs automation into the whole AI loop. The title, exact approved abstract, event, and native facts are unchanged.

| Time | Segment and exact slide order |
| --- | --- |
| 0:00-0:04 | `intro` -> `thesis`: speaker and three-point roadmap |
| 0:04-0:06 | `know-truth`: visible why before the proof |
| 0:06-0:14 | `live-cli` -> `api-code`: direct retrieval, actual content and member response |
| 0:14-0:22 | `api-index` -> `index` -> `parser` -> `lexical`: separate API and narrative-doc machinery |
| 0:22-0:24 | `act-precisely`: visible why before the app demo |
| 0:24-0:32 | `weather`: healthy app, VS Code, real scoped CLI operations and results |
| 0:32-0:44 | `skills-vs-tools` -> `skills` -> `compiler` -> `lifecycle` -> `the-loop`: definitions before names, then process/resource model and inner loop |
| 0:44-0:48 | `stay-current` -> `browser-evidence`: visible why and feature value |
| 0:48-0:53 | `evidence` -> `writer`: real PR/run/guide and explicit maintainer refinement |
| 0:53-0:57 | `docs-supply` -> `workflow`: outer loop before detailed write policy |
| 0:57-1:00 | `close`: Know what's true. Act precisely. Stay current. |

The speaker notes have contiguous, nonoverlapping ranges covering exactly 60 minutes. Stop at the main close. `history`, `historical-evidence`, and `sources` are optional, untimed appendices after it; Q&A and networking take place separately.

The 56px bar uses the unchanged compact Aspire mark and a single prioritized advance group. The menu leads with exactly three benefit chapters; smaller direct demo/appendix jumps remain separate. The chapter indicator follows the current benefit through its supporting slides. Arrow keys advance slides and graph/code steps; `Esc` closes an open menu and restores focus, or opens overview outside it. `R` changes reading mode, `T` changes theme, and `S` opens public-safe notes. Focus a scrollable code region to use its arrow-key scrolling without advancing slides.

Advance the graphs to reveal boxes and their connections together. Paths, arrowheads, and edge labels never point toward still-hidden boxes, including the return leg; there are no faint future guides. The workflow filename/compile/lockfile strip is centered as one compact sequence, while code stays left-aligned.

Phones, narrow windows, and short screens default to natural reading. `?mode=read` and `?mode=present` explicitly choose the mode without conflicting with reveal.js's reserved view option. Real internal links, chapter jumps, and browser history use actual generated page offsets. Reading/print/reduced-motion expose all stages immediately; presentation steps reveal connected graph paths and selected source lines. Print retains the complete graph and code content.

The blog's 82 PRs/44.8-hour median is explicitly historical May 3-June 2, 2026 data, not today's SLA or this example's individual duration. Omit all unannounced versions and release dates.

## Evidence and stop

[Windows/Linux native CI 38025689486](https://github.com/IEvangelist/inside-aspire/actions/runs/38025689486) passed: 50 parity tests, warning-as-error native compilation, Windows 280/Linux 273 native assertions, OpenAPI 3.1.1, rendered Scalar/native/Vite browsers, and actual traces/logs/metrics. The native format and runtime flags prove AOT; they do not establish a startup or memory benchmark.

The separate live-provider rehearsal returned actual Madison weather/geocoding and loaded maps. The deck's native screenshots are labeled captures, not forecasts or fake UI. The deck has 26 slides: 23 in the main presentation and three optional appendices after the close. It retains David's actual public portrait, unchanged GitHub branding, genuine public PR imagery, and the requested GitHub/X/Bluesky/LinkedIn profile links. [Presentation assets and source excerpts](PRESENTATION-ASSETS.md) have explicit provenance.

The build/native-proof/operational-result slides are removed from the audience deck. Their real source and verified evidence stay in this repository and in pre-talk preparation. Old `#/aot` and `#/native-proof` links resolve to `#/compiler`; `#/commands` resolves to `#/live-cli`.

The weather image displays the entire original 1440x1000 capture at a larger proportional footprint, not in a letterboxed wide box. Reading uses the available width. PR images also use their actual aspect ratio. The former `#/timeout` audience link resolves to the browser-evidence explanation at `#/browser-evidence`.

The browser gate checks actual token spans/colors for six displayed languages and all 12 code blocks, rounded inline code, connected cycles, fragments/line focus, notes, accessibility, and read/print/reduced motion. It also checks the identical three points, why/proof/machinery order, early response, separate indexes, full-hour notes, core navigation, and optional appendices. Strict 320/390/768/790/1024/16:9/4:3 and short-screen geometry, 44px controls, Escape focus, aliases, image area, and connector/node bounds remain enforced. Ordinary code wraps without altering copyable text; an explicitly layout-preserving wide line can scroll only its full code body, with the scrollbar at the panel bottom.

```powershell
aspire stop --apphost $apphost --non-interactive
```

Stop only this exact AppHost. Do not use `--force` for ordinary cleanup, kill unrelated processes, or delete locked build output. The native probe stops any AppHost it owns in `finally`.

Reviewed main pushes publish the deck; PRs build without production deployment. The separate manual notification workflow sends one bot-authored mention/assignment only when final verified URLs are supplied. Account preferences control email delivery.

Notification preflight checks links sequentially. Only transient 429/5xx and network failures are retried, at most three attempts per link with a capped wait. A permanent or persistent failure stops before issue creation. The issue POST itself is never retried; verify whether an issue exists before another manual dispatch.

Own-repo `blob/main` file links use GitHub's official contents API to avoid unreliable HTML delivery. The response must be HTTP 200, `type=file`, and contain the exact supplied `html_url`; the notification link stays unchanged. The workflow token is sent only to the fixed `api.github.com` endpoint, with redirects disabled, never to article, event, or site hosts.
