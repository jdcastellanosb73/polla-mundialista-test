namespace PollaApi.Middleware;

/// <summary>
/// Domain error with a machine-readable code. Clients program against codes
/// (EMAIL_TAKEN, RESULT_ALREADY_LOADED, ...), never against message text.
/// </summary>
public class AppException(int status, string code, string message) : Exception(message)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
}

/// <summary>
/// Single choke point for errors: every failure leaves the API as
/// { "error": { "code", "message" } } with a proper HTTP status.
/// Stack traces are logged server-side and NEVER sent to clients.
/// </summary>
public class ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (AppException ex)
        {
            ctx.Response.StatusCode = ex.Status;
            await ctx.Response.WriteAsJsonAsync(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception on {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await ctx.Response.WriteAsJsonAsync(new { error = new { code = "INTERNAL_ERROR", message = "Unexpected server error." } });
        }
    }
}
