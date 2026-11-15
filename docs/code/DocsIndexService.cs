// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpts, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs#L102-L106
    private const float TitleWeight = 10.0f;      // H1 (page title)
    private const float SummaryWeight = 8.0f;     // Blockquote summary
    private const float HeadingWeight = 6.0f;     // H2/H3 headings
    private const float CodeWeight = 5.0f;        // Code identifiers
    private const float BodyWeight = 1.0f;        // Body text

// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs#L151-L220
    public async ValueTask EnsureIndexedAsync(CancellationToken cancellationToken = default)
    {
        if (_indexedDocuments is not null)
        {
            return;
        }

        await _indexLock.WaitAsync(cancellationToken).ConfigureAwait(false);

        try
        {
            if (_indexedDocuments is not null)
            {
                return;
            }

            var startTimestamp = Stopwatch.GetTimestamp();

            _logger.LogDebug("Loading aspire.dev documentation");

            var cachedDocuments = await _docsCache.GetIndexAsync(cancellationToken).ConfigureAwait(false);
            var cachedFingerprint = await _docsCache.GetIndexSourceFingerprintAsync(cancellationToken).ConfigureAwait(false);

            var content = await _docsFetcher.FetchDocsAsync(cancellationToken).ConfigureAwait(false);
            if (content is null)
            {
                if (cachedDocuments is not null)
                {
                    SetIndexedDocuments(cachedDocuments);

                    _logger.LogWarning(
                        "Failed to refresh Aspire documentation. Using cached index with {Count} documents.",
                        cachedDocuments.Length);

                    return;
                }

                _logger.LogWarning("Failed to fetch documentation");

                return;
            }

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

            var elapsedTime = Stopwatch.GetElapsedTime(startTimestamp);

            _logger.LogInformation("Indexed {Count} documents from aspire.dev in {ElapsedTime:ss\\.fff} seconds.", indexedDocumentsFromSource.Count, elapsedTime);
        }
        finally
        {
            _indexLock.Release();
        }
    }

// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsIndexService.cs#L266-L284
        var idf = new Dictionary<string, float>(documentFrequency.Count, StringComparer.Ordinal);
        var documentCount = documents.Count;
        foreach (var (token, count) in documentFrequency)
        {
            // In plain terms, IDF is a rarity multiplier. A term that appears in
            // nearly every doc, like "new" or "azure", should not move the ranking
            // much by itself. A rarer term, like "addredis" or "134", is stronger
            // evidence that a document is the one the user meant.
            //
            // The formula below is the smoothed BM25-style way to turn that rarity
            // into a small positive weight:
            //   log(1 + (N - df + 0.5) / (df + 0.5))
            // where N is the number of indexed docs and df is the number of docs that contain
            // the token. The 0.5 terms keep very small corpora from producing extreme weights,
            // while the +1 inside the log keeps terms that appear in every doc positive but tiny.
            // We only use the result as a rarity multiplier in the existing field scorer; this is
            // not a full BM25 implementation.
            idf[token] = MathF.Log(1.0f + (documentCount - count + 0.5f) / (count + 0.5f));
        }
