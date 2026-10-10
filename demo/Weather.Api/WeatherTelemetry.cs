using System.Diagnostics;
using System.Diagnostics.Metrics;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Weather.Api;

internal static class WeatherTelemetry
{
    internal const string Name = "Weather.Native";
    internal static readonly ActivitySource ActivitySource = new(Name);
    private static readonly Meter Meter = new(Name);
    private static readonly Counter<long> Requests = Meter.CreateCounter<long>("weather.requests");
    private static readonly Histogram<double> Duration =
        Meter.CreateHistogram<double>("weather.request.duration", "ms");

    internal static void Configure(WebApplicationBuilder builder)
    {
        builder.Logging.AddOpenTelemetry(options =>
        {
            options.IncludeFormattedMessage = true;
            options.IncludeScopes = true;
        });
        var telemetry = builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(
                builder.Configuration["OTEL_SERVICE_NAME"] ?? "weather-api"))
            .WithTracing(tracing => tracing
                .AddSource(Name)
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation())
            .WithMetrics(metrics => metrics
                .AddMeter(Name, "Microsoft.AspNetCore.Hosting", "Microsoft.AspNetCore.Server.Kestrel",
                    "System.Net.Http", "System.Runtime"));
        if (!string.IsNullOrEmpty(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
        {
            telemetry.UseOtlpExporter();
        }
    }

    internal static void Record(string operation, string outcome, long started)
    {
        var tags = new TagList { { "operation", operation }, { "outcome", outcome } };
        Requests.Add(1, tags);
        Duration.Record(Stopwatch.GetElapsedTime(started).TotalMilliseconds, tags);
    }
}
