using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Primitives;

namespace Weather.Api;

internal static partial class QueryValues
{
    private static readonly char[] EcmaWhitespace =
    [
        '\u0009', '\u000a', '\u000b', '\u000c', '\u000d', '\u0020', '\u00a0',
        '\u1680', '\u2000', '\u2001', '\u2002', '\u2003', '\u2004', '\u2005',
        '\u2006', '\u2007', '\u2008', '\u2009', '\u200a', '\u2028', '\u2029',
        '\u202f', '\u205f', '\u3000', '\ufeff'
    ];

    internal static string Trim(string value) => value.Trim(EcmaWhitespace);

    internal static IQueryCollection Parse(HttpRequest request)
    {
        // ASP.NET's Query collection folds key case; Node's simple query parser does not.
        var values = new Dictionary<string, StringValues>(StringComparer.Ordinal);
        var query = request.QueryString.Value ?? "";
        var content = query.StartsWith('?') ? query[1..] : query;
        foreach (var pair in content.Split('&').Take(1000))
        {
            if (pair.Length == 0) continue;
            var separator = pair.IndexOf('=');
            var key = WebUtility.UrlDecode(separator < 0 ? pair : pair[..separator]);
            var value = WebUtility.UrlDecode(separator < 0 ? "" : pair[(separator + 1)..]);
            values[key] = values.TryGetValue(key, out var previous)
                ? StringValues.Concat(previous, value) : new StringValues(value);
        }
        return new QueryCollection(values);
    }

    internal static bool TryCoordinate(IQueryCollection query, string key, double limit, out double number)
    {
        number = double.NaN;
        return query.TryGetValue(key, out var value)
            && TryNumber(value, out number)
            && number >= -limit && number <= limit;
    }

    internal static string SearchTerm(IQueryCollection query) =>
        query.TryGetValue("q", out var values) && values.Count == 1
            ? Trim(values[0] ?? "") : "";

    internal static bool TryNumber(StringValues values, out double number)
    {
        // Express's simple query parser returns an array for repeated keys.
        // Number(array) uses comma-joined values, not the first value.
        var text = Trim(values.ToString());
        number = 0;
        if (text.Length == 0)
        {
            return true;
        }

        if (text.Length > 2 && text[0] == '0')
        {
            var radix = char.ToLowerInvariant(text[1]) switch
            {
                'x' => 16,
                'b' => 2,
                'o' => 8,
                _ => 0
            };
            if (radix != 0)
            {
                foreach (var character in text.AsSpan(2))
                {
                    var digit = character switch
                    {
                        >= '0' and <= '9' => character - '0',
                        >= 'a' and <= 'f' => character - 'a' + 10,
                        >= 'A' and <= 'F' => character - 'A' + 10,
                        _ => -1
                    };
                    if (digit < 0 || digit >= radix)
                    {
                        return false;
                    }
                    number = number * radix + digit;
                }
                return double.IsFinite(number);
            }
        }

        if (!DecimalNumber().IsMatch(text)
            || !double.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint
                | NumberStyles.AllowExponent, CultureInfo.InvariantCulture, out number)
            || !double.IsFinite(number))
        {
            return false;
        }

        // JSON.stringify(-0) emits 0.
        number = number == 0 ? 0 : number;
        return true;
    }

    [GeneratedRegex(@"\A[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?\z",
        RegexOptions.CultureInvariant)]
    private static partial Regex DecimalNumber();
}
