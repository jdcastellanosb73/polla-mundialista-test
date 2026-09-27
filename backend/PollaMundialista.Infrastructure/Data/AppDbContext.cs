using Microsoft.EntityFrameworkCore;
using PollaMundialista.Domain.Entities;

namespace PollaMundialista.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<Prediction> Predictions => Set<Prediction>();

    // Mapping is explicit and snake_case so the model matches db/schema.sql exactly:
    // the SQL file is the documented source of truth; EF maps to it.
    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
            e.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(60).IsRequired();
            e.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(100).IsRequired();
            e.Property(x => x.Role).HasColumnName("role").HasMaxLength(10).IsRequired();
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.FailedLoginCount).HasColumnName("failed_login_count");
            e.Property(x => x.LockoutUntil).HasColumnName("lockout_until");
            e.HasIndex(x => x.Email).IsUnique().HasDatabaseName("uq_users_email");
        });

        mb.Entity<Match>(e =>
        {
            e.ToTable("matches");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever(); // seeded ids 1..12
            e.Property(x => x.GroupCode).HasColumnName("group_code").HasMaxLength(1).IsRequired();
            e.Property(x => x.HomeTeam).HasColumnName("home_team").HasMaxLength(40).IsRequired();
            e.Property(x => x.AwayTeam).HasColumnName("away_team").HasMaxLength(40).IsRequired();
            e.Property(x => x.KickoffAt).HasColumnName("kickoff_at");
            e.Property(x => x.HomeGoals).HasColumnName("home_goals");
            e.Property(x => x.AwayGoals).HasColumnName("away_goals");
            e.Property(x => x.ResultLoadedAt).HasColumnName("result_loaded_at");
            e.Ignore(x => x.HasResult);
        });

        mb.Entity<Prediction>(e =>
        {
            e.ToTable("predictions", tb =>
            {
                tb.HasCheckConstraint("ck_predictions_home_goals", "home_goals BETWEEN 0 AND 99");
                tb.HasCheckConstraint("ck_predictions_away_goals", "away_goals BETWEEN 0 AND 99");
            });
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.MatchId).HasColumnName("match_id");
            e.Property(x => x.HomeGoals).HasColumnName("home_goals");
            e.Property(x => x.AwayGoals).HasColumnName("away_goals");
            e.Property(x => x.Points).HasColumnName("points");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            // INVARIANT: one prediction per user per match — enforced by the DATABASE.
            // Application-level checks race under concurrency; constraints don't.
            e.HasIndex(x => new { x.UserId, x.MatchId }).IsUnique()
                .HasDatabaseName("uq_prediction_user_match");
            e.HasIndex(x => x.MatchId).HasDatabaseName("ix_predictions_match_id");
            e.HasIndex(x => x.UserId).HasDatabaseName("ix_predictions_user_id");

            e.HasOne(x => x.User).WithMany(u => u.Predictions)
                .HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Match).WithMany(m => m.Predictions)
                .HasForeignKey(x => x.MatchId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
