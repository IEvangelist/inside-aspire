# Inside Aspire

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

.NET developers attending Wisconsin .NET UG on November 17, 2026 at 6pm Central, and readers replaying the public talk afterward. The presenter has a 60-minute speaker slot.

## Product Purpose

Publish "Inside Aspire: The Architecture Behind the AI Loop" as a self-updating GitHub Pages deck alongside a runnable weather demo and a repeatable, read-only documentation CLI rehearsal.

## Capabilities and Constraints

The demo uses a C# AppHost and an actual NativeAOT ASP.NET Core API. The pinned sample's React map UI stays intact. Node is still a frontend development/build dependency, not the API runtime. Native publication must be verified on Windows and Linux.

The talk follows an existing product PR, agentic workflow run, reviewed docs PR, published Markdown corpus, C# index/parser, and CLI docs/API lookup. It does not dispatch a production workflow, invent a failure/repair story, recreate the parser, or claim instant self-learning.

Reviewed main-source pushes update the Pages deck. Pull requests build without deploying. Application skills are complete CLI-supplied project-local trees generated on an ephemeral runner without changing the presenter's profile.

## Brand Commitments

Use the official Aspire SVG logos without changing their proportions or fills, Poppins served locally, and the official purple system. Use straight ASCII quotation marks in authored public copy. Omit all unannounced versions and release dates. Preserve provider and license notices. This is community material, not an endorsement claim.

## Evidence on Hand

The approved public evidence chain is microsoft/aspire#19478, successful run 33887017276, and microsoft/aspire.dev#1619. Public source pins and the two explanatory articles are recorded in the repository's sources documentation.

## Accessibility & Inclusion

The deck must support keyboard navigation, stable deep links, overview, public-safe speaker notes, print, mobile scrolling, light/dark modes, and reduced motion.
