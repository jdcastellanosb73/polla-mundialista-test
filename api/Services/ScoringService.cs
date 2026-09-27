namespace PollaApi.Services;

/// <summary>
/// Pure scoring logic — the highest-consequence unit in the system, covered by unit tests.
/// Standard scoring: 3 = exact score, 1 = correct outcome (winner or draw), 0 = miss.
/// Outcome is compared via the sign of the goal difference, which covers draws naturally.
/// </summary>
public class ScoringService
{
    public const int ExactPoints = 3;
    public const int OutcomePoints = 1;
    public const int MissPoints = 0;

    public int Score(int predictedHome, int predictedAway, int realHome, int realAway)
    {
        if (predictedHome == realHome && predictedAway == realAway)
            return ExactPoints;

        return Math.Sign(predictedHome - predictedAway) == Math.Sign(realHome - realAway)
            ? OutcomePoints
            : MissPoints;
    }
}
