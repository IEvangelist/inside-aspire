using System.Text.Json.Serialization;

namespace Weather.Api;

internal sealed record WeatherResponse(
    WeatherLocation Location,
    CurrentWeather Current,
    SunTimes Sun,
    HourlyPoint[] Hourly,
    DailyPoint[] Daily);

internal sealed record WeatherLocation(
    string? Name, string? Region, string? Country,
    double Latitude, double Longitude, string? Timezone);

internal sealed record CurrentWeather(
    double? TemperatureC, double? ApparentC, double? Humidity,
    int WeatherCode, double? WindSpeedKph, double? UvIndex,
    bool IsDay, string? Time);

internal sealed record SunTimes(string? Sunrise, string? Sunset);
internal sealed record HourlyPoint(string Time, double? TemperatureC, int WeatherCode);
internal sealed record DailyPoint(
    string Date, int WeatherCode, double? MaxC, double? MinC, double? PrecipitationProb);
internal sealed record PlaceName(string? Name, string? Region, string? Country);
internal sealed record GeocodeResult(
    string Name, string? Region, string? Country, double Latitude, double Longitude);
internal sealed record GeocodeResponse(GeocodeResult[] Results);
internal sealed record ErrorResponse(string Error);

internal sealed class OpenMeteoForecast
{
    public string? Timezone { get; init; }
    public OpenMeteoCurrent? Current { get; init; }
    public OpenMeteoHourly? Hourly { get; init; }
    public OpenMeteoDaily? Daily { get; init; }
}

internal sealed class OpenMeteoCurrent
{
    public string? Time { get; init; }
    [JsonPropertyName("temperature_2m")]
    public double? Temperature { get; init; }
    [JsonPropertyName("apparent_temperature")]
    public double? ApparentTemperature { get; init; }
    [JsonPropertyName("relative_humidity_2m")]
    public double? Humidity { get; init; }
    [JsonPropertyName("weather_code")]
    public int? WeatherCode { get; init; }
    [JsonPropertyName("wind_speed_10m")]
    public double? WindSpeed { get; init; }
    [JsonPropertyName("is_day")]
    public int? IsDay { get; init; }
    [JsonPropertyName("uv_index")]
    public double? UvIndex { get; init; }
}

internal sealed class OpenMeteoHourly
{
    public string[]? Time { get; init; }
    [JsonPropertyName("temperature_2m")]
    public double?[]? Temperature { get; init; }
    [JsonPropertyName("weather_code")]
    public int?[]? WeatherCode { get; init; }
}

internal sealed class OpenMeteoDaily
{
    public string[]? Time { get; init; }
    [JsonPropertyName("weather_code")]
    public int?[]? WeatherCode { get; init; }
    [JsonPropertyName("temperature_2m_max")]
    public double?[]? Maximum { get; init; }
    [JsonPropertyName("temperature_2m_min")]
    public double?[]? Minimum { get; init; }
    [JsonPropertyName("precipitation_probability_max")]
    public double?[]? PrecipitationProbability { get; init; }
    public string[]? Sunrise { get; init; }
    public string[]? Sunset { get; init; }
}

internal sealed class ReverseGeocode
{
    public string? City { get; init; }
    public string? Locality { get; init; }
    public string? PrincipalSubdivision { get; init; }
    public string? CountryName { get; init; }
}

internal sealed class GeocodeSearch
{
    public GeocodeSearchResult[]? Results { get; init; }
}

internal sealed class GeocodeSearchResult
{
    public required string Name { get; init; }
    public string? Admin1 { get; init; }
    public string? Country { get; init; }
    public double Latitude { get; init; }
    public double Longitude { get; init; }
}
