using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using System.Security.Claims;

namespace HSMS.API.Tests.Infrastructure;

public static class ControllerExtensions
{
    /// <summary>Attaches a fake authenticated user (id + role) to a controller.</summary>
    public static T AsUser<T>(this T controller, int userId, string role) where T : ControllerBase
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, "tester"),
            new(ClaimTypes.GivenName, "Tester"),
            new(ClaimTypes.Role, role)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
        return controller;
    }

    /// <summary>Extracts the value from an ActionResult&lt;T&gt; (Ok/Created), or null.</summary>
    public static TValue? Value<TValue>(this ActionResult<TValue> result) where TValue : class
    {
        if (result.Result is ObjectResult obj)
        {
            return obj.Value as TValue;
        }
        return result.Value;
    }

    /// <summary>The HTTP status code of an ActionResult, defaulting to 200 when a value was returned.</summary>
    public static int StatusCode<TValue>(this ActionResult<TValue> result)
    {
        return result.Result switch
        {
            ObjectResult obj => obj.StatusCode ?? 200,
            StatusCodeResult sc => sc.StatusCode,
            IStatusCodeActionResult scr => scr.StatusCode ?? 200,
            _ => 200
        };
    }
}
