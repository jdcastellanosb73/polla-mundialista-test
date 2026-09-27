namespace PollaApi.Entities;

public class Match
{
    public int Id { get; set; }                 // seeded 1..12, not auto-generated
    public string GroupCode { get; set; } = null!;
    public string HomeTeam { get; set; } = null!;
    public string AwayTeam { get; set; } = null!;
    public DateTime KickoffAt { get; set; }     // UTC — server time rules the prediction lock

    // Real result: null until the admin loads it. ResultLoadedAt doubles as
    // the "result exists" flag and the audit timestamp.
    public int? HomeGoals { get; set; }
    public int? AwayGoals { get; set; }
    public DateTime? ResultLoadedAt { get; set; }

    public List<Prediction> Predictions { get; set; } = new();

    public bool HasResult => ResultLoadedAt != null;
    public bool IsOpenForPredictions(DateTime utcNow) => !HasResult && KickoffAt > utcNow;
}
