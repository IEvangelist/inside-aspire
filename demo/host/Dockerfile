FROM node:22-bookworm-slim AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0-noble-aot AS native
WORKDIR /src
COPY Weather.Api/Weather.Api.csproj Weather.Api/
RUN dotnet restore Weather.Api/Weather.Api.csproj -r linux-x64
COPY Weather.Api/ Weather.Api/
COPY --from=frontend /src/frontend/dist frontend/dist
RUN dotnet publish Weather.Api/Weather.Api.csproj -c Release -r linux-x64 \
    --self-contained true --no-restore -p:PublishAot=true -o /app

FROM mcr.microsoft.com/dotnet/runtime-deps:10.0-noble-chiseled-extra
LABEL io.github.ievangelist.inside-aspire.demo="native-weather-compose"
WORKDIR /app
COPY --from=native /app ./
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["./Weather.Api"]
