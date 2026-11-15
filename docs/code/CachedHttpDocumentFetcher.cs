// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpts, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/CachedHttpDocumentFetcher.cs#L39-L43
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            if (!string.IsNullOrEmpty(cachedETag))
            {
                request.Headers.IfNoneMatch.Add(new EntityTagHeaderValue(cachedETag));
            }

// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/CachedHttpDocumentFetcher.cs#L48-L86
            if (response is { StatusCode: HttpStatusCode.NotModified })
            {
                logger.LogDebug("Server returned 304 Not Modified for {Url}", url);

                var cached = await cache.GetAsync(storageKey, cancellationToken).ConfigureAwait(false);
                if (cached is not null)
                {
                    return cached;
                }

                logger.LogDebug("Cached ETag exists but cached content is missing for {Url}; clearing ETag and retrying", url);
                await cache.SetETagAsync(storageKey, null, cancellationToken).ConfigureAwait(false);

                using var retryResponse = await httpClient.GetAsync(url, cancellationToken).ConfigureAwait(false);
                retryResponse.EnsureSuccessStatusCode();

                var retryContent = await retryResponse.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
                var retryETag = retryResponse.Headers.ETag?.Tag;
                if (!string.IsNullOrEmpty(retryETag))
                {
                    await cache.SetETagAsync(storageKey, retryETag, cancellationToken).ConfigureAwait(false);
                }

                await cache.SetAsync(storageKey, retryContent, cancellationToken).ConfigureAwait(false);
                logger.LogInformation("Fetched content from {Url} after retry, length: {Length} chars", url, retryContent.Length);
                return retryContent;
            }

            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            var newETag = response.Headers.ETag?.Tag;
            if (!string.IsNullOrEmpty(newETag))
            {
                await cache.SetETagAsync(storageKey, newETag, cancellationToken).ConfigureAwait(false);
                logger.LogDebug("Stored new ETag for {Url}: {ETag}", url, newETag);
            }

            await cache.SetAsync(storageKey, content, cancellationToken).ConfigureAwait(false);
