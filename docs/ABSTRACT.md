# Inside Aspire: The Architecture Behind the AI Loop

**Wisconsin .NET UG**

November 17, 2026 at 6pm Central.

60-minute speaker slot

What if the code you ship helped write the documentation that teaches AI how to use it?

Join David Pine from Microsoft's Aspire team for a look at the engineering behind that loop. We'll follow a real product pull request through GitHub Agentic Workflows into a documentation draft, see where human review and publication fit, and then go inside the C# services that fetch, parse, cache, and search Aspire's Markdown documentation.

This is architecture you can watch working. From the terminal, we'll read the published documentation corpus, search its parsed documents and sections, retrieve the actual guidance, and look up C# APIs. Then we'll show how the official Aspire AI skills put those tools to use, with an interactive weather map backed by a NativeAOT ASP.NET Core API as our application context.

Along the way, we'll explore Aspire's native CLI and dashboard, the boundaries that keep automation reviewable, and why exact, current documentation matters more than a clever prompt. You'll leave with the source, the deck, and a practical picture of how code, docs, CLI tools, and AI skills reinforce one another.

## Audience and takeaways

For .NET developers interested in distributed application architecture and grounded AI workflows. Basic familiarity with C#, GitHub PRs, and command-line tools is useful.

- Verify a native artifact instead of inferring AOT from a managed build.
- Use shipped Aspire skills for safe lifecycle and investigation.
- Trace a real cross-repo docs change through human review into a published corpus.
- Understand the C# parser/index and validate the CLI's actual retrieved content.
