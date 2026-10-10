using System.Globalization;
using Weather.Api;

namespace Weather.Fixtures;

internal static class FixtureData
{
    internal static OpenMeteoForecast Forecast(double latitude) => new()
    {
        Timezone = "Pacific/Auckland",
        Current = new OpenMeteoCurrent
        {
            Time = latitude == 9 ? "2026-04-25T11:37" : "2026-04-23T11:37",
            Temperature = 21.5, ApparentTemperature = 20, Humidity = 68,
            WeatherCode = 2, WindSpeed = 13.2, IsDay = 1, UvIndex = 4.5
        },
        Hourly = new OpenMeteoHourly
        {
            Time = Enumerable.Range(0, 24)
                .Select(hour => $"2026-04-23T{hour:00}:00").ToArray(),
            Temperature = Enumerable.Range(0, 24)
                .Select(hour => hour == 14 ? (double?)null : 10 + hour * 0.5).ToArray(),
            WeatherCode = Enumerable.Range(0, 24)
                .Select(hour => hour == 15 ? (int?)null : hour % 4).ToArray()
        },
        Daily = new OpenMeteoDaily
        {
            Time = Enumerable.Range(0, 6).Select(day =>
                new DateOnly(2026, 4, 23).AddDays(day).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)).ToArray(),
            WeatherCode = [2, 3, null, 61, 0, 1],
            Maximum = [22, 23, 24, 25, 26, 27],
            Minimum = [9, 10],
            PrecipitationProbability = [0, null, 35],
            Sunrise = ["2026-04-23T06:24"],
            Sunset = ["2026-04-23T17:43"]
        }
    };

    internal static ReverseGeocode Reverse(double latitude) => latitude switch
    {
        10 => new() { City = "", Locality = "Fallback Locality", PrincipalSubdivision = "Fixture Region" },
        11 => new() { City = "", Locality = "", PrincipalSubdivision = "Fallback Region", CountryName = "" },
        12 => new(),
        _ => new()
        {
            City = "Fixture City", Locality = "Fixture Locality",
            PrincipalSubdivision = "Fixture Region", CountryName = "Fixture Country"
        }
    };

    internal static GeocodeSearch Search(string name) => name switch
    {
        "Missing" => new(),
        "Empty" => new() { Results = [] },
        "Nulls" => new()
        {
            Results = [new() { Name = "No Metadata", Latitude = 47.6, Longitude = -122.3 }]
        },
        "Shape" => new()
        {
            Results = Enumerable.Range(0, 6).Select(index => new GeocodeSearchResult
            {
                Name = $"Match {index}", Latitude = index, Longitude = -index
            }).ToArray()
        },
        _ => new()
        {
            Results =
            [
                new()
                {
                    Name = "Fixture City", Admin1 = "Fixture Region", Country = "Fixture Country",
                    Latitude = 47.6, Longitude = -122.3
                },
                new() { Name = "Fixture Harbor", Latitude = 48, Longitude = -123 }
            ]
        }
    };
}
