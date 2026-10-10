# Presenter runbook

**Inside Aspire: The Architecture Behind the AI Loop**

Wisconsin .NET UG, November 17, 2026 at 6pm Central. A 60-minute speaker slot includes questions.

The terminal is the main docs-loop proof. Keep the weather app healthy. Inspect the existing PR/run; do not dispatch production automation or improvise a failure/repair story.

## Before rehearsal

Use PowerShell 7, a released .NET 10 SDK, and Node 22.12+ (or 20.19+) on Windows/Linux x64. Windows needs existing Visual Studio C++ x64 tools and a Windows SDK. Linux needs clang and zlib development headers. The publish script checks these and does not install global tools.

```powershell
$aspire = & .\scripts\Install-Aspire.ps1
$apphost = Join-Path $PWD 'demo\host\apphost.cs'
pwsh -NoProfile -File .\scripts\Publish-Native.ps1
pwsh -NoProfile -File .\scripts\Test-Native.ps1
pwsh -NoProfile -File .\scripts\Verify-Skills.ps1
pwsh -NoProfile -File .\scripts\Test-DocsLoop.ps1
```

The installer verifies a pinned public release archive digest in gitignored `.tools`. It never replaces the presenter's global CLI. Publishing compiles the React bundle, native API, and native provider fixture into `demo/.artifacts/native/<rid>`. A missing artifact produces an explicit prep error; there is no managed API fallback.

Native compilation is preparation, not AppHost lifecycle. The Windows script runs `vcvars64.bat` and the compiler in the same process. Keep the publish step off the presentation clock.

All raw captures, telemetry, downloaded gh-aw usage, browser screenshots, and private configuration stay gitignored. Do not commit them or expose dashboard login tokens on public slides.

## Run the real app

```powershell
pwsh -NoProfile -File .\scripts\Start-Demo.ps1
& $aspire wait api --apphost $apphost --status healthy --timeout 120 --non-interactive
& $aspire wait frontend --apphost $apphost --status healthy --timeout 120 --non-interactive
& $aspire describe --apphost $apphost --format Json --non-interactive
```

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
& $aspire otel logs api --apphost $apphost --format Json --non-interactive
& $aspire otel traces api --apphost $apphost --format Json --non-interactive
& $aspire otel spans api --apphost $apphost --format Json --non-interactive
```

Show the actual native process, a weather/provider trace, a correlated log, and its meter data in the dashboard. The deterministic native probe also verifies trace/log/metric payloads forwarded unchanged to Aspire and counts accepted metric points.

**Do not rerun local `aspire agent init`.** The released installer configures usage hooks even with `--mcp=false`. The complete unmodified trees were generated on a fresh Actions runner with a separate real profile. This presenter profile was not modified. Optional MCP/browser-log/extra inspection experiments are outside the baseline.

## Run the real docs proof

```powershell
pwsh -NoProfile -File .\scripts\Show-DocsLoop.ps1
```

The [guide](DOCS-LOOP.md) documents all exact public-baseline JSON shapes and the existing gh-aw outcome. Follow the returned slug, section, and C# member ID. The script checks merged product/docs PRs, successful existing run 33887017276, the primary accepted docs-PR outcome, and fresh published Markdown/corpus.

The exact `ASPIRE_CLI_START_TIMEOUT` preparation/restore/build exclusion must appear in retrieved content. A name-only search hit is insufficient. Exit zero with no results, invalid JSON, empty content, or absent prose is failure.

`-SkipGitHub` skips the historical GitHub chain **only**; it still requires live CLI and public HTTP content. It is not offline replay. If disconnected, explicitly label a prior gitignored rehearsal capture as prior evidence and do not claim a live result.

Show [the real C# excerpts](code/) and [source links](SOURCES.md): conditional fetch/cache, fenced H1/H2+ parsing, fingerprint/cached indexing, and weighted lexical ranking. The API reference is separately generated from DLL/XML/PDB source information through a Roslyn canonical model into C# Markdown and its CLI API index.

The docs repo's `doc-writer` and the seven CLI-shipped application skills are distinct. Draft -> human review -> merge -> deploy -> retrieval is the boundary. Shipped skills and retrieved facts inform the next app/product change and reviewed PR. Nothing in this story retrains a model or auto-merges production.

## Deck and pacing

Open [the published deck](https://ievangelist.github.io/inside-aspire/). Stable chapter links: `#/weather`, `#/skills`, `#/the-loop`, `#/live-cli`, and `#/api-index`.

| Time | Segment |
| --- | --- |
| 0:00-0:05 | Frame the inspectable loop |
| 0:05-0:20 | Healthy native app, compiler/artifact, API/browser/telemetry |
| 0:20-0:26 | Shipped skills and the skill/tool/MCP distinction |
| 0:26-0:38 | Real PR/run/docs trail, safe outputs, human review |
| 0:38-0:44 | Actual C# parser, cached lexical index |
| 0:44-0:54 | Live CLI docs and separate C# API-reference proof |
| 0:54-1:00 | Historical context, close, and questions |

Arrow keys navigate, `Esc` opens overview, `R` switches reading mode, `T` changes theme, and `S` opens public-safe speaker notes. Phones default to natural scrolling. Print opens reveal.js's print view. The UI honors reduced motion.

The blog's 82 PRs/44.8-hour median is explicitly historical May 3-June 2, 2026 data, not today's SLA or this example's individual duration. Omit all unannounced versions and release dates.

## Evidence and stop

[Windows/Linux native CI 38025689486](https://github.com/IEvangelist/inside-aspire/actions/runs/38025689486) passed: 50 parity tests, warning-as-error native compilation, Windows 280/Linux 273 native assertions, OpenAPI 3.1.1, rendered Scalar/native/Vite browsers, and actual traces/logs/metrics. The native format and runtime flags prove AOT; they do not establish a startup or memory benchmark.

The separate live-provider rehearsal returned actual Madison weather/geocoding and loaded maps. The deck's native screenshots are labeled captures, not forecasts or fake UI. The deck browser gate covers all 23 slides, desktop bounds, mobile heading/overflow, accessibility, deep links, themes, print, and reduced motion.

```powershell
& $aspire stop --apphost $apphost --non-interactive
```

Stop only this exact AppHost. Do not use `--force` for ordinary cleanup, kill unrelated processes, or delete locked build output. The native probe stops any AppHost it owns in `finally`.

Reviewed main pushes publish the deck; PRs build without production deployment. The separate manual notification workflow sends one bot-authored mention/assignment only when final verified URLs are supplied. Account preferences control email delivery.

Notification preflight checks links sequentially. Only transient 429/5xx and network failures are retried, at most three attempts per link with a capped wait. A permanent or persistent failure stops before issue creation. The issue POST itself is never retried; verify whether an issue exists before another manual dispatch.

Own-repo `blob/main` file links use GitHub's official contents API to avoid unreliable HTML delivery. The response must be HTTP 200, `type=file`, and contain the exact supplied `html_url`; the notification link stays unchanged. The workflow token is sent only to the fixed `api.github.com` endpoint, with redirects disabled, never to article, event, or site hosts.
