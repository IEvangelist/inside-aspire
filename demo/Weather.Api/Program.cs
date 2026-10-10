using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Weather.Api;

var builder = WebApplication.CreateSlimBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = "wwwroot"
});
var port = int.Parse(builder.Configuration["PORT"] ?? "5000", CultureInfo.InvariantCulture);
builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(port));
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, WeatherJsonContext.Default));
builder.Services.AddSingleton(ProviderEndpoints.FromConfiguration(builder.Configuration));
// No ServiceDefaults resilience handler: the sample's 8s/2.5s/6s budgets are per request, without retries.
builder.Services.AddHttpClient<WeatherProvider>(http => http.Timeout = Timeout.InfiniteTimeSpan);
WeatherTelemetry.Configure(builder);
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, _, _) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "Aspire Weather Explorer API",
            Version = "1.0.0",
            Description = "Current conditions and forecasts from Open-Meteo, with Open-Meteo place search " +
                "and best-effort BigDataCloud reverse geocoding. All upstreams are keyless."
        };
        document.Servers = [new OpenApiServer { Url = "/", Description = "This API instance" }];
        return Task.CompletedTask;
    });
    options.AddOperationTransformer((operation, context, _) =>
    {
        if (context.Description.RelativePath == "api/weather")
        {
            operation.Parameters =
            [
                new OpenApiParameter
                {
                    Name = "lat", In = ParameterLocation.Query, Required = true,
                    Description = "Latitude in decimal degrees.",
                    Schema = new OpenApiSchema { Type = JsonSchemaType.Number, Minimum = "-90", Maximum = "90" }
                },
                new OpenApiParameter
                {
                    Name = "lon", In = ParameterLocation.Query, Required = true,
                    Description = "Longitude in decimal degrees.",
                    Schema = new OpenApiSchema { Type = JsonSchemaType.Number, Minimum = "-180", Maximum = "180" }
                }
            ];
        }
        else if (context.Description.RelativePath == "api/geocode")
        {
            operation.Parameters =
            [
                new OpenApiParameter
                {
                    Name = "q", In = ParameterLocation.Query, Required = true,
                    Description = "Place name to search for (minimum 2 characters).",
                    Schema = new OpenApiSchema { Type = JsonSchemaType.String, MinLength = 2 }
                }
            ];
        }
        return Task.CompletedTask;
    });
});

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/api/weather", WeatherEndpoints.WeatherAsync)
    .WithName("getWeather").WithTags("Weather")
    .WithSummary("Current conditions and 5-day forecast")
    .WithDescription("Current conditions, the next 12 local hours, and up to five local forecast dates, " +
        "plus a best-effort place name.")
    .Produces<WeatherResponse>(StatusCodes.Status200OK)
    .Produces<ErrorResponse>(StatusCodes.Status502BadGateway);
app.MapGet("/api/geocode", WeatherEndpoints.GeocodeAsync)
    .WithName("geocode").WithTags("Geocoding")
    .WithSummary("Search for places by name")
    .Produces<GeocodeResponse>(StatusCodes.Status200OK)
    .Produces<ErrorResponse>(StatusCodes.Status502BadGateway);
app.MapGet("/health", () => TypedResults.Text("Healthy", "text/plain"))
    .WithName("health").WithTags("System").WithSummary("Liveness probe")
    .Produces<string>(StatusCodes.Status200OK, "text/plain");
app.MapOpenApi("/openapi.json");
app.MapScalarApiReference("/reference", options => options
    .WithTitle("Aspire Weather Explorer API")
    .WithTheme(ScalarTheme.DeepSpace)
    .WithOpenApiRoutePattern("/openapi.json"));
if (!File.Exists(Path.Combine(app.Environment.WebRootPath, "index.html")))
{
    app.MapGet("/", () => TypedResults.Redirect("/reference")).ExcludeFromDescription();
}
app.Logger.LogInformation(
    "Weather API started; NativeAOT: {NativeAot}; JSON reflection enabled: {JsonReflection}.",
    !RuntimeFeature.IsDynamicCodeSupported, JsonSerializer.IsReflectionEnabledByDefault);
app.Run();
