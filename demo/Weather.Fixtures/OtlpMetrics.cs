using System.Buffers.Binary;
using System.Text;

namespace Weather.Fixtures;

// Read only the two demo instruments from the public OTLP protobuf wire format.
// The unchanged payload is relayed to Aspire; no telemetry bodies are persisted.
internal static class OtlpMetrics
{
    internal static (long Points, long Requests, long Durations) Read(ReadOnlyMemory<byte> payload)
    {
        long points = 0, requests = 0, durations = 0;
        foreach (var resource in Messages(payload, 1))
        foreach (var scope in Messages(resource, 2))
        foreach (var metric in Messages(scope, 2))
        {
            var name = Fields(metric).FirstOrDefault(field => field.Number == 1 && field.WireType == 2);
            var instrument = Encoding.UTF8.GetString(name.Bytes.Span);
            if (instrument == "weather.requests")
            {
                foreach (var sum in Messages(metric, 7))
                foreach (var point in Messages(sum, 1))
                {
                    var value = Fields(point).FirstOrDefault(field => field.Number == 6 && field.WireType == 1);
                    points++;
                    requests += unchecked((long)value.Value);
                }
            }
            else if (instrument == "weather.request.duration")
            {
                foreach (var histogram in Messages(metric, 9))
                foreach (var point in Messages(histogram, 1))
                {
                    var count = Fields(point).FirstOrDefault(field => field.Number == 4 && field.WireType == 1);
                    durations += checked((long)count.Value);
                }
            }
        }
        return (points, requests, durations);
    }

    private static IEnumerable<ReadOnlyMemory<byte>> Messages(ReadOnlyMemory<byte> payload, int number) =>
        Fields(payload).Where(field => field.Number == number && field.WireType == 2)
            .Select(field => field.Bytes);

    private readonly record struct Field(int Number, int WireType, ulong Value, ReadOnlyMemory<byte> Bytes);

    private static List<Field> Fields(ReadOnlyMemory<byte> payload)
    {
        var fields = new List<Field>();
        var offset = 0;
        while (offset < payload.Length)
        {
            var tag = Varint(payload.Span, ref offset);
            var number = checked((int)(tag >> 3));
            var wire = (int)(tag & 7);
            if (number == 0)
            {
                throw new InvalidDataException("Invalid OTLP field number.");
            }
            ulong value = 0;
            ReadOnlyMemory<byte> bytes = default;
            switch (wire)
            {
                case 0:
                    value = Varint(payload.Span, ref offset);
                    break;
                case 1:
                    Require(payload.Length, offset, 8);
                    value = BinaryPrimitives.ReadUInt64LittleEndian(payload.Span.Slice(offset, 8));
                    offset += 8;
                    break;
                case 2:
                    var length = checked((int)Varint(payload.Span, ref offset));
                    Require(payload.Length, offset, length);
                    bytes = payload.Slice(offset, length);
                    offset += length;
                    break;
                case 5:
                    Require(payload.Length, offset, 4);
                    offset += 4;
                    break;
                default:
                    throw new InvalidDataException("Unsupported OTLP wire type.");
            }
            fields.Add(new(number, wire, value, bytes));
        }
        return fields;
    }

    private static ulong Varint(ReadOnlySpan<byte> bytes, ref int offset)
    {
        ulong value = 0;
        for (var shift = 0; shift < 64; shift += 7)
        {
            Require(bytes.Length, offset, 1);
            var current = bytes[offset++];
            if (shift == 63 && current > 1)
            {
                throw new InvalidDataException("OTLP varint overflow.");
            }
            value |= (ulong)(current & 127) << shift;
            if ((current & 128) == 0)
            {
                return value;
            }
        }
        throw new InvalidDataException("Invalid OTLP varint.");
    }

    private static void Require(int size, int offset, int count)
    {
        if (count < 0 || offset > size - count)
        {
            throw new InvalidDataException("Truncated OTLP message.");
        }
    }
}
