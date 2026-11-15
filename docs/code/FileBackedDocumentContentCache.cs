// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpt, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/FileBackedDocumentContentCache.cs#L30-L51
    public async Task<string?> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var cacheKey = GetMemoryCacheKey("text", key);
        if (_memoryCache.TryGetValue(cacheKey, out string? content))
        {
            _logger.LogDebug("Content cache memory hit for key: {Key}", key);
            return content;
        }

        var diskContent = await ReadTextFileAsync(GetTextFilePath(key), cancellationToken).ConfigureAwait(false);
        if (diskContent is not null)
        {
            _memoryCache.Set(cacheKey, diskContent);
            _logger.LogDebug("Content cache disk hit for key: {Key}", key);
            return diskContent;
        }

        _logger.LogDebug("Content cache miss for key: {Key}", key);
        return null;
    }
