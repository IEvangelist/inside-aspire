// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
// Source excerpt, not a standalone implementation. See ASPIRE-LICENSE.txt.
// https://github.com/microsoft/aspire/blob/213aa53159663c6f3e4a29bf7df907179ae6e1c4/src/Aspire.Cli/Documentation/SourceContentFingerprint.cs#L32-L46
    public static string Compute(string content, int schemaVersion)
    {
        ArgumentNullException.ThrowIfNull(content);

        var xxHash = new XxHash3();

        // Mix the schema version into the hash before the content so callers can
        // invalidate prior caches by bumping their constant.
        Span<byte> versionBytes = stackalloc byte[sizeof(int)];
        BinaryPrimitives.WriteInt32LittleEndian(versionBytes, schemaVersion);
        xxHash.Append(versionBytes);

        xxHash.Append(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(xxHash.GetCurrentHash()).ToLowerInvariant();
    }
