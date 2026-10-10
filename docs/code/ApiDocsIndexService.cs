// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpt, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/ApiDocs/ApiDocsIndexService.cs#L538-L555
        var content = await _fetcher.FetchPageAsync(item.PageUrl, cancellationToken).ConfigureAwait(false);
        if (content is null)
        {
            return null;
        }

        content = ApiDocsSourceConfiguration.RewriteMarkdownLinks(content, item.PageUrl, _sitemapUrl);

        return new ApiContent
        {
            Id = item.Id,
            Name = item.Name,
            Language = item.Language,
            Kind = item.Kind,
            Url = item.PageUrl,
            ParentId = item.ParentId,
            MemberGroup = item.MemberGroup,
            Content = content
        };
