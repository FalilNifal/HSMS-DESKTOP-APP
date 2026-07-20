using HSMS.API.Data;
using HSMS.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// When packaged, the Electron main process passes a writable data directory via
// the Hsms__DataDirectory environment variable (e.g. %APPDATA%\hsms-desktop).
// Point the SQLite database there so the app never tries to write inside a
// read-only install folder such as Program Files.
var dataDirectory = builder.Configuration["Hsms:DataDirectory"];
if (!string.IsNullOrWhiteSpace(dataDirectory))
{
    Directory.CreateDirectory(dataDirectory);
    var databasePath = Path.Combine(dataDirectory, "hsms_desktop.db");
    builder.Configuration["ConnectionStrings:DefaultConnection"] = $"Data Source={databasePath}";
}

// Add controllers
builder.Services.AddControllers();

// Use a strong per-install JWT signing key instead of the shared dev placeholder.
// The key is generated once and persisted in the writable data directory, so
// every installation signs tokens with its own secret.
const string devJwtKeyPlaceholder = "CHANGE_THIS_TO_A_LONG_SECRET_KEY_FOR_DEVELOPMENT_ONLY_123456789";
var configuredJwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(configuredJwtKey) || configuredJwtKey == devJwtKeyPlaceholder)
{
    var secretsDirectory = string.IsNullOrWhiteSpace(dataDirectory)
        ? builder.Environment.ContentRootPath
        : dataDirectory;
    Directory.CreateDirectory(secretsDirectory);
    var keyFilePath = Path.Combine(secretsDirectory, "jwt.key");
    string signingKey;
    if (File.Exists(keyFilePath))
    {
        signingKey = File.ReadAllText(keyFilePath).Trim();
    }
    else
    {
        signingKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));
        File.WriteAllText(keyFilePath, signingKey);
    }
    builder.Configuration["Jwt:Key"] = signingKey;
}

// Add authentication and authorization
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var jwtKey = builder.Configuration["Jwt:Key"] ?? string.Empty;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

// Add SQLite database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IBackupService, BackupService>();
builder.Services.AddScoped<BackupService>();

// Add API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS for frontend development
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        // The API only binds to localhost and is consumed by the local desktop
        // app. In dev the renderer is http://localhost:5173; in the packaged
        // build it loads from file:// (origin "null"). Allow any origin so both
        // work (auth is via Bearer tokens, not cookies/credentials).
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Rate limiting to slow brute-force login attempts (fixed window per client).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("login", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 10;
        limiter.QueueLimit = 0;
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontendPolicy");

// No HTTPS redirect: this is a loopback-only API consumed by the local desktop
// app over http://localhost. A redirect would break the packaged renderer.

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        status = "OK",
        app = "HSMS Desktop API",
        database = "SQLite",
        timestamp = DateTime.Now
    });
});

app.Run();