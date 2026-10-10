namespace Weather.Api;

internal static class WeatherMapping
{
    internal static WeatherResponse Map(OpenMeteoForecast data, PlaceName? place, double lat, double lon)
    {
        var current = data.Current;
        var daily = data.Daily;
        var hourly = data.Hourly;
        var hourlyTimes = hourly?.Time ?? [];
        var nowHour = HourPrefix(current?.Time ?? "");
        var start = Array.FindIndex(hourlyTimes,
            time => string.CompareOrdinal(HourPrefix(time), nowHour) >= 0);
        if (start < 0)
        {
            start = 0;
        }

        return new WeatherResponse(
            new WeatherLocation(place?.Name, place?.Region, place?.Country, lat, lon, data.Timezone),
            new CurrentWeather(
                current?.Temperature, current?.ApparentTemperature, current?.Humidity,
                current?.WeatherCode ?? 0, current?.WindSpeed, current?.UvIndex,
                current?.IsDay == 1, current?.Time),
            new SunTimes(At(daily?.Sunrise, 0), At(daily?.Sunset, 0)),
            hourlyTimes.Skip(start).Take(12).Select((time, index) =>
                new HourlyPoint(time, At(hourly?.Temperature, start + index),
                    At(hourly?.WeatherCode, start + index) ?? 0)).ToArray(),
            (daily?.Time ?? []).Take(5).Select((date, index) =>
                new DailyPoint(date, At(daily?.WeatherCode, index) ?? 0,
                    At(daily?.Maximum, index), At(daily?.Minimum, index),
                    At(daily?.PrecipitationProbability, index))).ToArray());
    }

    internal static PlaceName Map(ReverseGeocode data) => new(
        NonEmpty(data.City) ?? NonEmpty(data.Locality) ?? NonEmpty(data.PrincipalSubdivision),
        NonEmpty(data.PrincipalSubdivision), NonEmpty(data.CountryName));

    internal static GeocodeResponse Map(GeocodeSearch data) => new(
        (data.Results ?? []).Select(result =>
            new GeocodeResult(result.Name, result.Admin1, result.Country,
                result.Latitude, result.Longitude)).ToArray());

    private static string HourPrefix(string time) => time[..Math.Min(13, time.Length)];
    private static string? NonEmpty(string? value) => string.IsNullOrEmpty(value) ? null : value;
    private static T? At<T>(T[]? values, int index) =>
        values is not null && index < values.Length ? values[index] : default;
}
