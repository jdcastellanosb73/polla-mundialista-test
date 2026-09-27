using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PollaMundialista.Infrastructure.Data;

namespace PollaMundialista.Tests;

/// <summary>
/// Boots the REAL application (Program.cs: middleware, auth, seeding) against an
/// in-memory SQLite database. SQLite enforces the constraints that matter to the
/// tests (unique indexes, FKs, CHECK constraints) — unlike the EF InMemory provider,
/// which silently skips them. One factory per test = one fresh database per test.
/// </summary>
public class TestAppFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _connection.Open(); // keep the in-memory DB alive for the app's lifetime

        builder.ConfigureServices(services =>
        {
            var dbRelated = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                         || d.ServiceType == typeof(DbContextOptions)
                         || d.ServiceType == typeof(AppDbContext))
                .ToList();
            foreach (var d in dbRelated) services.Remove(d);

            services.AddDbContext<AppDbContext>(o => o.UseSqlite(_connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        _connection.Dispose();
    }
}
