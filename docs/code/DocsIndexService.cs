// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpts, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs#L102-L106
    private const float TitleWeight = 10.0f;      // H1 (page title)
    private const float SummaryWeight = 8.0f;     // Blockquote summary
    private const float HeadingWeight = 6.0f;     // H2/H3 headings
    private const float CodeWeight = 5.0f;        // Code identifiers
    private const float BodyWeight = 1.0f;        // Body text

// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs#L193-L210
            var currentFingerprint = SourceContentFingerprint.Compute(content, IndexSchemaVersion);
            if (cachedDocuments is not null && string.Equals(cachedFingerprint, currentFingerprint, StringComparison.Ordinal))
            {
                var indexedDocuments = SetIndexedDocuments(cachedDocuments);

                var cacheElapsedTime = Stopwatch.GetElapsedTime(startTimestamp);
                _logger.LogInformation("Loaded {Count} documents from cache in {ElapsedTime:ss\\.fff} seconds.", indexedDocuments.Count, cacheElapsedTime);
                return;
            }

            var documents = await LlmsTxtParser.ParseAsync(content, cancellationToken).ConfigureAwait(false);

            // Pre-compute normalized versions for faster searching
            var indexedDocumentsFromSource = SetIndexedDocuments(documents);

            // Cache the parsed documents for next time
            await _docsCache.SetIndexAsync([.. documents], cancellationToken).ConfigureAwait(false);
            await _docsCache.SetIndexSourceFingerprintAsync(currentFingerprint, cancellationToken).ConfigureAwait(false);
