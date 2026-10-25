# Presenter runbook

**Inside Aspire: The Architecture Behind the AI Loop**

Wisconsin .NET UG, November 17, 2026 at 6pm Central. All 60 minutes are presentation time. Q&A and networking are separate.

Use the prepared app and actual repository in VS Code for the application demo, and a real terminal for CLI decisions and results. The audience deck explains architecture rather than narrating compilation or test checks. Keep the app healthy; inspect the existing PR/run without production dispatch or a failure/repair scenario.

The user-directed story has exactly three primary areas, repeated verbatim on the opening roadmap, chapter entries, and close:

| Main point | Why first | Concrete proof, then supporting machinery |
| --- | --- | --- |
| **AI loops** | A confident answer isn't evidence. | Internal product/docs proposal -> maintainer review/release publication, feeding the skill-guided developer loop through current docs, versioned API references, exact CLI operations and observed results |
| **Aspire dashboard** | A running process isn't the whole story. | Official integrated resource-page imagery, independent CLI/container references, then the resource-service versus instrumented OTLP boundary |
| **Aspire deployment** | Application intent should outlive your laptop. | Explicitly labeled Compose model/API pattern and separate publish/deploy references, then target/configuration/permission/verification boundaries |

The 41-slide deck has 38 timed main slides and three untimed appendices.
Opening/roadmap use 0:00-0:04; AI loops 0:04-0:36; dashboard 0:36-0:46;
deployment 0:46-0:58; close 0:58-1:00. NativeAOT, C#, Roslyn, DCP and
gh-aw support these areas, not extra chapters. The former benefit phrases
remain supporting ideas. History/MCP, historical metrics and sources follow
the close only when relevant.

The deck now includes presenter-controlled **Recorded CLI run** surfaces. They
replay genuine captured command results, not browser execution. One command
stays anchored while Next expands its complete captured stdout in one bounded
output-only scroller; the following Next proceeds to the next related command.
Back restores/collapses correctly. Use the [capture proof](CLI-REPLAY.md) and
[public-safe fixtures](evidence/cli-replay.json); the animation is not a latency
benchmark. Reading, print, and reduced motion show recorded commands/results
immediately. Six JSON commands keep their complete JSON envelopes and escaped
Markdown content; wait remains plaintext. There is no visible replay status
row. Reading/print expand all output naturally. Live terminal execution below
remains a separate option.

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

## AI loops: reviewed publication feeds direct evidence (0:04-0:36)

Follow the real browser feature through product/docs PRs, maintainer refinement,
the outer loop and safe-output policy. Then replay these genuine captured
commands before the compiler graph/parser excerpts. Live terminal execution
remains a separate option:

```powershell
aspire docs search "Configure tracked browser" --format Json --non-interactive
aspire docs get browser-logs --section "Configure browser logs" --format Json --non-interactive
aspire docs api search WithBrowserLogs --language csharp --format Json --non-interactive
aspire docs api get "csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs" --format Json --non-interactive
```

If you want to inspect the catalog and available section names, use `aspire docs list --format Json --non-interactive` and `aspire docs get browser-logs --format Json --non-interactive`. The verified search returns `browser-logs`, but its best section can be `Add browser logs to a resource`; do not assume that is the requested configuration section.

Show the actual returned content: runtime configuration, browser/profile/user-data options, optional persistence, interaction-service requirement, and immediate apply. Then point to the exact C# member ID and signature. Only API search accepts `--language`; get follows the current returned ID. A zero exit, empty result, or name-only hit is not the payoff.

The four recorded surfaces are `live-cli` (0:16-0:17), `docs-section`
(0:17-0:18), `api-search` (0:18-0:19), and `api-member` (0:19-0:20). Each
initially shows only its command. A single Next runs the bounded replay cue and
expansion; no typing loop or automatic command progression occurs. Complete
public stdout/stderr is linked, and excerpts are labeled honestly.

The `#/api-code` JSON is explicitly selected fields from a recorded public CLI response, not a new live capture. Its renderer excerpt supports the identity just shown. Explain the DLL/XML/available-PDB -> Roslyn -> reference Markdown/API-index machinery afterward at `#/api-index`. Then switch explicitly to narrative docs at `#/index`, `#/parser`, and `#/lexical`: `llms-full.txt`, ETag/fingerprint reuse, fence-aware boundaries, and the narrative index's own lexical weights. Do not attribute those weights to the separate API catalog.

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

Then use the exact `wait`, `describe`, and `otel` commands here to show readiness, returned endpoints, and actual traces/logs. `Start-Demo.ps1` remains an optional preparation convenience; do not run it as well as direct start for the same AppHost. The `#/live-cli` slide contains real CLI commands to copy, not a wrapper or simulated terminal.

The weather demo and dedicated native command/result replays are the proof,
before the process graph and wiring. At `#/skills-vs-tools`, define skill
guidance versus CLI execution before listing names at `#/skills`; do not put
an enormous animated terminal in that half-width definition. The actual
wait/describe/trace capture uses `demo\host\apphost.cs` and the public 13.6.1
contracts. Then explain the native CLI/API, managed AppHost/dashboard, DCP,
explicit resource wiring, and main inner loop at `#/the-loop`.

Keep the weather image unchanged and uncluttered. Follow it with dedicated
`runtime-wait` (0:22-0:23), `runtime-state` (0:23-0:24), and `runtime-traces`
(0:24-0:25) replay surfaces, before the skill/tool definition. Their results
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

After the primary why at `#/ai-loops`, show the browser feature's value at
`#/browser-evidence` and how the current guide becomes available to the next
CLI decision. Later retrieve that actual guide and exact API member. This is
the internal docs loop feeding the developer inner loop, not model training.
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

## Aspire dashboard: integrated and independent (0:36-0:46)

Start with why state and actual request behavior are different questions.
Use the unchanged official light/dark resource-page screenshots, clearly
attributed to the documentation rather than the weather run. An AppHost starts
the integrated dashboard and connects its resource service for state, health,
console, configuration and lifecycle. Code still needs instrumentation and OTLP
export for structured logs/traces/metrics.

The next slide shows two **documented references, not executed commands**:
`aspire dashboard run --non-interactive` and the official
`mcr.microsoft.com/dotnet/aspire-dashboard:latest` image. The CLI is foreground/
blocking. Container UI/OTLP ports are 18888/18889/18890, mapped to loopback
host 18888/4317/4318; CLI defaults are 18888/4317/4318. The documented mutable
tag is not a pinned-release claim. Keep browser authentication; never display
login tokens or enable anonymous access on public interfaces.

Standalone receives any instrumented OTLP emitter without an AppHost. It does
not automatically gain process health, console capture, lifecycle or terminals
without a resource-service connection. Optional persistence does not make it
unlimited production telemetry retention. Local CLI backchannels are not remote
dashboard orchestration. No new dashboard/native runtime is needed to tell this
source-backed story.

## Aspire deployment: model, publish, deploy (0:46-0:58)

Explain why application relationships should survive a move beyond development.
Docker Compose is an **explicitly labeled documented example**, not a target
chosen by the user or configured in this weather AppHost. The `Aspire.Hosting.Docker`
integration adds `AddDockerComposeEnvironment("env")`; `WithDashboard()` is an
explicit Compose opt-in. A real model still needs deployable application
resources. No package, AppHost, script or graph is changed for these slides.

Reference syntax uses placeholder AppHost/environment values. `aspire publish`
generates target artifacts; the documented Compose shape is
`docker-compose.yaml`/`.env`, without building images or applying deployment.
`aspire deploy` evaluates the configured target pipeline from the current
AppHost model, not an old output directory, and deploys declared resources
rather than the AppHost process. Compose resolves parameters, builds images,
and runs Compose up. No fake generated output or new replay is shown.

Appropriate integrations, providers, authentication, parameters, secrets and
verification vary by target. `aspire-deployment` guides that workflow; it is
not permission to provision billable infrastructure. The actual NativeAOT
weather development graph has not been deployed. [Verified sources and image
hashes](evidence/dashboard-deployment.json) record these reference boundaries.

## Deck and pacing

Open [the published deck](https://ievangelist.github.io/inside-aspire/). **Start presentation** advances to slide 2, `#/thesis`, without skipping the three-area roadmap. Core entries are `#/ai-loops`, `#/dashboard`, and `#/deployment`. Direct demos remain available; legacy `#/know-truth` resolves to `#/ai-loops`, while `#/act-precisely` and `#/stay-current` remain supporting AI-loop surfaces.

The CLI remains the main inner-loop enabler: current docs/API/state -> precise actions -> runtime evidence -> next grounded decision. The richer browser-configuration PR story supplies context at `#/docs-supply`; it does not turn docs automation into the whole AI loop. The title, exact approved abstract, event, and native facts are unchanged.

| Time | Segment and exact slide order |
| --- | --- |
| 0:00-0:04 | `intro` -> `thesis`: speaker and user-selected three-area roadmap |
| 0:04-0:11 | `ai-loops` -> `browser-evidence` -> `evidence` -> `writer`: why, feature, real PR/run/guide and human refinement |
| 0:11-0:15 | `docs-supply` -> `workflow` -> `stay-current`: outer loop/policy and current narrative versus versioned API bridge |
| 0:15-0:21 | `weather` -> `live-cli` -> `docs-section` -> `api-search` -> `api-member` -> `api-code`: healthy context and full recorded retrieval |
| 0:21-0:25 | `act-precisely` -> `runtime-wait` -> `runtime-state` -> `runtime-traces`: exact scope and real native observations |
| 0:25-0:32 | `skills-vs-tools` -> `skills` -> `api-index` -> `index` -> `parser` -> `lexical`: definitions and distinct reference/narrative machinery |
| 0:32-0:36 | `compiler` -> `lifecycle` -> `the-loop`: native/managed model, explicit wiring and complete developer cycle |
| 0:36-0:46 | `dashboard` -> `dashboard-integrated` -> `dashboard-standalone` -> `dashboard-signals`: why, actual official UI, startup references and telemetry boundary |
| 0:46-0:58 | `deployment` -> `deployment-model` -> `deployment-publish` -> `deployment-deploy` -> `deployment-boundaries`: why, documented pipeline and explicit guardrails |
| 0:58-1:00 | `close`: AI loops. Aspire dashboard. Aspire deployment. |

The speaker notes have contiguous, nonoverlapping ranges covering exactly 60 minutes. Stop at the main close. The 41-slide deck has 38 main slides and three optional, untimed appendices (`history`, `historical-evidence`, `sources`) after it; Q&A and networking take place separately.

The shell's manual [template 719 UX sync](evidence/template-ux.json) does not change
that content or timing. Existing line-highlight fragments, all ten paired
layouts, seven recorded replays and endpoint-gated graphs remain. New window
copy controls copy exact source/command/full stdout. The menu heading and
presenter tools remain fixed while navigation alone scrolls. Reading uses its
own inner viewport; it should remain aligned after more than 1.2 seconds, not
reset horizontally. Overview thumbnails remain real slide targets. Print has
one variable-height page per slide with all code/output included; long recorded
JSON is not clipped or squeezed into a projector-sized page.

The 56px bar uses the unchanged compact Aspire mark and a single prioritized advance group. The menu leads with exactly the user's three primary areas; smaller direct demo/appendix jumps remain separate. The chapter indicator follows the active area through supporting slides. Arrow keys advance slides and graph/code steps; `Esc` closes an open menu and restores focus, or opens overview outside it. `R` changes reading mode, `T` changes theme, and `S` opens public-safe notes. Focus a scrollable code region to use its arrow-key scrolling without advancing slides.

### Slide count badge

The count is outside the toolbar's Previous/Next/menu group. Its default is an
opaque, noninteractive bottom-left badge with a contrasting background, border
and shadow. Configure the existing output in `deck/index.html`:

```html
<output id="slide-position" data-position="bottom-left" data-visible="true"
  aria-label="Slide 1 of 41" aria-live="polite" aria-atomic="true">1 / 41</output>
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
38 original main-slide note ranges still cover exactly 60 minutes; optional
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
`data-add-cyan="javascript"`, `data-apis-cyan="AddViteApp WithNpm"` and
`data-lines-cyan="7-12"` on their `pre`. Valid accents are purple/cyan/pink/teal.
At least one package/add label and exact APIs are required. Without line ranges,
only lines with an owned API get a rail. Do not overlap ranges or assign one
API to multiple packages. Unknown/missing/non-code mappings fail visibly.
Strings/comments and common endpoint/reference/environment/build operations
remain neutral; legends and rails never enter copied source.

The original native executable/Vite excerpt remains exact. Cyan identifies
JavaScript APIs; purple identifies the documented Docker environment; teal
identifies the optional official `Aspire.Hosting.Go` / `aspire add go` API.
The old deprecated Toolkit Golang package and unsupported Go AppHost authoring
are not presented. All focus bands have square interior joins and round only
the ends of each contiguous group.

In the optional `history` appendix, open **C# AppHost + Go service references**
to switch to natural reading. It shows an illustrative top-level `AppHost.cs`
and a separate `main.go` reading `PORT`; module/toolchain setup is identified
rather than silently implied. Both are reference additions, not runs or changes
to this weather app. Reading/print show them completely. Their separate notes
are optional cues, not extra minutes in the timed talk. Existing TypeScript
AppHost names remain correctly `apphost.mts`.

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
fail explicitly with their chapter/slide identity. Ordinary slides retain a
quiet fade; primary chapter entries use a restrained distinct entrance, and
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

The separate live-provider rehearsal returned actual Madison weather/geocoding and loaded maps. The deck's native screenshots are labeled captures, not forecasts or fake UI. The 41-slide deck retains David's actual portrait, unchanged branding/PR/native images and exact four social links; the new dashboard images are attributed official documentation screenshots. [Presentation assets and source excerpts](PRESENTATION-ASSETS.md) have explicit provenance.

The build/native-proof/operational-result slides are removed from the audience deck. Their real source and verified evidence stay in this repository and in pre-talk preparation. Old `#/aot` and `#/native-proof` links resolve to `#/compiler`; `#/commands` resolves to `#/live-cli`.

The weather image displays the entire original 1440x1000 capture at a larger proportional footprint, not in a letterboxed wide box. Reading uses the available width. PR images also use their actual aspect ratio. The former `#/timeout` audience link resolves to the browser-evidence explanation at `#/browser-evidence`.

The browser gate checks actual syntax tokens for six source/JSON languages and
honest plain-text stdout across 30 command/output/source blocks, rounded inline
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
