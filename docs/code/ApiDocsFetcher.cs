// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpts, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsFetcher.cs#L41-L42
    public Task<string?> FetchSitemapAsync(CancellationToken cancellationToken = default)
        => CachedHttpDocumentFetcher.FetchAsync(_httpClient, _cache, _sitemapUrl, _sitemapCacheKey, _logger, cancellationToken);

// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsFetcher.cs#L50-L55
    public Task<string?> FetchPageAsync(string pageUrl, CancellationToken cancellationToken = default)
    {
        var markdownUrl = ApiDocsSourceConfiguration.BuildMarkdownUrl(pageUrl, _sitemapUrl);
        var cacheKey = ApiDocsSourceConfiguration.GetPageContentCacheKey(pageUrl, _sitemapUrl);
        return CachedHttpDocumentFetcher.FetchAsync(_httpClient, _cache, markdownUrl, cacheKey, _logger, cancellationToken);
    }
