# Deck design

The user-approved direction is technical stage craft in the official Aspire identity: self-hosted Poppins, unchanged logo SVGs, `#7455dd`/`#512bd4` purple, and `#1f1e33` dark. Design variance 6, motion 3, and visual density 4 reflect a readable technical talk rather than a marketing template.

The first viewport is an asymmetric, left-aligned title beside the official mark. Controls stay outside the reveal.js viewport. Light/dark mode is page-wide; mobile uses natural reading flow rather than shrinking a desktop slide. A six-pixel radius groups controls and real content; shadows, gradients, and decorative card grids are not the organizing system.

The sequence alternates the actual native app capture, compiler/artifact diagram, real PR evidence, human-gated docs loop, C# excerpt, and live-terminal handoff. The docs loop has an explicit reviewed-change return leg. The API-ingestion diagram is separate and preserves the DLL/XML/PDB -> Roslyn -> C# Markdown -> CLI-index distinction.

The implementation uses semantic controls, visible focus, stable chapter/slide IDs, public-safe notes, print, reduced motion, and a skip link. The title and technical content were checked in desktop light/dark and 390px mobile; all applicable browser gates and the independent final confirmation passed. Automated accessibility and the bounded design scan found no remaining issues.

Images are real native/browser evidence with attribution, not reconstructed UI. Weather captures are labeled rehearsal data. Artwork and fonts retain their source licenses. `src/style.css` scopes presentation styling to the deck and reading mode; `src/main.ts` owns the small control layer around reveal.js.
