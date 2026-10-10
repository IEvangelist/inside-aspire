using System.Collections.Concurrent;
using System.Text.Json.Serialization;

namespace Weather.Fixtures;

internal sealed record TelemetryProof(
    long MetricBatches, long TraceBatches, long LogBatches,
    long WeatherRequestPoints, long WeatherRequestTotal, long WeatherDurationCount);
internal sealed record FixtureSnapshot(Dictionary<string, int> Calls, TelemetryProof Telemetry);
internal sealed record FixtureError(string Error);

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(FixtureSnapshot))]
[JsonSerializable(typeof(TelemetryProof))]
[JsonSerializable(typeof(FixtureError))]
[JsonSerializable(typeof(string))]
internal partial class FixtureJsonContext : JsonSerializerContext;

internal sealed class FixtureState
{
    private readonly ConcurrentDictionary<string, int> _calls = new(StringComparer.Ordinal);
    private readonly object _gate = new();
    private long _metricBatches, _traceBatches, _logBatches;
    private long _weatherRequestPoints, _weatherRequestTotal, _weatherDurationCount;

    internal void Count(string operation, string key) =>
        _calls.AddOrUpdate($"{operation}:{key}", 1, (_, count) => count + 1);

    internal void ResetCalls() => _calls.Clear();

    internal FixtureSnapshot Snapshot()
    {
        lock (_gate)
        {
            return new(_calls.ToDictionary(), new(
                _metricBatches, _traceBatches, _logBatches,
                _weatherRequestPoints, _weatherRequestTotal, _weatherDurationCount));
        }
    }

    internal void AcceptedTelemetry(string signal, ReadOnlyMemory<byte> payload)
    {
        lock (_gate)
        {
            switch (signal)
            {
                case "metrics":
                    var metrics = OtlpMetrics.Read(payload);
                    _metricBatches++;
                    _weatherRequestPoints = Math.Max(_weatherRequestPoints, metrics.Points);
                    _weatherRequestTotal = Math.Max(_weatherRequestTotal, metrics.Requests);
                    _weatherDurationCount = Math.Max(_weatherDurationCount, metrics.Durations);
                    break;
                case "traces": _traceBatches++; break;
                case "logs": _logBatches++; break;
            }
        }
    }
}
