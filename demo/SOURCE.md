# Source and license

This demo adapts the MIT-licensed `samples/aspire-with-node` sample from
[`microsoft/aspire-samples`](https://github.com/microsoft/aspire-samples/tree/5fb269526842727ff6cb945c27398b093895a758/samples/aspire-with-node),
at the approved public commit `5fb269526842727ff6cb945c27398b093895a758`.

- `upstream/` contains all 62 original sample files, downloaded from the pinned
  raw GitHub URLs and checked against that commit's Git blob IDs. Its `LICENSE`
  is the source repository's MIT license, including the .NET Foundation notice.
- `frontend/` is a copy of the original frontend. Components, hooks, types, CSS,
  images, fonts, map controls, tile attribution and RainViewer radar attribution
  are unchanged. Only `vite.config.ts` changes: explicit native API transport
  aliases and proxying the API documentation and health paths.
- `Weather.Api/` replaces the original Express backend with .NET 10 Minimal
  APIs and NativeAOT. `upstream/api/src/index.ts`, `openapi.ts` and
  `instrumentation.ts` remain the parity reference, not a runtime dependency.
- `host/` is a public Aspire 13.6.1 C# scaffold, subsequently wired to the actual
  native executable and preserved React frontend.

The copied sample and its adaptation retain the source MIT terms in
[`upstream/LICENSE`](upstream/LICENSE). Map tiles and radar continue to use the
original upstream providers and attribution; this demo does not redistribute
their map or radar data.
