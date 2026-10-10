// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpt, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/Docs/DocsFetcher.cs#L34-L38
    public async Task<string?> FetchDocsAsync(CancellationToken cancellationToken = default)
    {
        await MigrateLegacyCacheAsync(cancellationToken).ConfigureAwait(false);
        return await CachedHttpDocumentFetcher.FetchAsync(_httpClient, _cache, _llmsTxtUrl, _cacheKey, _logger, cancellationToken).ConfigureAwait(false);
    }
