using System.Globalization;
using Weather.Api;
using Weather.Fixtures;

var builder = WebApplication.CreateSlimBuilder(args);
var port = int.Parse(builder.Configuration["PORT"] ?? throw new InvalidOperationException(
    "Run the fixtures through the demo AppHost, which assigns PORT."), CultureInfo.InvariantCulture);
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(port);
    options.Limits.MaxRequestBodySize = 4 * 1024 * 1024;
});
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, WeatherJsonContext.Default);
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, FixtureJsonContext.Default);
});
builder.Services.AddSingleton<FixtureState>();
builder.Services.AddHttpClient<OtlpRelay>(client => client.Timeout = TimeSpan.FromSeconds(10));

var app = builder.Build();
app.MapGet("/health", () => TypedResults.Text("Healthy", "text/plain"));
app.MapGet("/__fixture/stats", (FixtureState state) => TypedResults.Ok(state.Snapshot()));
app.MapPost("/__fixture/reset", (FixtureState state) =>
{
    state.ResetCalls();
    return TypedResults.Text("Reset", "text/plain");
});
app.MapPost("/v1/{signal}", (string signal, HttpRequest request, OtlpRelay relay,
    CancellationToken cancellationToken) => relay.ForwardAsync(signal, request, cancellationToken));
app.MapGet("/v1/forecast", async (HttpRequest request, FixtureState state,
    ILogger<FixtureState> logger, CancellationToken cancellationToken) =>
{
    if (!double.TryParse(request.Query["latitude"], CultureInfo.InvariantCulture, out var latitude)
        || !double.TryParse(request.Query["longitude"], CultureInfo.InvariantCulture, out _)
        || request.Query["current"] != "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,uv_index"
        || request.Query["hourly"] != "temperature_2m,weather_code"
        || request.Query["daily"] != "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"
        || request.Query["timezone"] != "auto" || request.Query["forecast_days"] != "5")
    {
        logger.LogWarning("Rejected forecast request that does not match the pinned provider protocol.");
        return (IResult)TypedResults.BadRequest(new FixtureError("Unexpected forecast query."));
    }
    state.Count("forecast", latitude.ToString("G", CultureInfo.InvariantCulture));
    if (latitude == 4) return TypedResults.StatusCode(StatusCodes.Status429TooManyRequests);
    if (latitude == 5) return TypedResults.Text("{broken", "application/json");
    if (latitude == 6) await Task.Delay(9000, cancellationToken);
    if (latitude == 7) return TypedResults.Text("null", "application/json");
    if (latitude == 13) await Task.Delay(400, cancellationToken);
    return TypedResults.Json(latitude == 8 ? new OpenMeteoForecast() : FixtureData.Forecast(latitude),
        WeatherJsonContext.Default.OpenMeteoForecast);
});
app.MapGet("/data/reverse-geocode-client", async (HttpRequest request, FixtureState state,
    ILogger<FixtureState> logger, CancellationToken cancellationToken) =>
{
    if (!double.TryParse(request.Query["latitude"], CultureInfo.InvariantCulture, out var latitude)
        || !double.TryParse(request.Query["longitude"], CultureInfo.InvariantCulture, out _)
        || request.Query["localityLanguage"] != "en")
    {
        logger.LogWarning("Rejected reverse lookup that does not match the pinned provider protocol.");
        return (IResult)TypedResults.BadRequest(new FixtureError("Unexpected reverse query."));
    }
    state.Count("reverse", latitude.ToString("G", CultureInfo.InvariantCulture));
    if (latitude == 1) return TypedResults.StatusCode(StatusCodes.Status503ServiceUnavailable);
    if (latitude == 2) await Task.Delay(3500, cancellationToken);
    if (latitude == 3) return TypedResults.Text("{broken", "application/json");
    if (latitude == 13) await Task.Delay(400, cancellationToken);
    return TypedResults.Json(FixtureData.Reverse(latitude), WeatherJsonContext.Default.ReverseGeocode);
});
app.MapGet("/v1/search", async (HttpRequest request, FixtureState state,
    ILogger<FixtureState> logger, CancellationToken cancellationToken) =>
{
    var name = request.Query["name"].ToString();
    if (name.Length < 2 || name != name.Trim() || request.Query["count"] != "5"
        || request.Query["language"] != "en" || request.Query["format"] != "json")
    {
        logger.LogWarning("Rejected search that does not match the pinned provider protocol.");
        return (IResult)TypedResults.BadRequest(new FixtureError("Unexpected search query."));
    }
    state.Count("search", name);
    if (name == "BadStatus") return TypedResults.StatusCode(StatusCodes.Status503ServiceUnavailable);
    if (name == "BadJson") return TypedResults.Text("{broken", "application/json");
    if (name == "Timeout") await Task.Delay(7000, cancellationToken);
    return TypedResults.Json(FixtureData.Search(name), WeatherJsonContext.Default.GeocodeSearch);
});
app.Run();
