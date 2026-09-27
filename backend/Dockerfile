# Multi-stage build for the Clean Architecture solution: SDK to publish, slim runtime to run.
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore first (layer-cached while csproj files don't change)
COPY PollaMundialista.Domain/PollaMundialista.Domain.csproj PollaMundialista.Domain/
COPY PollaMundialista.Application/PollaMundialista.Application.csproj PollaMundialista.Application/
COPY PollaMundialista.Infrastructure/PollaMundialista.Infrastructure.csproj PollaMundialista.Infrastructure/
COPY PollaMundialista.Api/PollaMundialista.Api.csproj PollaMundialista.Api/
RUN dotnet restore PollaMundialista.Api/PollaMundialista.Api.csproj

COPY . .
RUN dotnet publish PollaMundialista.Api/PollaMundialista.Api.csproj -c Release -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
# .NET 8 aspnet image listens on :8080 by default (ASPNETCORE_HTTP_PORTS=8080)
EXPOSE 8080
ENTRYPOINT ["dotnet", "PollaMundialista.Api.dll"]
