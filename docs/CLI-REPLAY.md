# Recorded CLI command and result replay

The command/result surfaces are **recorded CLI runs**, not commands executed by
GitHub Pages. The presenter chooses Next/Back. One advance gives a 180ms pause
and a 420ms expansion; these authored durations are illustrative motion,
not CLI latency, a progress estimate, or a performance benchmark. No browser
bridge, backend, new animation dependency, or command autoplay is used.

## Genuine evidence

All seven displayed commands were executed with the repository-local public
Aspire CLI **13.6.1**. stdout, stderr, exit status, arguments, capture time, and
SHA256 digests were retained in gitignored capture artifacts. Every displayed
run exited zero and had its useful semantic output checked before publication.

[Public-safe capture provenance](evidence/cli-replay.json) links the complete
public stdout/stderr files and records their hashes. Each panel renders the
entire existing public-safe stdout, not selected fields or decoded Markdown.
All six `--format Json` commands display complete, parseable JSON with the
original array/object shape; Markdown remains an escaped `content` string.
The wait result remains genuine plaintext. Only one final newline is omitted
from the displayed/copied text; no values or capture files are changed.
The prompt decoration is outside the copyable command text.

| Command surface | Actual recorded evidence |
| --- | --- |
| `live-cli` | Docs search returned the genuine Browser logs title, `browser-logs` slug, summary content, best section, and score; all five results remain in full stdout |
| `docs-section` | Get returned `Configure browser logs` and the actual runtime configuration dialog semantics |
| `api-search` | The unique C# `WithBrowserLogs` member ID, signature, language, kind, parent, summary, and score |
| `api-member` | Get followed that returned ID without `--language`, including the experimental diagnostic, parameters, source, and browser/CDP remarks |
| `runtime-wait` | Actual `api` readiness on the exact `demo\host\apphost.cs` target; the resource was already healthy after start, so its reported `0.0s` is recorded output, not an animation/performance claim |
| `runtime-state` | All six safe resource records, including the Executable/Running/Healthy API, NotStarted installer, and Unhealthy frontend; the response does not claim every resource was healthy |
| `runtime-traces` | Both actual traces after a successful Madison weather request through the native API: the health trace and successful `GET /api/weather` trace with all four spans |

The runtime capture reused the prepared Windows x64 artifact. Its PE32+ x64
format and absent CLR header were checked, and its SHA256 is recorded. No
managed fallback, source change, or native rebuild was used. The public CLI
started one exact-target, isolated AppHost, used `aspire wait`, and discovered
the request endpoint from `aspire describe`. A single actual weather request
generated the telemetry; no HTTP readiness polling loop was used.

The capture-owned AppHost was stopped with exact-target `aspire stop`, without
`--force` or `--all`. Post-capture `aspire ps` returned no running AppHosts.
No global CLI, agent skill tree, native app, or profile configuration was
modified.

## Formatting and privacy

Capture-only `--nologo` suppressed the banner; docs/API capture also used
`--non-interactive`. These options do not manufacture a response. ANSI CSI
formatting is removed if present and CRLF is normalized to LF. No captured
stdout had ANSI formatting in this run.

Runtime JSON is indented for readability. Dashboard URLs, environment values,
credential-shaped properties, host/user names, and personal absolute filesystem
paths are explicitly redacted. No other field values are invented or changed.
The raw private hashes and distinct public-file hashes document the boundary.
Raw AppHost start output, dashboard login links, and private environment data
are never published.

The docs/API captures are short, attributed outputs from the published
[browser guide](https://aspire.dev/integrations/devtools/browser-logs.md) and
[generated member reference](https://aspire.dev/reference/api/csharp/aspire.hosting.browsers/browserlogsbuilderextensions/methods#withbrowserlogs-iresourcebuilder-t-string-string-browseruserdatamode).
No whole documentation corpus, blog article, or agent transcript is bundled.
`WithBrowserLogs` remains experimental and is not enabled in the unchanged
weather app.

## Controls and static modes

In presentation mode each surface initially shows one real command and no
result. Next reveals that command's recorded result; the following Next moves
deliberately to the next related command. Back collapses or returns to the
matching previous result. Plain jumps reset the surface, while explicit
fragment links and normal Back restore the correct state.

Interruption, theme changes, and viewport changes cancel or settle the short
sequence. No delayed callback can show a response on another slide. The command
remains anchored on ordinary slides while its result pane expands to a bounded
height. Five long-response slides opt into terminal focus: `live-cli` (five
search records), `docs-section` (full guidance), `api-member` (full member
reference), `runtime-state` (six detailed resources), and `runtime-traces`
(both traces and their spans). Their title space becomes the terminal's space
when output appears, and the output body fills the remaining safe height.
The short `api-search` and `runtime-wait` panels retain their original layout.
The header continuously says **Recorded CLI run**. Focused presentation hides
only the marked source footer; Back restores it and its links.
There is no visible status/excerpt row or reserved space for one; short polite
status announcements use the existing visually hidden accessibility style.
Output scrolling belongs to one complete body at the bottom of the rounded
terminal, never to the command, wrapper, syntax tokens, or a separate middle
gutter. Long JSON strings wrap without truncation or smaller projector type.
The output region is keyboard-focusable and supports keyboard, wheel, and
touch scrolling to the final record.

Reading, print, and reduced-motion modes expose the recorded commands and
results immediately across their consecutive surfaces. Reading and print
expand the full output naturally, so print cannot clip scroll-hidden lines.
Without JavaScript, the static commands, complete stdout, and capture links remain readable;
there is no claim of live execution. Real live demonstrations remain available
in the runbook's separate direct-terminal commands.

### Authoring terminal focus

Add `data-terminal-focus="true"` to a leaf `<section>` containing exactly one
direct recorded terminal. Mark only its supporting provenance/caption with
`class="terminal-support"` (alongside existing classes). Omit the attribute
for the original layout; `false`, an empty value, or any other authored value
fails startup with the slide identity. Nested/layout-column terminals are
not supported by this full-slide opt-in.

Focus follows the existing output fragment, including deep links, browser
history, and native Notes current/upcoming previews. Headings remain semantic
but visually collapse; hidden support is inert and leaves the tab order.
Rewind restores the original geometry and support. Reduced motion focuses
immediately without animation. Reading, print, overview, and no-JavaScript
content retain their headings and provenance; reading/print/no-JavaScript
still expose all captured output, without internal clipping.
