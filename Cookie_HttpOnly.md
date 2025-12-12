# 🍪 How HttpOnly Cookies Work

## 1. First request: LOGIN

Frontend (Browser)
    ↓
    | POST /api/v1/auth/authenticate
    | Authorization: Basic base64(username:password)
    ↓
Backend
    ↓
    | Verify credentials ✓
    | Generate access_token and refresh_token
    ↓
    | Response:
    | Set-Cookie: access_token=xyz...; HttpOnly; Path=/; SameSite=Lax
    | Set-Cookie: refresh_token=abc...; HttpOnly; Path=/; SameSite=Lax
    ↓
Frontend (Browser)
    ↓
    | The browser receives the Set-Cookie headers
    | Automatically saves the cookies in the browser's "cookie jar"
    | (Not JavaScript, the browser manages them!)

## 2. Subsequent requests: API calls

Frontend (Browser)
    ↓
    | GET /api/v1/my-data
    | 
    | The browser sees it's a request to the same domain
    | Checks the cookie jar
    | Finds access_token and refresh_token
    ↓
    | Automatically adds:
    | Cookie: access_token=xyz...; refresh_token=abc...
    ↓
Backend
    ↓
    | Receives the request
    | Reads the access_token cookie
    | Verifies it's valid ✓
    | Returns the data
    ↓
Frontend (Browser)
    ↓
    | Receives the response

## 3. Case: Access token expires (401)

Frontend (Browser)
    ↓
    | GET /api/v1/my-data (with the old access_token in the cookie)
    ↓
Backend
    ↓
    | Receives the request
    | Reads the access_token cookie
    | Access_token has expired! ✗
    | Returns: 401 Unauthorized
    ↓
Frontend (Browser)
    ↓
    | The interceptor catches the 401
    | Makes a request to /api/v1/auth/refresh-token
    | Sends the refresh_token (still in the cookie)
    ↓
Backend
    ↓
    | Receives the refresh request
    | Reads the refresh_token cookie
    | refresh_token is valid ✓
    | Generates a new access_token
    | Returns: Set-Cookie: access_token=new_xyz...; HttpOnly
    ↓
Frontend (Browser)
    ↓
    | The browser receives the new access_token
    | Replaces the old cookie with the new one
    | The interceptor retries the original request
    | This time with the new access_token
    ↓
Backend
    ↓
    | Receives the request with the new access_token
    | Token is valid ✓
    | Returns the data

## 4. Case: Refresh token expires (409)

Frontend (Browser)
    ↓
    | The interceptor catches the 401
    | Makes a request to /api/v1/auth/refresh-token
    | Sends the refresh_token (in the cookie)
    ↓
Backend
    ↓
    | Receives the refresh request
    | Reads the refresh_token cookie
    | refresh_token has expired! ✗
    | Returns: 409 Conflict (or 401)
    ↓
Frontend (Browser)
    ↓
    | The interceptor catches the 409
    | Calls authService.logout()
    | Redirects to /login
    |
    | Note: The backend could also delete the cookie
    | with: Set-Cookie: access_token=; Max-Age=0; HttpOnly
    ↓
Frontend (Browser)
    ↓
    | The user must log in again

## 🔑 KEY Differences between localStorage and HttpOnly Cookie

| Aspect | localStorage | HttpOnly Cookie |
|--------|--------------|-----------------|
| Where is it stored? | Browser (JavaScript) | Browser (HTTP only) |
| Who can read it? | JavaScript, Dev Tools | Only HTTP requests, Dev Tools |
| Who can write it? | JavaScript | Backend (Set-Cookie header) |
| Automatically sent? | ❌ NO (you must do it in the header) | ✅ YES (the browser does it) |
| Expiration | ❌ Manual | ✅ Automatic (Max-Age, Expires) |
| XSS Security | 😈 Vulnerable | 🛡️ Protected |
| CSRF Security | 😈 Vulnerable | 🛡️ Protected (with SameSite) |