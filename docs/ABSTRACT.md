# Inside Aspire: The Architecture Behind the AI Loop

**Wisconsin .NET UG**

November 17, 2026 at 6pm Central.

60-minute speaker slot

What actually connects a product change to better-grounded AI-assisted development? This session opens the architecture instead of treating the loop as magic.

We start with a healthy weather explorer: a C# Aspire AppHost, an ASP.NET Core API compiled with NativeAOT, and the original React map UI. Then we follow a real merged product PR through an existing GitHub Agentic Workflow run, a reviewed docs PR, published Markdown, and the C# fetching, parsing, caching, and lexical-search services behind Aspire's documentation tools. The command line is the proof: find the change, retrieve the returned section, and inspect the separate C# API-reference index.

Along the way we use the actual Aspire skills that ship with the CLI and distinguish workflow guidance from executable tools and MCP. Human review, merge, and deployment remain explicit boundaries. This is an inspectable documentation and retrieval loop, not instant self-learning or a model-training claim.

Attendees leave with a public demo repository, an official-brand reveal.js deck, complete shipped skills, and a repeatable rehearsal they can run before applying the same architecture to their own work.

## Audience and takeaways

For .NET developers interested in distributed application architecture and grounded AI workflows. Basic familiarity with C#, GitHub PRs, and command-line tools is useful.

- Verify a native artifact instead of inferring AOT from a managed build.
- Use shipped Aspire skills for safe lifecycle and investigation.
- Trace a real cross-repo docs change through human review into a published corpus.
- Understand the C# parser/index and validate the CLI's actual retrieved content.
