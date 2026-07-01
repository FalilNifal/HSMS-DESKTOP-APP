using HSMS.API.Models;

namespace HSMS.API.Services
{
    public interface ITokenService
    {
        string CreateToken(User user);
    }
}