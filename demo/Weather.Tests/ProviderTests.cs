using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Weather.Api;

namespace Weather.Tests;

public sealed class ProviderTests
{
    [Fact]
    public async Task StartsForecastAndReverseInParallel()
    {
        var forecast = new TaskCompletionSource<HttpResponseMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        var reverse = new TaskCompletionSource<HttpResponseMessage>(TaskCreationOptions.RunContinuationsAsynchronously);
        var started = 0;
        using var http = new HttpClient(new Handler((request, _) =>
        {
            Interlocked.Increment(ref started);
            return request.RequestUri!.AbsolutePath == "/v1/forecast" ? forecast.Task : reverse.Task;
        })) { Timeout = Timeout.InfiniteTimeSpan };
        var provider = Create(http);
        var loading = provider.WeatherAsync(47.6, -122.3, CancellationToken.None);
        Assert.Equal(2, started);
        forecast.SetResult(Json("{}"));
        reverse.SetResult(Json("""{"city":"Place"}"""));
        Assert.Equal("Place", (await loading).Location.Name);
    }

    [Fact]
    public async Task DoesNotRetryProviderStatusFailures()
    {
        var calls = 0;
        using var http = new HttpClient(new Handler((_, _) =>
        {
            Interlocked.Increment(ref calls);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        })) { Timeout = Timeout.InfiniteTimeSpan };
        await Assert.ThrowsAsync<ProviderException>(() => Create(http).SearchAsync("Seattle",
            CancellationToken.None));
        Assert.Equal(1, calls);
    }

    [Fact]
    public void KeepsExactPinnedBudgets()
    {
        Assert.Equal(TimeSpan.FromSeconds(8), WeatherProvider.ForecastTimeout);
        Assert.Equal(TimeSpan.FromMilliseconds(2500), WeatherProvider.ReverseTimeout);
        Assert.Equal(TimeSpan.FromSeconds(6), WeatherProvider.SearchTimeout);
    }

    private static WeatherProvider Create(HttpClient http) => new(http,
        new(new("https://fixture.test/v1/forecast"), new("https://fixture.test/reverse"),
            new("https://fixture.test/search")), NullLogger<WeatherProvider>.Instance);
    private static HttpResponseMessage Json(string text) =>
        new(HttpStatusCode.OK) { Content = new StringContent(text, System.Text.Encoding.UTF8, "application/json") };

    private sealed class Handler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
            CancellationToken cancellationToken) => send(request, cancellationToken);
    }
}
