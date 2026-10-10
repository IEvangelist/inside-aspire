using System.Buffers.Binary;
using System.Text;
using Weather.Fixtures;

namespace Weather.Tests;

public sealed class OtlpMetricsTests
{
    [Fact]
    public void ReadsActualOtlpFixed64CounterAndHistogramCounts()
    {
        var requests = Message(2,
        [
            ..Message(1, Encoding.UTF8.GetBytes("weather.requests")),
            ..Message(7, Message(1, Fixed64(6, 17)))
        ]);
        var durations = Message(2,
        [
            ..Message(1, Encoding.UTF8.GetBytes("weather.request.duration")),
            ..Message(9, Message(1, Fixed64(4, 17)))
        ]);
        var payload = Message(1, Message(2, [..requests, ..durations]));
        Assert.Equal((1L, 17L, 17L), OtlpMetrics.Read(payload));
    }

    [Theory]
    [InlineData(new byte[] { 0 })]
    [InlineData(new byte[] { 10, 20, 0 })]
    [InlineData(new byte[] { 15 })]
    public void RejectsMalformedOtlpInsteadOfCountingInvalidEvidence(byte[] payload) =>
        Assert.Throws<InvalidDataException>(() => OtlpMetrics.Read(payload));

    private static byte[] Message(int field, byte[] payload)
    {
        var bytes = new List<byte> { checked((byte)(field * 8 + 2)) };
        var size = payload.Length;
        while (size >= 128)
        {
            bytes.Add((byte)((size & 127) | 128));
            size >>= 7;
        }
        bytes.Add((byte)size);
        bytes.AddRange(payload);
        return bytes.ToArray();
    }

    private static byte[] Fixed64(int field, ulong value)
    {
        var bytes = new byte[9];
        bytes[0] = checked((byte)(field * 8 + 1));
        BinaryPrimitives.WriteUInt64LittleEndian(bytes.AsSpan(1), value);
        return bytes;
    }
}
