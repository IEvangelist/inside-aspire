using System.Text.Json;
using Weather.Api;

namespace Weather.Tests;

public sealed class MappingTests
{
    [Fact]
    public void SelectsLocalCurrentHourAndFiveDatesWithoutUtcConversion()
    {
        var forecast = new OpenMeteoForecast
        {
            Timezone = "Pacific/Auckland",
            Current = new() { Time = "2026-04-23T11:37", IsDay = 1 },
            Hourly = new()
            {
                Time = Enumerable.Range(0, 24).Select(hour => $"2026-04-23T{hour:00}:00").ToArray(),
                Temperature = [1], WeatherCode = [1]
            },
            Daily = new()
            {
                Time = ["2026-04-23", "2026-04-24", "2026-04-25", "2026-04-26", "2026-04-27", "2026-04-28"],
                Sunrise = ["2026-04-23T06:24"], Sunset = ["2026-04-23T17:43"],
                Maximum = [22], Minimum = [9], WeatherCode = [2]
            }
        };
        var result = WeatherMapping.Map(forecast, null, 47.6, -122.3);
        Assert.Equal("2026-04-23T11:37", result.Current.Time);
        Assert.Equal("2026-04-23T11:00", result.Hourly[0].Time);
        Assert.Equal("2026-04-23T22:00", result.Hourly[^1].Time);
        Assert.Equal(12, result.Hourly.Length);
        Assert.Equal(5, result.Daily.Length);
        Assert.Equal("2026-04-27", result.Daily[^1].Date);
        Assert.Equal("2026-04-23T06:24", result.Sun.Sunrise);
        Assert.Null(result.Hourly[0].TemperatureC);
        Assert.Equal(0, result.Hourly[0].WeatherCode);
        Assert.Null(result.Daily[1].MaxC);
        Assert.Null(result.Daily[1].PrecipitationProb);
        Assert.Equal(0, result.Daily[1].WeatherCode);
        Assert.True(result.Current.IsDay);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("2026-04-25T11:37")]
    public void StartsAtZeroWhenCurrentTimeMissingOrAllHoursArePast(string? time)
    {
        var result = WeatherMapping.Map(new()
        {
            Current = new() { Time = time },
            Hourly = new() { Time = ["2026-04-23T00:00", "2026-04-23T01:00"] }
        }, null, 0, 0);
        Assert.Equal("2026-04-23T00:00", result.Hourly[0].Time);
    }

    [Fact]
    public void SerializesEveryNullAndErrorWithSourceGeneratedCamelCaseMetadata()
    {
        var weather = WeatherMapping.Map(new(), null, 0, 0);
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(weather, WeatherJsonContext.Default.WeatherResponse));
        var root = json.RootElement;
        Assert.Equal(JsonValueKind.Null, root.GetProperty("location").GetProperty("name").ValueKind);
        Assert.Equal(JsonValueKind.Null, root.GetProperty("location").GetProperty("timezone").ValueKind);
        Assert.Equal(JsonValueKind.Null, root.GetProperty("current").GetProperty("temperatureC").ValueKind);
        Assert.Equal(JsonValueKind.Null, root.GetProperty("current").GetProperty("time").ValueKind);
        Assert.Equal(JsonValueKind.Null, root.GetProperty("sun").GetProperty("sunrise").ValueKind);
        Assert.False(root.GetProperty("current").GetProperty("isDay").GetBoolean());
        Assert.Empty(root.GetProperty("hourly").EnumerateArray());
        Assert.Empty(root.GetProperty("daily").EnumerateArray());
        Assert.Equal("""{"error":"failure"}""",
            JsonSerializer.Serialize(new ErrorResponse("failure"), WeatherJsonContext.Default.ErrorResponse));
        Assert.Equal("\"Healthy\"", JsonSerializer.Serialize("Healthy", WeatherJsonContext.Default.String));
    }

    [Fact]
    public void PreservesReverseFallbackTruthinessAndGeocodeNulls()
    {
        Assert.Equal(new PlaceName("Locality", "Region", null),
            WeatherMapping.Map(new ReverseGeocode { City = "", Locality = "Locality", PrincipalSubdivision = "Region" }));
        Assert.Equal(new PlaceName("Region", "Region", null),
            WeatherMapping.Map(new ReverseGeocode { City = "", Locality = "", PrincipalSubdivision = "Region" }));
        Assert.Equal(new PlaceName(" ", null, null), WeatherMapping.Map(new ReverseGeocode { City = " " }));
        Assert.Equal(new PlaceName(null, null, null), WeatherMapping.Map(new ReverseGeocode()));
        Assert.Empty(WeatherMapping.Map(new GeocodeSearch()).Results);
        var places = WeatherMapping.Map(new GeocodeSearch
        {
            Results = [new() { Name = "Place", Latitude = 1, Longitude = 2 }]
        });
        Assert.Equal(new GeocodeResult("Place", null, null, 1, 2), places.Results[0]);
    }

    [Fact]
    public void DeserializesEveryUpstreamWithSourceGeneratedMetadata()
    {
        var forecast = JsonSerializer.Deserialize(
            """{"current":{"temperature_2m":12.5,"is_day":1},"hourly":{"temperature_2m":[null]},"daily":{"precipitation_probability_max":[null]}}""",
            WeatherJsonContext.Default.OpenMeteoForecast)!;
        Assert.Equal(12.5, forecast.Current!.Temperature);
        Assert.Null(forecast.Hourly!.Temperature![0]);
        Assert.Null(forecast.Daily!.PrecipitationProbability![0]);
        var reverse = JsonSerializer.Deserialize("""{"city":"Place","countryName":"Country"}""",
            WeatherJsonContext.Default.ReverseGeocode)!;
        Assert.Equal("Country", reverse.CountryName);
        var search = JsonSerializer.Deserialize(
            """{"results":[{"name":"Place","latitude":1,"longitude":2}]}""", WeatherJsonContext.Default.GeocodeSearch)!;
        Assert.Equal("Place", search.Results![0].Name);
    }
}
