#:sdk Aspire.AppHost.Sdk@13.6.1
#:property AspireUseCliBundle=true
#:property TreatWarningsAsErrors=true
#:package Aspire.Hosting.JavaScript@13.6.1

using System.Runtime.InteropServices;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;

var builder = DistributedApplication.CreateBuilder(args);
var rid = builder.Configuration["NativeRuntimeIdentifier"]
    ?? (OperatingSystem.IsWindows() ? "win-x64" : "linux-x64");
if (rid is not ("win-x64" or "linux-x64")
    || RuntimeInformation.OSArchitecture != Architecture.X64)
{
    throw new InvalidOperationException("The weather demo requires a supported native x64 artifact (win-x64 or linux-x64).");
}
var nativeDirectory = Path.GetFullPath(Path.Combine(builder.AppHostDirectory, "..", ".artifacts", "native", rid));
var extension = OperatingSystem.IsWindows() ? ".exe" : "";
var executable = Path.Combine(nativeDirectory, $"Weather.Api{extension}");
if (!File.Exists(executable))
{
    throw new FileNotFoundException(
        $"Native weather artifact is missing: {executable}. Prepare it with " +
        $"pwsh -File scripts\\Publish-Native.ps1 -RuntimeIdentifier {rid}. The AppHost never falls back to a managed API.",
        executable);
}

var api = builder.AddExecutable("api", executable, nativeDirectory)
    .WithHttpEndpoint(env: "PORT")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints()
    .WithOtlpExporter(OtlpProtocol.HttpProtobuf)
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
    .WithEnvironment("OTEL_METRIC_EXPORT_INTERVAL", "1000")
    .WithEnvironment("OTEL_BSP_SCHEDULE_DELAY", "500")
    .WithEnvironment("OTEL_BLRP_SCHEDULE_DELAY", "500");

if (bool.TryParse(builder.Configuration["UseFixtures"], out var useFixtures) && useFixtures)
{
    var fixtureDirectory = Path.Combine(nativeDirectory, "fixtures");
    var fixtureExecutable = Path.Combine(fixtureDirectory, $"Weather.Fixtures{extension}");
    if (!File.Exists(fixtureExecutable))
    {
        throw new FileNotFoundException(
            $"Native provider fixture is missing: {fixtureExecutable}. Run pwsh -File scripts\\Publish-Native.ps1 -RuntimeIdentifier {rid}.",
            fixtureExecutable);
    }
    var fixture = builder.AddExecutable("provider-fixture", fixtureExecutable, fixtureDirectory)
        .WithHttpEndpoint(env: "PORT")
        .WithHttpHealthCheck("/health")
        .WithOtlpExporter(OtlpProtocol.HttpProtobuf)
        .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
    var endpoint = fixture.GetEndpoint("http");
    api.WithReference(endpoint).WaitFor(fixture)
        .WithEnvironment("OPEN_METEO_URL", endpoint)
        .WithEnvironment("REVERSE_GEOCODE_URL",
            ReferenceExpression.Create($"{endpoint}/data/reverse-geocode-client"))
        .WithEnvironment("GEOCODING_URL", ReferenceExpression.Create($"{endpoint}/v1/search"))
        // The fixture relays unchanged OTLP payloads to Aspire and counts accepted metric points.
        .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", endpoint);
}
else
{
    var forecast = builder.AddExternalService("open-meteo", "https://api.open-meteo.com")
        .WithHttpHealthCheck("/v1/forecast?latitude=0&longitude=0&current=temperature_2m");
    var reverse = builder.AddExternalService("reverse-geocoding",
            "https://api.bigdatacloud.net/data/reverse-geocode-client")
        .WithHttpHealthCheck("/data/reverse-geocode-client?latitude=0&longitude=0&localityLanguage=en");
    var search = builder.AddExternalService("geocoding", "https://geocoding-api.open-meteo.com/v1/search")
        .WithHttpHealthCheck("/v1/search?name=Seattle&count=1&language=en&format=json");
    api.WithReference(forecast).WithReference(reverse).WithReference(search)
        .WithEnvironment("OPEN_METEO_URL", forecast)
        .WithEnvironment("REVERSE_GEOCODE_URL", reverse)
        .WithEnvironment("GEOCODING_URL", search);
    // External-provider outages must not prevent startup or best-effort reverse-geocode degradation.
}

builder.AddViteApp("frontend", Path.Combine(builder.AppHostDirectory, "..", "frontend"))
    .WithNpm(install: false)
    .WithReference(api.GetEndpoint("http")).WaitFor(api)
    .WithEnvironment("API_HTTP", api.GetEndpoint("http"))
    .WithEnvironment("API_HTTPS", "")
    .WithHttpHealthCheck("/")
    .WithExternalHttpEndpoints();
builder.Build().Run();
