# Presenter runbook

**Inside Aspire: The Architecture Behind the AI Loop**

Wisconsin .NET UG, November 17, 2026 at 6pm Central. All 60 minutes are presentation time. Q&A and networking are separate.

Use the prepared app and actual repository in VS Code for the application demo, and a real terminal for CLI decisions and results. The audience deck explains architecture rather than narrating compilation or test checks. Keep the app healthy; inspect the existing PR/run without production dispatch or a failure/repair scenario.

The opening starts with the older Aspire assistants learned, then introduces three questions the talk will answer:

| Main point | Why first | Concrete proof, then supporting machinery |
| --- | --- | --- |
| **AI loops** | Propose browser logging without guessing the API. | Invoke `aspireify`, retrieve the guide and exact member, read Markdown, inspect a proposal without applying it. Return after `api-member`. |
| **Aspire dashboard** | Explain one Madison forecast request. | Select Madison in the healthy app, find that API trace and both providers, filter its logs, select the weather counter. Return at `dashboard-signals`. |
| **Aspire deployment** | Run the same app without the development AppHost. | Inspect publish-only packaging, publish the real YAML, deploy local Compose and request Madison again. Return at `deployment-boundaries`. |

Open each chapter with its definition and visual model. The AI opener
shows three feedback-loop examples: product development, feature-driven
documentation updates, and application development/debugging with Aspire.
The dashboard joins resource state with
request traces, correlated logs and aggregate metrics. Deployment uses
one application model for local processes and a target's deployment
pipeline. The practical tasks in the table follow those definitions.

The 43-slide deck has 40 timed main slides and three untimed appendices.
Opening/setup/roadmap use 0:00-0:05; AI loops 0:05-0:37; dashboard 0:37-0:46;
deployment 0:46-0:58; takeaways 0:58-0:59; close 0:59-1:00. NativeAOT, C#, Roslyn, DCP and
gh-aw support these areas, not extra chapters. The former benefit phrases
remain supporting ideas. History/MCP, historical metrics and sources follow
the close only when relevant.

The deck now includes presenter-controlled **Recorded CLI run** surfaces. They
replay genuine captured command results, not browser execution. One command
stays anchored on ordinary slides while Next expands its complete captured
stdout in one bounded output-only scroller; the following Next proceeds to the next related command.
Back restores/collapses correctly. Use the [capture proof](CLI-REPLAY.md) and
[public-safe fixtures](evidence/cli-replay.json); the animation is not a latency
benchmark. Reading, print, and reduced motion show recorded commands/results
immediately. The deck has nine recorded surfaces: four JSON discovery/runtime
responses, two default-output responses, wait and two genuine Compose runs.
The original seven 13.6.1 capture files remain unchanged. The displayed guide
and member now use November 6 default-output captures; the November 5
publish/deploy recordings are retained. There is no
visible replay status row. [New capture and cleanup proof](evidence/chapter-demos.json)
is separate from the historical inventory.

Audience slides do not display the verification footers. Each affected
slide's speaker notes has a **Sources and recording details** section with
the original links, dates, versions and context. The sources appendix and
repository retain the complete evidence. The short Recorded CLI run label
stays visible on every recorded terminal.

The seven long responses (`live-cli`, `docs-section`, `api-member`,
`runtime-state`, `runtime-traces`, `deployment-publish`, `deployment-deploy`) use opt-in terminal focus: revealing output
reclaims the title and marked supporting-copy space for a taller, viewport-safe
terminal. Header, command, and Copy stay available; only the output scrolls.
Back restores the title, supporting copy and original geometry. Native Notes
mirrors the fragment; source details remain in notes and the appendix. See
[the exact authoring attribute and static-mode contract](CLI-REPLAY.md#authoring-terminal-focus).

## Pre-talk preparation only

Use PowerShell 7, a released .NET 10 SDK, and Node 22.12+ (or 20.19+) on Windows/Linux x64. Windows needs existing Visual Studio C++ x64 tools and a Windows SDK. Linux needs clang and zlib development headers. The publish script checks these and does not install global tools.

### Public CLI 13.6.4

The AppHost uses the public 13.6.4 CLI/SDK/integrations; its package graph
includes patched MessagePack 2.5.307. No audit or warning policy is suppressed.
Old recordings and official skill trees retain their original 13.6.1 provenance.

Install the checksum-pinned CLI side-by-side with the historical 13.6.1 CLI:

```powershell
$aspire = & .\scripts\Install-Aspire.ps1 -Version '13.6.4'
& $aspire --version
$env:PATH = (Split-Path $aspire) + [IO.Path]::PathSeparator + $env:PATH
$env:ASPIRE_HOME = Join-Path $PWD '.artifacts\chapter-demos\aspire-home-13.6.4'
$apphost = Join-Path $PWD 'demo\host\apphost.cs'
pwsh -NoProfile -File .\scripts\Publish-Native.ps1
pwsh -NoProfile -File .\scripts\Verify-Skills.ps1
```

The side-by-side archive is checksum-verified in gitignored `.tools`; it never
replaces the global CLI or writes agent profile hooks. `Publish-Native.ps1`
compiles React, the native API and the native fixture into
`demo/.artifacts/native/<rid>`. A missing development artifact still fails.
Publish mode instead compiles the Linux native image from source; neither path
falls back to a managed API.

PATH and `ASPIRE_HOME` above belong only to this terminal. Confirm public
13.6.4 before screen sharing. No `.ps1` entry point is required on stage.
The docs test retains its historical timeout regression and original
13.6.1 gate; it is not the new audience feature story.

Native compilation is preparation, not AppHost lifecycle. The Windows script runs `vcvars64.bat` and the compiler in the same process. Keep the publish step off the presentation clock.

All raw captures, telemetry, downloaded gh-aw usage, browser screenshots, and private configuration stay gitignored. Do not commit them or expose dashboard login tokens on public slides.

## AI loops: read the answer, then follow the page (0:05-0:37)

**Task:** propose browser logging for the healthy weather frontend, without
changing it. **Entry:** `ai-loops`, then meet the app at `weather` (0:07-0:08)
before the browser-logs question at `browser-evidence` (0:08-0:09). In Copilot, ask:

> Use the shipped aspireify skill to propose browser logging for this Vite
> frontend. Read current docs and the exact C# API. Do not edit files or install
> packages. Call out the package and the experimental diagnostic.

Warm the exact public member scope in preparation, not by an unscoped cold
member crawl:

```powershell
aspire docs api list csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods --format Json --non-interactive
```

Then show the commands. Search stays JSON for machine-readable slugs/IDs;
get returns the Markdown content by default, rendered for reading:

```powershell
aspire docs search "Configure tracked browser" --format Json --non-interactive
aspire docs get browser-logs --section "Configure browser logs" --non-interactive
aspire docs api search WithBrowserLogs --language csharp --format Json --non-interactive
aspire docs api get "csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs" --non-interactive
```

Use the plain get commands in the demo. Their default output is the Markdown
content, ready for an assistant to read; add `--format Json` for the structured
record with the same content. In these redirected captures the CLI renders
the Markdown as text. The November 6 recordings contain the complete output,
including the initial Loading message. Original JSON captures are unchanged.

**Visible result:** a reviewable proposal to add `Aspire.Hosting.Browsers` and
`WithBrowserLogs()` on the frontend, with `ASPIREBROWSERLOGS001` explicitly
acknowledged. Do not install/apply it in this demo. **Exit:** return after
`api-member`; `api-code` explains its address, then follow the guide back to
the product/docs PR and human refinement. The takeaway is checked API facts,
not automatic permission to change the app.

If you want to inspect the catalog and available section names, use `aspire docs list --format Json --non-interactive` and `aspire docs get browser-logs --format Json --non-interactive`. The verified search returns `browser-logs`, but its best section can be `Add browser logs to a resource`; do not assume that is the requested configuration section.

Show the actual returned content: runtime configuration, browser/profile/user-data options, optional persistence, interaction-service requirement, and immediate apply. Then point to the exact C# member ID and signature. Only API search accepts `--language`; get follows the current returned ID. A zero exit, empty result, or name-only hit is not the payoff.

The four recorded surfaces are `live-cli` (0:09-0:10), `docs-section`
(0:10-0:11), `api-search` (0:11-0:12), and `api-member` (0:12-0:13). Each
initially shows only its command. A single Next runs the bounded replay cue and
expansion; no typing loop or automatic command progression occurs. Complete
public stdout/stderr is linked, and excerpts are labeled honestly.

The `#/api-code` JSON selects fields from the unchanged earlier JSON recording,
not from the displayed default-output response. Its language, package, type
and member-kind parts are the same path segments as the member's page at
`aspire.dev/reference/api/csharp/...`. Follow with
`evidence` -> `writer` -> `docs-supply` -> `workflow` -> `stay-current`.
Explain the DLL/XML/available-PDB -> Roslyn -> reference Markdown/API-index
machinery later at `#/api-index`. Narrative `llms-full.txt` parsing and lexical
weights at `index`/`parser`/`lexical` belong to a separate index.

## AI loops: healthy app and exact operations

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

Use the direct commands above, not the older 13.6.1-gated `Start-Demo.ps1`.
In current discovery JSON, match a resource's stable `displayName` and read
its `urls` array; its runtime `name` can have a generated suffix. Use those
returned URLs, not a fixed port. `#/live-cli` remains a genuine recorded
command, not a browser shell.

The weather demo and dedicated native command/result replays are the proof,
before the process graph and wiring. At `#/skills-vs-tools`, define skill
guidance versus CLI execution before listing names at `#/skills`; do not put
an enormous animated terminal in that half-width definition. The earlier
wait/describe/trace capture uses `demo\host\apphost.cs` and the public 13.6.1
contracts. Then explain the native CLI/dashboard/API, managed AppHost, DCP,
explicit resource wiring, and main inner loop at `#/the-loop`.

At 0:22-0:23, `act-precisely` returns to the app introduced at 0:07-0:08.
Then show `runtime-wait` (0:23-0:24),
`runtime-state` (0:24-0:25), and `runtime-traces` (0:25-0:26)
before the skill/tool definition. Their results
come from the actual prepared native artifact and owned isolated AppHost, not
fixture provider output or a managed API. The capture reused the native binary
and stopped the exact AppHost afterward. The API was already healthy when wait
was captured; its reported timing is not the animation duration or a benchmark.
The full describe response includes all six resource states and marked privacy
redactions; do not imply all resources were healthy. Scroll its output body to
the final record without moving the command/header. The traces response shows
both actual traces and every span, not selected trace fields.

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

## AI loops: internal product/docs publication

After `#/ai-loops`, meet the app at `#/weather`, then introduce the browser
feature at `#/browser-evidence` and retrieve its guide and exact API member.
At 0:14, follow the page back through
`#/evidence` and `#/writer`, then show the docs loop at `#/docs-supply`.
This is the internal docs loop feeding the developer inner loop, not model training.
[Public-safe provenance and exact commands](evidence/browser-logs.json) remain
separate from gitignored raw captures.

The real input chain is [product PR 16531](https://github.com/microsoft/aspire/pull/16531) -> [successful existing run 25092695241](https://github.com/microsoft/aspire/actions/runs/25092695241) -> [docs PR 775](https://github.com/microsoft/aspire.dev/pull/775) -> [published browser-logs.md](https://aspire.dev/integrations/devtools/browser-logs.md) -> current CLI retrieval. The product change adds runtime browser configuration, not the initial creation of every browser-logs capability. The bot drafted the guide; [David Fowler's explicit refinement commit](https://github.com/microsoft/aspire.dev/commit/49371cfd913e1c3eec5a058eca745c21679b848d) corrected scope, configuration precedence, naming, and sharing before merge. There are no submitted review records on this docs PR; do not claim three reviews.

Inspect only the existing GitHub run/PR. The run's gh-aw artifacts have expired, so do not reconstruct outcome JSON or imply a new dispatch. The slide uses actual GitHub merged-state fields and the workflow Markdown pinned to the selected run head. If disconnected, label a prior capture as prior evidence rather than claiming a live result.

`WithBrowserLogs` is experimental (`ASPIREBROWSERLOGS001`) in `Aspire.Hosting.Browsers`. It creates a child browser resource whose console stream receives browser diagnostics; screenshots are command artifacts. This is a documented extra capability, **not wired into this weather app**. Do not add the package, enable browser automation, or change the native app merely to tell this story.

The unchanged `Show-DocsLoop.ps1` / `Test-DocsLoop.ps1` helpers are optional pre-talk historical regressions. Their timeout example and old safe-output outcome are not the audience story or required live commands; [the guide](DOCS-LOOP.md) keeps that distinction explicit.

Show [the real C# excerpts](code/) and [source links](SOURCES.md): conditional fetch/cache, fenced H1/H2+ parsing, fingerprint/cached indexing, and weighted lexical ranking. The API reference is separately generated from DLL/XML/PDB source information through a Roslyn canonical model into C# Markdown and its CLI API index.

The docs repo's `doc-writer` and the seven CLI-shipped application skills are distinct. Draft -> human review -> merge -> deploy -> retrieval is the boundary. Shipped skills and retrieved facts inform the next app/product change and reviewed PR. Nothing in this story retrains a model or auto-merges production.

Show the feature value before the PR trail, the maintainer's real refinement before the model of the pipeline, and the `#/docs-supply` outer loop before the `#/workflow` YAML and write-policy details. This is the context supply chain supporting the main CLI inner loop, not a fourth topic.

The `#/stay-current` bridge separates reviewed release-published narrative
context from per-package-version API models generated from exact assembly
assets. [PackageJsonGenerator](https://github.com/microsoft/aspire.dev/blob/ce6d2424abb1414a581837605d8c793cfc869fb2/src/tools/PackageJsonGenerator/README.md)
produces `Package.{version}.json`; [Astro corpus configuration](https://github.com/microsoft/aspire.dev/blob/ce6d2424abb1414a581837605d8c793cfc869fb2/src/frontend/astro.config.mjs)
excludes `reference/api/**` from the narrative corpus. Current CLI captures
use published context, not a proven automatic matching-semver selection.

## Aspire dashboard: integrated and independent (0:37-0:46)

**Task:** explain the Madison forecast that just loaded. **Entry:** `dashboard`.
The development AppHost must already be healthy from preparation; do not build
or start it on this chapter's clock.

1. In the actual app, search Madison and select the Wisconsin result. Keep its
   request time in view. This is live provider data, not a fixture or the deck's
   older weather screenshot.
2. In the integrated dashboard, check `api`/`frontend` health and open the latest
   `GET /api/weather` trace. Show the API server span, `weather.forecast`, and the
   parallel Open-Meteo/BigDataCloud calls. The browser has no OTel instrumentation;
   the trace starts at the API, not at a fictitious browser span.
3. Filter structured logs by that trace ID. In Metrics select
   `Weather.Native` -> `weather.requests`; choose **Last 1 hour** if an older
   request has aged out. Show the real operation/outcome values, not a latency
   or memory claim.

The assistant can read the same evidence with exact-target `aspire otel traces`
and `aspire otel logs`. The 13.6.4 rehearsal used the original Windows native
artifact and real providers, verified native/Vite React maps and Scalar, and
stopped that exact AppHost afterward. **Visible result:** one request linked
to its provider calls, logs and meter data. **Exit:** return at
`dashboard-signals`; no failure injection or repair story.

The unchanged light/dark Resources screenshots remain clearly attributed
official imagery, not the new weather run. AppHost resource-service state,
health, console and commands are separate from instrumented OTLP signals.

At `dashboard-standalone`, the CLI and `:latest` Docker commands remain
**alternative reference commands**, not direct recordings. The deployment
demo instead runs the canonical image pinned to `13.6.2`, with a recorded
digest. Not every CLI patch publishes a dashboard image. Keep browser token
authentication; never put the login URL in a public capture.

Standalone receives OTLP without an AppHost, but does not automatically gain
resource lifecycle, health or console capture. Our Compose target publishes
only random loopback UI ports; unauthenticated OTLP ingestion stays inside
its private Compose network. The dashboard's unsecured-ingestion warning is
not permission to expose it publicly. This is short-term diagnostics, not
unlimited production retention or remote AppHost orchestration.

## Aspire deployment: model, publish, deploy (0:46-0:58)

**Task:** run the same weather app without the development AppHost.
**Entry:** `deployment`. David selected real **local Docker Compose**; no cloud
resources or production automation are involved. Invoke `aspire-deployment`.

The current `demo\host\apphost.cs` pins SDK/JavaScript/Docker to 13.6.4 and adds
`AddDockerComposeEnvironment("talk-compose")`. The dashboard uses the existing
public `mcr.microsoft.com/aspire/dashboard:13.6.2` tag, not a nonexistent 13.6.4
image. Its exact recorded digest is in [the new provenance](evidence/chapter-demos.json).

Show the publish-only changes before switching to the terminal:

- `PublishAsDockerFile` is a no-op in run mode. Its callback selects the
  Dockerfile, removes the development `PORT` injection and adds a standard
  Kestrel endpoint on the container interface. `Weather.Api\Program.cs` keeps
  its original localhost default; no service code changed.
- `demo\host\Dockerfile` builds React, then compiles the API as Linux NativeAOT
  using the official AOT SDK image. Only the native executable and production
  static files enter the runtime-deps image; Node/Vite are not production
  processes. `demo\.dockerignore` keeps native/local/private artifacts out of
  the build context.
- Vite is excluded from publication, not from development. The generated
  services are `api` and `talk-compose-dashboard`, with random loopback-only
  host ports. OTLP wiring and public provider URLs come from the AppHost.

Prepare the first image build **offstage**. A warm deployment may reuse it;
neither the recording's timings nor replay animation is a benchmark. Inspect
the real pipeline before applying:

```powershell
aspire deploy --apphost $apphost --environment Talk --list-steps --non-interactive
aspire publish --apphost $apphost --environment Talk `
    --output-path .artifacts\chapter-demos\compose --non-interactive
```

At `deployment-publish`, open the generated `docker-compose.yaml` and `.env`.
`API_IMAGE` is a placeholder. Publish neither builds images nor starts services.
Do not expose a resolved `.env.Talk` or dashboard login token.

Before the standalone check, stop only the development AppHost:

```powershell
aspire stop --apphost $apphost --non-interactive
aspire deploy --apphost $apphost --environment Talk `
    --output-path .artifacts\chapter-demos\compose --non-interactive
```

Deploy evaluates the **current model**, not a previously published output
directory. It builds the image, resolves values and runs Compose up; it does
not deploy the AppHost process. Use the actual project name from deployment
output/container labels. This recorded checkout used
`aspire-talk-compose-5ea99390`; another checkout can have a different hash.
Discover ports rather than copying the rehearsal's temporary ports:

```powershell
$compose = Join-Path $PWD '.artifacts\chapter-demos\compose\docker-compose.yaml'
$environment = Join-Path $PWD '.artifacts\chapter-demos\compose\.env.Talk'
# $projectName must be the exact project discovered for this deployment.
docker compose --file $compose --env-file $environment --project-name $projectName port api 8080
docker compose --file $compose --env-file $environment --project-name $projectName port talk-compose-dashboard 18888
```

At `deployment-deploy`, open the discovered API URL, search Madison, and check
the request in the deployed dashboard. **Visible result:** the same app runs
with its development AppHost stopped. The real rehearsal also verified ELF64,
no managed `Weather.Api.dll`, NativeAOT true/reflection false, rendered
React/map/Scalar, provider spans, correlated logs and received weather metrics.
**Exit:** return at `deployment-boundaries`; then explain target, permission and
verification.

The two new recorded surfaces contain complete genuine publish/deploy stdout,
with complete stderr linked, rather than a fabricated Compose example.
The [historical reference/image inventory](evidence/dashboard-deployment.json)
is unchanged and remains historical.

### Exact rehearsal teardown

```powershell
aspire destroy --apphost $apphost --environment Talk `
    --output-path .artifacts\chapter-demos\compose --yes --non-interactive
```

This executes Compose down for the exact target. Remove only images and cache
that this rehearsal created; never run global prune or delete another
project's resources. The recorded run used an isolated buildx builder without
changing the default builder, then removed that builder/state and the proven
native image tags. The final comparison matched the original **0 containers,
2 images, 13 volumes and 3 default networks**. The deck preview on 4180 was
never stopped or restarted.

## Deck and pacing

Open the [published deck](https://ievangelist.github.io/inside-aspire/) or preview it locally at `http://127.0.0.1:4180/inside-aspire/?mode=present`. **Start presentation** advances to slide 2, `#/setup`, then slide 3, `#/thesis`, introduces the three questions. Core entries are `#/ai-loops`, `#/dashboard`, and `#/deployment`. Direct demos remain available; legacy `#/know-truth` resolves to `#/ai-loops`, while `#/act-precisely` and `#/stay-current` remain supporting AI-loop surfaces.

The CLI remains the main inner-loop enabler: current docs/API/state -> precise actions -> runtime evidence -> next grounded decision. The richer browser-configuration PR story supplies context at `#/docs-supply`; it does not turn docs automation into the whole AI loop. The title, exact approved abstract, event, and native facts are unchanged.

| Time | Segment and exact slide order |
| --- | --- |
| 0:00-0:05 | `intro` -> `setup` -> `thesis`: speaker (one minute), the older Aspire assistants learned (three minutes), then the three questions (one minute) |
| 0:05-0:09 | `ai-loops` -> `weather` -> `browser-evidence`: give the assistant a task, meet the app, ask for browser logs |
| 0:09-0:14 | `live-cli` -> `docs-section` -> `api-search` -> `api-member` -> `api-code`: read the guide and exact member |
| 0:14-0:18 | `evidence` -> `writer`: follow the page to its feature PR, docs draft and human refinement |
| 0:18-0:22 | `docs-supply` -> `workflow` -> `stay-current`: review/release, allowed writes and current docs |
| 0:22-0:26 | `act-precisely` -> `runtime-wait` -> `runtime-state` -> `runtime-traces`: return to the app, wait, inspect resources, read the trace |
| 0:26-0:33 | `skills-vs-tools` -> `skills` -> `api-index` -> `index` -> `parser` -> `lexical`: instructions, tools and separate API/narrative machinery |
| 0:33-0:37 | `compiler` -> `lifecycle` -> `the-loop`: native/managed processes, executable wiring and the developer loop |
| 0:37-0:46 | `dashboard` -> `dashboard-integrated` -> `dashboard-standalone` -> `dashboard-signals`: what happened, integrated resources, standalone startup, telemetry |
| 0:46-0:58 | `deployment` -> `deployment-model` -> `deployment-publish` -> `deployment-deploy` -> `deployment-boundaries`: why, documented pipeline and explicit guardrails |
| 0:58-0:59 | `takeaways`: Aspire makes AI more efficient; improves the dev inner loop; carries one app model into deployment |
| 0:59-1:00 | `close`: try the commands and get the code |

The speaker notes have 40 contiguous, nonoverlapping ranges covering exactly 60 minutes. Each is a spoken talk track, with separate CUE, BRIDGE and IF ASKED paragraphs where needed. David's bracketed 20-second example on `setup` remains for him to fill in. Stop at the main close. The 43-slide deck has 40 main slides and three optional, untimed appendices (`history`, `historical-evidence`, `sources`) after it; Q&A and networking take place separately.

The shell's manual [template 719 UX sync](evidence/template-ux.json) is unchanged;
the current story changes the opening, order and talk track. Existing line-highlight fragments, the remaining paired
layouts, recorded replays and endpoint-gated graphs remain. New window
copy controls copy exact source/command/full stdout. The menu heading and
presenter tools remain fixed while navigation alone scrolls. Reading uses its
own inner viewport; it should remain aligned after more than 1.2 seconds, not
reset horizontally. Overview thumbnails remain real slide targets. Print has
one variable-height page per slide with all code/output included; long recorded
JSON is not clipped or squeezed into a projector-sized page.

The 56px bar uses the unchanged compact Aspire mark and a single prioritized advance group. The menu leads with exactly the user's three primary areas; smaller direct demo/appendix jumps remain separate. The chapter indicator follows the active area through supporting slides. Arrow keys advance slides and graph/code steps; `Esc` closes an open menu and restores focus, or opens overview outside it. `R` changes reading mode, `T` changes theme, and `S` opens public-safe notes. Focus a scrollable code region to use its arrow-key scrolling without advancing slides.

Dotted term links provide short native hover descriptions and open Aspire
documentation in a new tab. AppHost, resource, and OTLP links sit in prose,
not inside copyable code or captured output. The DCP node links to the
architecture guide in both the SVG and narrow reading graph; its tooltip
spells out Developer Control Plane. Links remain keyboard-focusable and
leave the presentation's slide and fragment state unchanged.

Slide disclosures, including the optional C# AppHost/Go service example on `history`,
open in one native modal during presentation. Activate the summary by pointer,
Enter, or Space; the slide stays closed and its URL, mode, stage and scroll
position do not change. Only the modal content scrolls. Close or Escape returns
focus to the summary; deck navigation is blocked while it is open. The actual
prepared nodes and Copy handlers move into the modal and return on close.
Slide/mode/overview changes and receiver synchronization close it deterministically.
Reading retains native inline disclosure behavior; print includes all content,
and no-JavaScript remains a native disclosure. Speaker previews do not open or
relay an audience disclosure.

### Slide count badge

The count is outside the toolbar's Previous/Next/menu group. Its default is an
opaque, noninteractive bottom-left badge with a contrasting background, border
and shadow. Configure the existing output in `deck/index.html`:

```html
<output id="slide-position" data-position="bottom-left" data-visible="true"
  aria-label="Slide 1 of 43" aria-live="polite" aria-atomic="true">1 / 43</output>
```

`data-position` accepts exactly `top-left`, `top-right`, `bottom-left`, or
`bottom-right`. `data-visible` accepts only `true` or `false`; `false` removes
the badge from layout and the accessibility tree. Missing/invalid values fail
explicitly with the `#slide-position` configuration identity. Top placements
clear the toolbar, all corners respect safe insets, and the bottom-left status
message stacks above the badge only when it is visible there. Counts and
accessible labels still follow the actual slide through fragments and history.
Print and native speaker receivers always hide it, independent of configuration.
No animation, extra control, or deck-wide application config is introduced.

### Native speaker view and complete backward navigation

Open **Speaker notes** from the menu or focus the presentation and press **S**.
Allow pop-ups for the deck's site. Reveal's native presenter console opens in
a separate window with current and upcoming previews, the original timed notes,
a clock and elapsed timer. Move that window to the presenter's second screen;
share the audience window, not the notes window. The native console's arrow
keys also drive the audience presentation. The `receiver` frames always use
presentation layout, even though they are narrow. A blocked popup reports an
actionable error instead of claiming success.

Speaker notes are public source, not confidential presenter-only storage. The
39 draft main-slide note ranges cover exactly 60 minutes; optional
language references do not extend the timed talk.

After walking a code block forward and leaving its slide, **Previous** and
**ArrowLeft** return to its last step, rewind every highlight, then leave for
the preceding slide. Browser **Back/Forward** restores the exact history state.
An absent fragment in the URL means the initial no-highlight state, not the
first cached highlight. Explicit fragment links, code-body keyboard scrolling,
selection and Copy keep their original behavior.
Pointer Copy returns focus to the deck, so the next backward key is not trapped
on the button. Keyboard-activated Copy keeps accessible control focus. A short,
non-scrolling code body does not consume slide navigation keys; an actually
scrollable output/code region still owns its arrows for native scrolling.
Native presenter receiver URLs keep their query flags across reload, with
audience toolbar chrome hidden and receiver history disabled. Inside has no
`base` element, so native hash updates retain those flags and keep the current
preview state reloadable; the template's base-specific workaround is not copied.

### Package callouts and optional language references

Source windows opt into the template's package-ownership convention with
`data-pkg-cyan="Aspire.Hosting.JavaScript"`,
`data-add-cyan="javascript"` and `data-apis-cyan="AddViteApp WithNpm"`
on their `pre`. Valid accents are purple/cyan/pink/teal.
At least one package/add label and exact APIs are required. Without line ranges,
only lines with an owned API get a rail. Do not overlap ranges or assign one
API to multiple packages. Unknown/missing/non-code mappings fail visibly.
Strings/comments and common endpoint/reference/environment/build operations
remain neutral; legends and rails never enter copied source.

The legend separates **Package** from **CLI command**; the command is a
code-styled instruction, not a package subtitle. Omit `data-add-*` when a
neighboring panel already shows that command, as on the Docker model slide.
The lifecycle slide's
simplified `AddViteApp("frontend", "../frontend")` resolves from the AppHost
directory, matching the public integration's path-resolution behavior.
Only `AddViteApp` and `WithNpm` receive cyan rails, now lines 7 and 8.
The development wiring still has the same behavior; the local AppHost now
adds publish-only packaging and the approved 13.6.4 update. Cyan identifies
JavaScript APIs; purple identifies the actual Docker environment; teal
identifies the optional official `Aspire.Hosting.Go` / `aspire add go` API.
AppHost authoring languages and workload languages are separate: an AppHost
can be authored in C#, TypeScript, or Go and can run workloads in other
languages. This example uses the C# Go integration to launch a Go HTTP service.
All focus bands have square interior joins and round only
the ends of each contiguous group.

In the optional `history` appendix, open **C# AppHost running a Go service**.
Presentation opens the wider native modal; reading keeps an inline disclosure.
It shows `AppHost.cs` (the C# orchestration) and `main.go` (the Go HTTP service
reading `PORT`), not two competing AppHosts. The modal uses up to 1600px of
safe width and stacks the panels below 1400px viewports. Module/toolchain setup
is identified. Both are reference additions, not runs or changes to the weather
app. Reading/print show them completely. Their separate notes are optional
cues, not extra minutes in the timed talk. TypeScript AppHost names remain
`apphost.mts`.

### Social cards

The site advertises the canonical absolute `1200x630` PNG through OG and Twitter
large-image metadata, with descriptive alt text. The separate `1280x640`
GitHub-ready PNG is safely below 1 MB. Both use the unchanged real portrait,
official wordmark and existing fonts; [exact public assets and hashes](evidence/social-artwork.json)
are retained. To activate the repository's own card, upload
`deck/public/social/inside-aspire-social.png` in **Settings > Social preview >
Edit > Upload an image** while signed in. The deployed site's metadata and
GitHub's repository setting are separate; no unsupported API or token/cookie
workaround is used. The [official GitHub setup guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)
documents that upload route and the under-1-MB/1280x640 recommendation.

### Native slide and chapter transitions

Edit `transitionSettings` in `deck/src/transitions.ts` for whole-deck defaults
and overrides keyed by the existing, real `data-chapter` names. Settings are
independent fields: `style`, `speed`, and `background`. The order is deck
defaults < chapter defaults < explicit attributes on the actual leaf slide.
Layout columns and nested content never become transition targets.

Supported styles are `none`, `fade`, `slide`, `convex`, `concave`, and `zoom`;
speeds are `default`, `fast`, and `slow`. Slide/chapter styles may use native
in/out pairs such as `slide-in fade-out`. Background styles use a single native
style. For an explicit slide override, author normal Reveal attributes:

```html
<section id="existing-slide"
  data-transition="slide-in fade-out"
  data-transition-speed="fast"
  data-background-transition="fade">
```

Unknown chapter names, invalid styles/speeds and malformed directional pairs
fail explicitly with their chapter/slide identity. Ordinary slides move in the
navigation direction; primary chapter entries use a distinct entrance, and
the existing weather proof has one explicit in/out override. There is no new
View Transition API wrapper, navigation runtime or animation dependency.

Reduced motion, natural reading, print and native speaker receivers override
every effective slide/background transition to `none`, including authored
per-slide overrides. They do not wait on decorative motion. Receiver fragments
still match the native current/upcoming states; they are not expanded into
future audience content. Normal presentation restores the configured values,
and all navigation origins use the same native Reveal state machine.

Advance the graphs to reveal boxes and their connections together. Paths, arrowheads, and edge labels never point toward still-hidden boxes, including the return leg; there are no faint future guides. The workflow filename/compile/lockfile strip is centered as one compact sequence, while code stays left-aligned.

Phones, narrow windows, and short screens default to natural reading. `?mode=read` and `?mode=present` explicitly choose the mode without conflicting with reveal.js's reserved view option. Real internal links, chapter jumps, and browser history use actual generated page offsets. Reading/print/reduced-motion expose all stages immediately; presentation steps reveal connected graph paths and selected source lines. Print retains the complete graph and code content.

The blog's 82 PRs/44.8-hour median is explicitly historical May 3-June 2, 2026 data, not today's SLA or this example's individual duration. Omit all unannounced versions and release dates.

## Evidence and stop

[Windows/Linux native CI 38025689486](https://github.com/IEvangelist/inside-aspire/actions/runs/38025689486) passed: 50 parity tests, warning-as-error native compilation, Windows 280/Linux 273 native assertions, OpenAPI 3.1.1, rendered Scalar/native/Vite browsers, and actual traces/logs/metrics. The native format and runtime flags prove AOT; they do not establish a startup or memory benchmark.

The separate live-provider rehearsal returned actual Madison weather/geocoding and loaded maps. The deck's native screenshots are labeled captures, not forecasts or fake UI. The 43-slide draft retains David's actual portrait, unchanged branding/PR/native images and exact four social destinations. The intro presents those links vertically, with left-aligned 44px icon tiles and visible scheme-free URLs; each whole row is a link. The dashboard images are attributed official documentation screenshots. [Presentation assets and source excerpts](PRESENTATION-ASSETS.md) have explicit provenance.

The build/native-proof/operational-result slides are removed from the audience deck. Their real source and verified evidence stay in this repository and in pre-talk preparation. Old `#/aot` and `#/native-proof` links resolve to `#/compiler`; `#/commands` resolves to `#/live-cli`.

The weather image displays the entire original 1440x1000 capture at a larger proportional footprint, not in a letterboxed wide box. Reading uses the available width. PR images also use their actual aspect ratio. The former `#/timeout` audience link resolves to the browser-evidence explanation at `#/browser-evidence`.

The browser gate checks actual syntax tokens for six source/JSON languages and
honest plain-text stdout across the draft's 33 command/output/source blocks, rounded inline
code, graph/code fragments, and static modes. Replay tests verify fixture
hashes/semantics/privacy, one-command initial state, real expanding geometry,
matched output, rewind/interruption/hash restoration, exact copy, accessible
hidden status, and one bottom-aligned output scroller. Three-area/full-hour/navigation
and all strict image, 31-node/66-label/32-route/76-state checks remain intact.

```powershell
aspire stop --apphost $apphost --non-interactive
```

Stop only this exact AppHost. Do not use `--force` for ordinary cleanup, kill unrelated processes, or delete locked build output. The native probe stops any AppHost it owns in `finally`.

Reviewed main pushes publish the deck; PRs build without production deployment. The separate manual notification workflow sends one bot-authored mention/assignment only when final verified URLs are supplied. Account preferences control email delivery.

Notification preflight checks links sequentially. Only transient 429/5xx and network failures are retried, at most three attempts per link with a capped wait. A permanent or persistent failure stops before issue creation. The issue POST itself is never retried; verify whether an issue exists before another manual dispatch.

Own-repo `blob/main` file links use GitHub's official contents API to avoid unreliable HTML delivery. The response must be HTTP 200, `type=file`, and contain the exact supplied `html_url`; the notification link stays unchanged. The workflow token is sent only to the fixed `api.github.com` endpoint, with redirects disabled, never to article, event, or site hosts.
