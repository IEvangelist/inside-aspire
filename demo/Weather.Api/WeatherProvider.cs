using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Microsoft.AspNetCore.WebUtilities;

namespace Weather.Api;

internal sealed record ProviderEndpoints(Uri Forecast, Uri Reverse, Uri Search)
{
    internal static ProviderEndpoints FromConfiguration(IConfiguration configuration) => new(
        new Uri(new Uri(configuration["OPEN_METEO_URL"] ?? "https://api.open-meteo.com"),
            "/v1/forecast"),
        new Uri(configuration["REVERSE_GEOCODE_URL"]
            ?? "https://api.bigdatacloud.net/data/reverse-geocode-client"),
        new Uri(configuration["GEOCODING_URL"]
            ?? "https://geocoding-api.open-meteo.com/v1/search"));
}

internal sealed class ProviderException(string provider, Exception inner)
    : Exception($"{provider} request failed.", inner);

internal sealed class WeatherProvider(
    HttpClient http, ProviderEndpoints endpoints, ILogger<WeatherProvider> logger)
{
    internal static readonly TimeSpan ForecastTimeout = TimeSpan.FromSeconds(8);
    internal static readonly TimeSpan ReverseTimeout = TimeSpan.FromMilliseconds(2500);
    internal static readonly TimeSpan SearchTimeout = TimeSpan.FromSeconds(6);

    internal async Task<WeatherResponse> WeatherAsync(double lat, double lon, CancellationToken cancellationToken)
    {
        var coordinates = Coordinates(lat, lon);
        var forecastUrl = QueryHelpers.AddQueryString(endpoints.Forecast.AbsoluteUri,
            new Dictionary<string, string?>
            {
                ["latitude"] = coordinates.Lat,
                ["longitude"] = coordinates.Lon,
                ["current"] = "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,uv_index",
                ["hourly"] = "temperature_2m,weather_code",
                ["daily"] = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
                ["timezone"] = "auto",
                ["forecast_days"] = "5"
            });

        var forecast = FetchJsonAsync(new Uri(forecastUrl), ForecastTimeout,
            WeatherJsonContext.Default.OpenMeteoForecast, "Open-Meteo", cancellationToken);
        var place = ReverseAsync(coordinates.Lat, coordinates.Lon, cancellationToken);
        await Task.WhenAll(forecast, place);
        return WeatherMapping.Map(await forecast, await place, lat, lon);
    }

    internal async Task<GeocodeResponse> SearchAsync(string query, CancellationToken cancellationToken)
    {
        var url = QueryHelpers.AddQueryString(endpoints.Search.AbsoluteUri,
            new Dictionary<string, string?>
            {
                ["name"] = query,
                ["count"] = "5",
                ["language"] = "en",
                ["format"] = "json"
            });
        var response = await FetchJsonAsync(new Uri(url), SearchTimeout,
            WeatherJsonContext.Default.GeocodeSearch, "Geocoding", cancellationToken);
        return WeatherMapping.Map(response);
    }

    private async Task<PlaceName?> ReverseAsync(string lat, string lon, CancellationToken cancellationToken)
    {
        var url = QueryHelpers.AddQueryString(endpoints.Reverse.AbsoluteUri,
            new Dictionary<string, string?>
            {
                ["latitude"] = lat,
                ["longitude"] = lon,
                ["localityLanguage"] = "en"
            });
        try
        {
            var response = await FetchJsonAsync(new Uri(url), ReverseTimeout,
                WeatherJsonContext.Default.ReverseGeocode, "Reverse geocoding", cancellationToken);
            return WeatherMapping.Map(response);
        }
        catch (ProviderException exception)
        {
            logger.LogWarning(new EventId(2001, "ReverseGeocodeDegraded"), exception,
                "Reverse geocoding failed; returning null place metadata.");
            return null;
        }
    }

    private async Task<T> FetchJsonAsync<T>(Uri url, TimeSpan timeout, JsonTypeInfo<T> jsonType,
        string provider, CancellationToken cancellationToken) where T : class
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(timeout);
        try
        {
            using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync(jsonType, deadline.Token)
                ?? throw new JsonException($"{provider} returned JSON null.");
        }
        catch (HttpRequestException exception)
        {
            throw new ProviderException(provider, exception);
        }
        catch (JsonException exception)
        {
            throw new ProviderException(provider, exception);
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            throw new ProviderException(provider,
                new TimeoutException($"{provider} exceeded its {timeout.TotalMilliseconds:0} ms deadline.", exception));
        }
    }

    private static (string Lat, string Lon) Coordinates(double lat, double lon) =>
        (lat.ToString("G", CultureInfo.InvariantCulture), lon.ToString("G", CultureInfo.InvariantCulture));
}
