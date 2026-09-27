using PollaApi.Services;
using Xunit;

namespace PollaApi.Tests;

/// <summary>
/// The scoring engine is the highest-consequence pure logic in the system:
/// a silent bug here means wrong standings for every user. These tests are the
/// contract: 3 = exact score, 1 = correct outcome (winner or draw), 0 = miss.
/// </summary>
public class ScoringServiceTests
{
    private readonly ScoringService _scoring = new();

    // ---- Exact score → 3 points ----
    [Theory]
    [InlineData(2, 1, 2, 1)]  // home win, exact
    [InlineData(0, 0, 0, 0)]  // goalless draw, exact
    [InlineData(1, 3, 1, 3)]  // away win, exact
    [InlineData(4, 4, 4, 4)]  // high-scoring draw, exact
    public void ExactScore_Returns3(int ph, int pa, int rh, int ra) =>
        Assert.Equal(3, _scoring.Score(ph, pa, rh, ra));

    // ---- Correct outcome, wrong score → 1 point ----
    [Theory]
    [InlineData(1, 0, 3, 1)]  // predicted home win, real home win
    [InlineData(0, 2, 1, 3)]  // predicted away win, real away win
    [InlineData(1, 1, 2, 2)]  // predicted draw, real draw (different score)
    [InlineData(5, 0, 1, 0)]  // exaggerated home win still counts as outcome
    public void CorrectOutcome_Returns1(int ph, int pa, int rh, int ra) =>
        Assert.Equal(1, _scoring.Score(ph, pa, rh, ra));

    // ---- Wrong outcome → 0 points ----
    [Theory]
    [InlineData(1, 0, 0, 1)]  // predicted home win, real away win
    [InlineData(1, 1, 1, 0)]  // predicted draw, real home win
    [InlineData(0, 0, 0, 3)]  // predicted draw, real away win
    [InlineData(2, 0, 1, 1)]  // predicted home win, real draw
    public void WrongOutcome_Returns0(int ph, int pa, int rh, int ra) =>
        Assert.Equal(0, _scoring.Score(ph, pa, rh, ra));

    // A prediction identical in outcome but reversed in teams must NOT score.
    [Fact]
    public void ReversedScore_IsNotExact()
    {
        // predicted 1-2 (away win), real 2-1 (home win): outcome differs → 0
        Assert.Equal(0, _scoring.Score(1, 2, 2, 1));
    }
}
