# Deck design

The user-approved direction is technical keynote craft in the official Aspire identity: self-hosted Poppins, unchanged logo SVGs, `#7455dd`/`#512bd4` purple, and `#1f1e33` dark. Design variance 6, motion 5, and visual density 4 express a readable talk with deliberate presenter-driven graph and code sequences.

## Additive template UX sync

The shell now adapts the [Aspire deck template at 719b552](https://github.com/IEvangelist/aspire-deck-template/tree/719b552b592c85f31fa5d257a1860117ea785f58),
not its starter content or Markdown/config authoring model. Poppins headlines
use the source's heavier weights/open tracking and selective same-copy accents.
Fira Code 5.3.0 is self-hosted for code, window labels and keycaps. Quiet purple
glow/title-only grid, hairline surfaces, squared 44px actions, traffic-light
code/diagram chrome, numbered navigation chips, fixed menu chrome and themed
thin body scrollbars come from the pinned shell.

The published baseline's 41 authored slides, notes, code strings, media,
citations, order, public IDs, aliases and ten paired layouts are recorded in the
[pre-port contract](../docs/evidence/template-ux-baseline.json). The local
43-slide story draft adds `setup` and `takeaways`, changes copy/order/notes, and leaves that
frozen test contract untouched pending approval. The original
`syntax.ts` line focus, complete recorded replay controller and endpoint-gated
SVG model remain talk-specific. Do not replace them with the template's syntax
helper, source-only arrow staging, generic Steps list styles or starter slides.
Only explicitly opted-in components should gain new semantic layout behavior.

Natural reading uses a dedicated `slide-viewport`, with Reveal layout disabled
instead of its delayed scroll-wrapper reset. Source code remains left-aligned;
desktop pairs retain their columns and narrow pairs retain DOM order.
Overview keeps actual slide thumbnails framed and clickable. Print uses one
variable-height page per leaf slide: very long immutable stdout gets a taller
page, not smaller type, hidden lines, or an excerpt. Clipboard controls copy
original source, not syntax markup or prompts, and report real failures.

This is a deliberate manual UX port, not a shared package or automatic
template-update mechanism. Its source pin and retained differences are in
[UX provenance](../docs/evidence/template-ux.json).

The unchanged title pairs with David Pine's actual 300px public portrait, displayed proportionally at 260px on the desktop. The 56px presentation bar uses the official 32px Aspire mark without a stretched or overpowering wordmark. One primary advance group and a compact chapter indicator remain visible; secondary controls and chapter navigation live in an accessible dialog/sheet. Controls have 44px targets.

The count is a separate fixed, noninteractive badge rather than a separator
between Previous and Next. Its visible bottom-left default uses the existing
opaque `surface-strong`, `ink`, strong border and offset window shadow, with
Fira Code/tabular text and safe insets. The output's validated `data-position`
selects one of four corners; `data-visible="false"` fully hides it. Status text
stacks above a visible bottom-left badge; other placements leave status at its
normal corner. Print and native presenter previews never show the badge.
The existing count updates and polite/atomic live label remain tied to the
original Reveal slide state, not a second navigation system.

## Semantic accents and package ownership

Purple remains Aspire's primary/action identity. Cyan marks code/reference and
observability cues, teal run/proof/deployment cues, and pink human-review/data
boundaries. Those roles accompany existing labels/icons, not color-only claims
or random rainbow decoration. The palette matches the template owner's settled
annotation contract; dark code windows keep bright, contrast-safe package
colors even on light pages, with deeper prose/print counterparts.

Opt-in package legends use `data-pkg-<accent>`, `data-add-<accent>`,
`data-apis-<accent>` and optional `data-lines-<accent>` on the original `pre`.
Only exact owned API tokens are recolored/underlined; strings, comments, core
operations, source text and copied whitespace stay intact. Visible labels,
described legends and contiguous gutter rails supply non-color cues. The
JavaScript, Docker and Go mappings are source-backed, not guessed from syntax.
Invalid ownership/ranges fail explicitly with the slide/block name.
Package legends distinguish the **Package** name from its **CLI command**
using separate labeled groups and a code-styled command. The lifecycle
slide derives its cyan rails from the two owned API tokens, not the entire
fluent chain. Its simplified relative-path Vite call fits on one line;
the runnable file keeps its explicit Path.Combine. The local AppHost adds
publish-only packaging without changing that development behavior.

Focused code is one connected band per contiguous selection: six-pixel outer
end corners, square interior joins, and independently rounded isolated/disjoint
groups. The original line-navigation contract remains. The only language
additions are clearly labeled optional `AppHost.cs` top-level C# and `main.go`
workload references. The example uses a C# AppHost to run a Go HTTP service;
AppHost authoring can use C#, TypeScript, or Go, independently of workload languages.
The spoken talk track and deployment examples reflect the current rehearsal.
[Original package behavior proof](../docs/evidence/package-accents.json).

The native Reveal speaker console remains the presenter runtime. Its receiver
iframes explicitly use presentation mode so their small sizes cannot trigger
reading layout. Same-slide initial browser-history entries explicitly restore
fragment `-1`, fixing the reproduced backward-navigation trap without changing
normal Previous or explicit fragment restoration.

Native transition configuration uses deck < real chapter < explicit leaf-slide
precedence through `src/transitions.ts` and Reveal's standard attributes. Slides
move in the navigation direction by default; chapter entrances and the
weather-proof slide keep their authored in/out effects. Reduced/read/print/
receiver contexts force all effective slide/background overrides to `none`;
receiver fragment state stays exact. No View Transition wrapper or new
animation dependency is used.

The thesis and ending remain **Aspire makes AI more efficient**. The three primary areas repeat on roadmap, chapter entries and close: **AI loops**, **Aspire dashboard**, **Aspire deployment**. The talk sets up the older Aspire assistants learned, introduces the weather app directly after the AI-loop overview, then shows CLI retrieval and follows the page back to its PR, human refinement and publication. Current narrative context and per-package-version API references stay separate. The operating question returns to the introduced app for wait/state/trace. Weather retains its fade-in/slide-out handoff between the chapter overview and browser-logging task. Dashboard is integrated and independent; deployment is a complete third chapter, not an appendix.

The three `.chapter-opener` surfaces make a claim, define the capability
and show its mechanism with static semantic HTML. AI shows three concise
examples: product changes checked by tests/review, features becoming
human-refined docs, and app edits checked through Aspire. The rows use
forward steps with a three-quarter-circle Octicon at each row's end,
32px vertical padding, no CLI sublabel and no bottom payoff text. The dashboard follows the native
API's parallel provider calls and separates per-request traces/logs from
aggregate metrics. Deployment branches one model into development
processes and Compose containers. These use existing type sizes, chapter
tones, Octicons, borders and surfaces; they add no source footers,
animation, screenshots or recorded output. The four staged SVG graphs
and their geometry remain unchanged.

The main SVG loop centers the native CLI between shipped skills, the AppHost/native app, and observed results. The reviewed GitHub docs supply loop supports that hub; a separate API graph preserves DLL/XML/PDB -> Roslyn -> schema/Markdown -> API-index boundaries. Narrative-docs cache/fence parsing/lexical weights are not attributed to the separate API index.

Contextual term links use dotted underlines and short native hover descriptions,
with new-tab documentation targets and keyboard focus. The DCP link works in
both graph representations without moving nodes, routes or stages. Its SVG is
an accessible group so the embedded documentation link remains discoverable.
Code and recorded output remain plain copyable source, without term links.

Explicit Highlight.js core language modules produce actual tokens without importing the oversized all-language reveal plugin. Code panels use a distinct surface and 10px corners; inline code has a subtle theme-aware background and 6px corners. Line numbers and speaker-advanced focus appear only on the parser and AppHost where sequencing aids explanation. Literal text is preserved, and token contrast is checked in both themes.

SVG edges reveal with the speaker's advance and restore on back/deep-link navigation. No decorative animation loops or animation framework are used. Reading, print, and reduced-motion modes show all information immediately. Narrow screens redraw graphs as connected, explicitly labeled relationships rather than tiny scaled diagrams. Natural reading mode owns its DOM-based offsets/hash navigation instead of relying on reveal.js's uniform page-height assumptions.

Images are actual portrait/PR/native captures plus unchanged, attributed official dashboard documentation screenshots, not reconstructed UI. Their aspect/theme behavior, GitHub marks and Octicons family remain unchanged. Standalone startup syntax remains reference material; Compose publish/deploy now have complete genuine current recordings. Historical reference provenance and [new executed-rehearsal proof](../docs/evidence/chapter-demos.json) remain separate.

The draft pacing is 43 slides: 40 timed main slides plus three optional appendices. Opening/setup/roadmap take five minutes, AI loops 32, dashboard nine, deployment 12, takeaways one and close one, totaling 60 with separate Q&A/networking. Each chapter has a task/action/result/return: propose browser logging, follow a Madison request, then deploy that app with local Compose. The takeaways state AI efficiency, the dev inner loop and carrying one app model into deployment. Presenter instructions stay in notes. Nine **Recorded CLI run** surfaces support the handoffs. The original and Compose capture files stay immutable; two November 6 get recordings use default output. All four graphs retain their geometry, and the native image keeps its larger proportional area. Native compilation stays offstage. There is no cloud provisioning, backend bridge, new skill generation or animation dependency.

The portrait's four social links form a vertical list with left-aligned 44px icon tiles and visible 20px URL text. Every URL starts at the same text edge, omits its scheme and trailing slash, and remains fully readable. Each whole row is a safe new-tab link with visible keyboard focus and a label containing its URL. GitHub/X/Bluesky/LinkedIn use the same maintained glyphs. The semantic operation/resource icon family remains Octicons.

Code panels are flex columns: a fixed caption, then a growing code body ending at the rounded panel bottom. Ordinary lines soft-wrap without changing copyable source text or shrinking type. Required preserved-layout lines use one accessible horizontal body scroller, never a mid-card, token, line, or page scrollbar.

The two pipeline recordings use terminal-style highlighting: green success markers and bars, blue summary headings and amber durations. The redirected captures contain no ANSI escapes; these are display colors, not recovered terminal attributes. Their timeline rows keep the recorded spaces in a system monospace font with one-cell checkmarks, without ligatures. Other log lines still wrap. Captured text, timings and Copy output stay unchanged.
The deployment-model slide stacks its compact installation command above
the full-width AppHost excerpt so the fluent calls do not wrap mid-expression.
Other paired source layouts keep their existing columns.

Presentation disclosures use one native `#slide-details` modal, inheriting menu
surfaces, backdrop, typography and 44px controls. Its fixed title/Close row and
independently scrolling body keep the underlying slide, URL, mode, stage,
counter and all outer scroll positions intact. Prepared content nodes move
without cloning, preserving Copy handlers/state, and return before close,
navigation, mode changes or print. Native focus containment blocks deck keys;
Escape restores the summary. Reading/no-JavaScript keep native inline details;
print exposes complete code and provenance. Receivers never open the modal.
The optional language example uses up to 1600px of safe dialog width, without
shrinking code. Below 1400px viewports its two source panels stack rather than
compressing each code column. Panel labels distinguish the C# AppHost from
the Go HTTP service it runs.
The hidden replay announcement stays anchored inside the page. A modal reserves
an existing page scrollbar gutter before locking root scrolling, then restores
it; it does not permanently narrow reading slides or shift right-hand badges.

The frozen suite still encodes the earlier block/replay/copy/version counts;
the local impact report lists required updates instead of editing tests or
hashes. The guide/member recordings contain the complete default output of
their plain get commands: Markdown content rendered as text in a redirected
capture, including its Loading line. Strict geometry/copy/branding/route
contracts remain the target. Service
source, approved title/abstract/event, official skill trees and the real PR
chain remain unchanged; the AppHost's upstream package update and publish-only
packaging are explicit local-draft changes.

The existing all-slide text-range/container audits encode the 41-slide published baseline. The draft uses a temporary 42-count copy for fit and lists copy/count/order test updates without changing the original tests. All 31 graph nodes/66 labels retain padded SVG checks after fonts load, icon/title and subtitle clearance, 22px titles and 20px details without truncation or compression. Copy and official imagery inherit the existing identity and spacing, rather than introducing a new visual world.

There are no faint pre-revealed graph guide paths. Each edge, arrowhead, and label shares a stage no earlier than either endpoint node. Forward/back state checks inspect actual rendered visibility, while reading, reduced motion, and print show complete connected graphs. The workflow filename/compile/lockfile strip is a centered intrinsic group with consistent gaps and vertical narrow-screen ordering; this does not center source code.

Padded inline code uses width-constrained boxes so platform monospace differences cannot push its background or glyphs past the containing text. Skill names retain compact intrinsic widths; the long-identifier regression still preserves exact text and underscore break opportunities without adding the historical timeout story back to the audience deck. Wider-font rendered regressions supplement the required Windows and Linux browser gates.

The opening action is sequential: **Start presentation** advances to `setup`, slide 2, then `thesis`, slide 3; direct chapter navigation remains separate. Image-led slides use the original capture's full aspect, with larger weather content and no wide blank contain frame. The live handoff shows direct, copyable Aspire docs/API commands, not a script entry point. The supporting feature story reads the guide before following its browser runtime configuration change through bot drafting, maintainer refinement and publication; experimental browser logging remains an unapplied proposal.

Main slides show the claim, code and demo content without evidence boilerplate.
Citation/version/proof footers move into each slide's speaker notes; the
sources appendix retains references. Recorded terminals keep only the short
Recorded CLI run label on stage, with their dates/versions/details in notes.
Practical closing commands and the source appendix remain visible.

The focal motion is command -> short recorded pause -> response expansion.
Ordinary commands stay anchored. Seven genuinely long responses opt into
`data-terminal-focus="true"`: on expansion their semantic heading visually
collapses and explicitly marked `.terminal-support` supporting copy becomes hidden
and inert. The terminal moves into that space, with a readable, single-scroller
output body filling the safe presentation height. Narrow presentation uses
the viewport's actual width rather than miniature projector type; counter,
status, and toolbar clearance remain. The short member-search and readiness
panels keep their original layout. Back restores the original title, support,
geometry; read/print/overview/no-JavaScript preserve the title and content.
Provenance stays in speaker notes. Native receivers follow the output fragment and reduced
motion settles instantly.

The existing short height/clip Web Animations sequence grows the result or
focused terminal. One advance runs the pause and expansion, never
autoplaying another command. Interruption, navigation, theme, and viewport
changes cancel or settle the pending sequence. Continuous recorded-run labels,
with complete source/capture details in notes prevent static Pages playback
from implying live execution or measured speed.
Read/print/reduced-motion and no-JS static content expose recorded pairs without
waiting. No visible status/excerpt row or reserved gap remains; announcements
use the incumbent visually hidden style. Every response is the full immutable
public-safe command stdout. Four responses remain JSON, two get commands
use default output, and wait/publish/deploy are plaintext. The old seven
recordings are not rewritten or relabeled. One bounded output body scrolls below the fixed header
and command; reading/print/no-JS expand naturally without clipping the last
line. Exact text/Range copy, JSON values/counts, gap measurements, keyboard/
wheel/touch scrolling, and retained motion/navigation/geometry are tested.
Full provenance/redaction rules are in `docs/CLI-REPLAY.md`.
