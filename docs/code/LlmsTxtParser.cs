// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpts, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/LlmsTxtParser.cs#L140-L144
        var span = content.AsSpan();
        var codeBlocks = FindCodeBlockRegions(span);

        // Find all document boundaries (line indices where H1 headers start)
        var docBoundaries = FindDocumentBoundaries(span, codeBlocks);

// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/LlmsTxtParser.cs#L464-L466
        // Find all section headings (H2+) using the pre-computed fence regions
        // passed down from ParseAsync.
        var sectionStarts = FindSectionHeadings(docSpan, codeBlocks);
