# Notices and attribution

## Repository and original sample

Repository code is provided under [MIT](LICENSE), except for material with its own license below.

The React weather/map UI and archived original source sample images come from [microsoft/aspire-samples](https://github.com/microsoft/aspire-samples/tree/5fb269526842727ff6cb945c27398b093895a758/samples/aspire-with-node), commit `5fb269526842727ff6cb945c27398b093895a758`. The original [MIT license](licenses/aspire-samples-MIT.txt) is preserved. The API is a C# rewrite; retained frontend behavior and attribution are intentional.

The deck's Madison screenshots are actual captures of this native artifact with live public providers, encoded as WebP without changing the UI. They are labeled rehearsal captures because weather changes. Map and weather attribution remain visible. The archived upstream screenshots remain under `demo/upstream/images` as source provenance.

## Aspire artwork and trademark

Official SVG assets are unchanged copies from [microsoft/aspire-brand](https://github.com/microsoft/aspire-brand/tree/f9eb464dec47870de23d55dd7b3c00d39122813d), commit `f9eb464dec47870de23d55dd7b3c00d39122813d`.

Artwork is released under [CC0 1.0 Universal](licenses/aspire-brand-CC0.txt). CC0 does not waive or license trademark rights. The Aspire name and logos remain subject to Microsoft's trademark rights and brand guidance. This community presentation does not imply endorsement or sponsorship. Logo fills and proportions are not modified.

## Fonts, deck, and skills

- Poppins: copyright the Poppins Project Authors, [SIL Open Font License 1.1](licenses/Poppins-OFL.txt). Fonts are self-hosted; no remote Google Fonts request is needed.
- reveal.js: [original MIT license](licenses/revealjs-MIT.txt).
- Presentation icons: one family, [Primer Octicons](https://primer.style/octicons), [MIT](deck/public/licenses/octicons-MIT.txt).
- Syntax highlighting: [Highlight.js](https://highlightjs.org), [BSD-3-Clause](deck/public/licenses/highlightjs-BSD.txt).
- Official application skills: Microsoft, [original MIT license](licenses/aspire-skills-MIT.txt); [all source and CLI-generation provenance](docs/SKILLS.md). The seven skill trees are complete and unmodified.
- The published deck also includes its artwork/font/reveal.js license files under `/inside-aspire/licenses/`.

Dependencies retain their own licenses. Linked articles and external source material retain their copyrights and are not relicensed by this repository.

## Speaker imagery and GitHub content branding

David Pine's portrait is his existing public GitHub/site avatar, self-hosted proportionally at its original 300x300 resolution and used at the user's direction. It was not synthesized or replaced with stock imagery. The product/docs PR header images are genuine public browser captures.

Black/white GitHub marks are unchanged files from [the official archive](https://brand.github.com/GitHub_Logos.zip), used for source links, PR/workflow content, and integration context in secondary placement to Aspire. GitHub trademarks and copyrights remain GitHub's; the deck does not imply sponsorship or endorsement. See [asset and code provenance](docs/PRESENTATION-ASSETS.md) and [GitHub's usage guidance](https://brand.github.com/foundations/logo).

## Weather, map, geocoding, and radar providers

Keep the original UI's attribution visible when using or adapting the demo:

- Weather data by [Open-Meteo](https://open-meteo.com), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Map data copyright [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [ODbL](https://www.openstreetmap.org/copyright).
- Basemap tiles by [CARTO](https://carto.com/attributions) and [Esri](https://www.esri.com).
- Radar imagery by [RainViewer](https://www.rainviewer.com).
- Reverse geocoding by [BigDataCloud](https://www.bigdatacloud.com).

Provider terms, availability, attribution, and quotas remain applicable. This local, unauthenticated demo is not a production security, caching, or quota-management pattern.
