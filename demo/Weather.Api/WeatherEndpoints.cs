using System.Diagnostics;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Weather.Api;

internal static class WeatherEndpoints
{
    internal const string CoordinateError =
        "Query params 'lat' (-90..90) and 'lon' (-180..180) are required.";
    internal const string QueryError = "Query param 'q' (min 2 characters) is required.";
    internal const string WeatherError = "Failed to load weather data for this location.";
    internal const string GeocodeError = "Failed to search for that place.";

    internal static async Task<Results<Ok<WeatherResponse>, BadRequest<ErrorResponse>, JsonHttpResult<ErrorResponse>>>
        WeatherAsync(HttpRequest request, WeatherProvider provider, ILogger<WeatherProvider> logger,
            CancellationToken cancellationToken)
    {
        var started = Stopwatch.GetTimestamp();
        var outcome = "invalid";
        using var activity = WeatherTelemetry.ActivitySource.StartActivity("weather.forecast");
        try
        {
            var query = QueryValues.Parse(request);
            if (!QueryValues.TryCoordinate(query, "lat", 90, out var lat)
                || !QueryValues.TryCoordinate(query, "lon", 180, out var lon))
            {
                logger.LogWarning(new EventId(1001, "InvalidCoordinates"), "Rejected invalid weather coordinates.");
                return TypedResults.BadRequest(new ErrorResponse(CoordinateError));
            }

            var weather = await provider.WeatherAsync(lat, lon, cancellationToken);
            outcome = "success";
            logger.LogInformation(new EventId(1002, "WeatherLoaded"),
                "Loaded weather forecast for {Latitude}, {Longitude}.", lat, lon);
            return TypedResults.Ok(weather);
        }
        catch (ProviderException exception)
        {
            outcome = "upstream-error";
            activity?.SetStatus(ActivityStatusCode.Error, exception.Message);
            logger.LogError(new EventId(1003, "WeatherFailed"), exception, "Failed to load weather forecast.");
            return TypedResults.Json(new ErrorResponse(WeatherError),
                WeatherJsonContext.Default.ErrorResponse, statusCode: StatusCodes.Status502BadGateway);
        }
        finally
        {
            WeatherTelemetry.Record("forecast", outcome, started);
        }
    }

    internal static async Task<Results<Ok<GeocodeResponse>, BadRequest<ErrorResponse>, JsonHttpResult<ErrorResponse>>>
        GeocodeAsync(HttpRequest request, WeatherProvider provider, ILogger<WeatherProvider> logger,
            CancellationToken cancellationToken)
    {
        var started = Stopwatch.GetTimestamp();
        var outcome = "invalid";
        using var activity = WeatherTelemetry.ActivitySource.StartActivity("weather.geocode");
        try
        {
            var query = QueryValues.SearchTerm(QueryValues.Parse(request));
            if (query.Length < 2)
            {
                logger.LogWarning(new EventId(1101, "InvalidSearch"), "Rejected invalid geocoding query.");
                return TypedResults.BadRequest(new ErrorResponse(QueryError));
            }

            var places = await provider.SearchAsync(query, cancellationToken);
            outcome = "success";
            logger.LogInformation(new EventId(1102, "GeocodeLoaded"),
                "Loaded {ResultCount} geocoding matches.", places.Results.Length);
            return TypedResults.Ok(places);
        }
        catch (ProviderException exception)
        {
            outcome = "upstream-error";
            activity?.SetStatus(ActivityStatusCode.Error, exception.Message);
            logger.LogError(new EventId(1103, "GeocodeFailed"), exception, "Failed to geocode place.");
            return TypedResults.Json(new ErrorResponse(GeocodeError),
                WeatherJsonContext.Default.ErrorResponse, statusCode: StatusCodes.Status502BadGateway);
        }
        finally
        {
            WeatherTelemetry.Record("geocode", outcome, started);
        }
    }
}
