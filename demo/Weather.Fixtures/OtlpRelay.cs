using System.Net.Http.Headers;

namespace Weather.Fixtures;

internal sealed class OtlpRelay(HttpClient http, IConfiguration configuration,
    FixtureState state, ILogger<OtlpRelay> logger)
{
    internal async Task<IResult> ForwardAsync(string signal, HttpRequest request, CancellationToken cancellationToken)
    {
        if (signal is not ("metrics" or "traces" or "logs"))
        {
            logger.LogWarning("Rejected unknown fixture OTLP signal.");
            return TypedResults.BadRequest(new FixtureError("Unknown OTLP signal."));
        }
        var endpoint = configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]
            ?? throw new InvalidOperationException("Fixture OTLP relay requires an Aspire dashboard endpoint.");
        using var buffer = new MemoryStream();
        await request.Body.CopyToAsync(buffer, cancellationToken);
        var payload = buffer.ToArray();
        using var message = new HttpRequestMessage(HttpMethod.Post,
            new Uri(new Uri(endpoint.TrimEnd('/') + "/"), $"v1/{signal}"))
        {
            Content = new ByteArrayContent(payload)
        };
        message.Content.Headers.ContentType = new MediaTypeHeaderValue("application/x-protobuf");
        foreach (var header in (configuration["OTEL_EXPORTER_OTLP_HEADERS"] ?? "").Split(',',
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var separator = header.IndexOf('=');
            if (separator <= 0 || !message.Headers.TryAddWithoutValidation(
                header[..separator], Uri.UnescapeDataString(header[(separator + 1)..])))
            {
                throw new InvalidOperationException("Invalid Aspire OTLP header configuration.");
            }
        }
        try
        {
            using var response = await http.SendAsync(message, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Aspire rejected fixture OTLP {Signal} with {Status}.", signal, response.StatusCode);
                return TypedResults.StatusCode((int)response.StatusCode);
            }
            state.AcceptedTelemetry(signal, payload);
            var body = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            return TypedResults.Bytes(body, "application/x-protobuf");
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "Failed to relay fixture OTLP {Signal} to Aspire.", signal);
            return TypedResults.StatusCode(StatusCodes.Status502BadGateway);
        }
        catch (OperationCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogError(exception, "Fixture OTLP {Signal} relay timed out.", signal);
            return TypedResults.StatusCode(StatusCodes.Status504GatewayTimeout);
        }
        catch (InvalidDataException exception)
        {
            logger.LogError(exception, "Invalid fixture OTLP {Signal} payload.", signal);
            return TypedResults.BadRequest(new FixtureError("Invalid OTLP payload."));
        }
    }
}
