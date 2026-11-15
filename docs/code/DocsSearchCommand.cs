// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpt, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Commands/DocsSearchCommand.cs#L59-L66
        var limit = Math.Clamp(parseResult.GetValue(s_limitOption) ?? 5, 1, 10);

        _logger.LogDebug("Searching documentation for '{Query}' (limit: {Limit})", query, limit);

        // Search docs with status indicator
        var response = await InteractionService.ShowStatusAsync(
            DocsCommandStrings.LoadingDocumentation,
            async () => await _docsSearchService.SearchAsync(query, limit, cancellationToken));
