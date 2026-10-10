using System.Text.Json.Serialization;

namespace Weather.Api;

[JsonSourceGenerationOptions(
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.Never)]
[JsonSerializable(typeof(OpenMeteoForecast))]
[JsonSerializable(typeof(OpenMeteoCurrent))]
[JsonSerializable(typeof(OpenMeteoHourly))]
[JsonSerializable(typeof(OpenMeteoDaily))]
[JsonSerializable(typeof(ReverseGeocode))]
[JsonSerializable(typeof(GeocodeSearch))]
[JsonSerializable(typeof(GeocodeSearchResult[]))]
[JsonSerializable(typeof(WeatherResponse))]
[JsonSerializable(typeof(WeatherLocation))]
[JsonSerializable(typeof(CurrentWeather))]
[JsonSerializable(typeof(SunTimes))]
[JsonSerializable(typeof(HourlyPoint[]))]
[JsonSerializable(typeof(DailyPoint[]))]
[JsonSerializable(typeof(PlaceName))]
[JsonSerializable(typeof(GeocodeResponse))]
[JsonSerializable(typeof(GeocodeResult[]))]
[JsonSerializable(typeof(ErrorResponse))]
[JsonSerializable(typeof(string))]
internal partial class WeatherJsonContext : JsonSerializerContext;
