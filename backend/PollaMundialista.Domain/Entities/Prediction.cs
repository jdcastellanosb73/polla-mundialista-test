namespace PollaMundialista.Domain.Entities;

public class Prediction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    public int HomeGoals { get; set; }
    public int AwayGoals { get; set; }

    // Materialized when the admin loads the real result (3 / 1 / 0).
    // Null = match not scored yet. Recomputed idempotently on admin corrections.
    public int? Points { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
