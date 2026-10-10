using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using Weather.Api;

namespace Weather.Tests;

public sealed class QueryTests
{
    [Theory]
    [InlineData("", 0)]
    [InlineData(" \t\r\n", 0)]
    [InlineData("\ufeff 2.5\u00a0", 2.5)]
    [InlineData("+2.5", 2.5)]
    [InlineData(".5", 0.5)]
    [InlineData("1.", 1)]
    [InlineData("2e1", 20)]
    [InlineData("0x2f", 47)]
    [InlineData("0X2F", 47)]
    [InlineData("0b101", 5)]
    [InlineData("0o77", 63)]
    [InlineData("-0", 0)]
    [InlineData("001", 1)]
    [InlineData("1e-9999", 0)]
    public void MatchesJavaScriptNumber(string text, double expected)
    {
        Assert.True(QueryValues.TryNumber(text, out var actual));
        Assert.Equal(expected, actual);
        if (expected == 0) Assert.Equal(0, BitConverter.DoubleToInt64Bits(actual));
    }

    [Theory]
    [InlineData("NaN")]
    [InlineData("Infinity")]
    [InlineData("-Infinity")]
    [InlineData("1e9999")]
    [InlineData("1,2")]
    [InlineData("1 2")]
    [InlineData("12junk")]
    [InlineData("-0x1")]
    [InlineData("+0x1")]
    [InlineData("0b2")]
    [InlineData("0o8")]
    [InlineData("0x")]
    [InlineData("１２")]
    [InlineData("\u00852\u0085")]
    public void RejectsNonFiniteOrNonJavaScriptNumbers(string text) =>
        Assert.False(QueryValues.TryNumber(text, out _));

    [Fact]
    public void RejectsMissingAndRepeatedCoordinates()
    {
        Assert.False(QueryValues.TryCoordinate(new QueryCollection(), "lat", 90, out _));
        var repeated = new StringValues(["1", "1"]);
        Assert.False(QueryValues.TryNumber(repeated, out _));
    }

    [Theory]
    [InlineData("90", 90, true)]
    [InlineData("-90", 90, true)]
    [InlineData("90.0001", 90, false)]
    [InlineData("180", 180, true)]
    [InlineData("-180", 180, true)]
    [InlineData("-180.0001", 180, false)]
    public void EnforcesCoordinateBounds(string text, double limit, bool valid)
    {
        var query = new QueryCollection(new Dictionary<string, StringValues> { ["lat"] = text });
        Assert.Equal(valid, QueryValues.TryCoordinate(query, "lat", limit, out _));
    }

    [Fact]
    public void TrimsSearchLikeJavaScriptAndRejectsRepeatedQueries()
    {
        var query = new QueryCollection(new Dictionary<string, StringValues> { ["q"] = "\ufeff Seattle\u00a0" });
        Assert.Equal("Seattle", QueryValues.SearchTerm(query));
        var repeated = new QueryCollection(new Dictionary<string, StringValues> { ["q"] = new[] { "a", "b" } });
        Assert.Equal("", QueryValues.SearchTerm(repeated));
    }

    [Fact]
    public void PreservesCaseSensitiveKeysAndUrlDecodingOfTheSimpleNodeQueryParser()
    {
        var request = new DefaultHttpContext().Request;
        request.QueryString = new("?lat=1&LAT=2&lon=%20&lat=3&q=%EF%BB%BF+Seattle%C2%A0");
        var query = QueryValues.Parse(request);
        Assert.Equal(new[] { "1", "3" }, query["lat"].ToArray());
        Assert.Equal("2", query["LAT"]);
        Assert.False(QueryValues.TryCoordinate(query, "lat", 90, out _));
        Assert.True(QueryValues.TryCoordinate(query, "lon", 180, out var longitude));
        Assert.Equal(0, longitude);
        Assert.Equal("Seattle", QueryValues.SearchTerm(query));
    }
}
