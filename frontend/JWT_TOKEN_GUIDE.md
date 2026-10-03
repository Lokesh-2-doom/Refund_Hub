# 🔒 JWT Token Management

Understanding how JWT tokens work in the authentication system.

## What is a JWT Token?

A JWT (JSON Web Token) is a digitally signed "digital ID card" that proves a user's identity without the server needing to look up the database every time.

**Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6IlNUVURFTlQiLCJleHAiOjE1MTYyMzkwMjJ9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ
```

Three parts separated by `.`:

1. **Header** (base64): Token type and algorithm
   ```json
   {
     "alg": "HS256",  // Algorithm
     "typ": "JWT"     // Type
   }
   ```

2. **Payload** (base64): Claims (user data)
   ```json
   {
     "sub": "1",           // Subject (user ID)
     "role": "STUDENT",    // User role
     "exp": 1516239022     // Expiration timestamp
   }
   ```

3. **Signature** (encrypted): Proves token wasn't tampered with
   - Created with: SECRET_KEY + ALGORITHM
   - Used to verify token is authentic

## Token Lifecycle

### 1. Token Creation (Login)

```python
# In routes_student.py::login_student()
access_token = create_access_token(
    data={"sub": str(student.id), "role": "STUDENT"},
    expires_delta=timedelta(minutes=30)
)
# Returns: JWT string
```

### 2. Token Storage (Frontend)

```typescript
// In authService.ts
localStorage.setItem(STUDENT_TOKEN_KEY, data.access_token);
// Token is now stored in browser's localStorage
```

### 3. Token Usage (Every Protected Request)

```typescript
// Frontend attaches token to request header
const response = await fetch("/api/student/profile", {
  headers: {
    Authorization: `Bearer ${token}`  // Token sent here
  }
});
```

### 4. Token Verification (Backend)

```python
# In middleware.py::verify_jwt_token()
payload = verify_token(token)
# Returns: decoded payload or None
```

### 5. Token Expiration (Auto Logout)

- Default: **30 minutes** (configurable in `.env`)
- After expiration, token is invalid
- User must login again to get new token
- Frontend checks for 401 error and clears localStorage

## Storage Options

### LocalStorage (Current Implementation)

**Pros:**
- Persists across browser tabs and sessions
- Works for long-lived sessions (remember me)

**Cons:**
- Vulnerable to XSS attacks
- Token visible in DevTools

**Security Tips:**
- Only use HTTPS in production
- Never expose token in URLs or logs
- Clear on logout

### SessionStorage (More Secure)

Clears when browser tab is closed:

```typescript
sessionStorage.setItem(STUDENT_TOKEN_KEY, token);
```

### HTTP-Only Cookies (Most Secure)

Token not accessible from JavaScript:

```typescript
// Backend sets cookie (Python/FastAPI)
response.set_cookie("access_token", token, httponly=True)

// Frontend uses it automatically (no manual handling)
```

## Token Verification Process

```
1. Frontend sends: Authorization: Bearer {token}
                          ↓
2. Backend extracts token from header
                          ↓
3. Decode using SECRET_KEY
  - If decoding fails → Invalid/tampered token
                          ↓
4. Check exp claim
  - If exp < now() → Token expired
                          ↓
5. Extract claims (sub, role, etc.)
                          ↓
6. Payload returned to route handler
```

## Common Token Issues

### Issue: "Invalid or expired token"

**Causes:**
- Token is malformed
- Token was tampered with
- Token has expired
- SECRET_KEY was changed on backend

**Solution:**
```typescript
// Clear stored token
localStorage.removeItem(STUDENT_TOKEN_KEY);

// Redirect to login
window.location.href = "/login";
```

### Issue: Token in Response but "Not Authenticated"

**Causes:**
- Token not being sent with request
- Wrong header format
- Frontend not using token correctly

**Correct Format:**
```
Authorization: Bearer {token}
               ↑
          Must start with "Bearer "
```

### Issue: Multiple Tabs Logout

**Cause:**
- Each tab has separate localStorage
- Logout in one tab doesn't affect others

**Solution:**
```typescript
// Listen for storage changes across tabs
window.addEventListener("storage", (e) => {
  if (e.key === STUDENT_TOKEN_KEY && e.newValue === null) {
    // Token was cleared, redirect this tab too
    window.location.href = "/login";
  }
});
```

## Token Refresh (Optional Enhancement)

For long-lived sessions without asking user to login:

```python
# Backend issues TWO tokens:
# 1. access_token: Short-lived (15 mins), used for requests
# 2. refresh_token: Long-lived (7 days), used to get new access_token

@app.post("/api/student/refresh")
async def refresh_token(refresh_token: str, db: Session):
    payload = verify_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401)
    
    # Create new access_token
    new_access_token = create_access_token(
        data={"sub": payload["sub"], "role": payload["role"]}
    )
    return {"access_token": new_access_token}
```

```typescript
// Frontend auto-refreshes when access_token expires
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  const response = await fetch("/api/student/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  const { access_token } = await response.json();
  localStorage.setItem("access_token", access_token);
}
```

## Security Best Practices

### ✅ Do's

- ✅ Use HTTPS in production (never HTTP)
- ✅ Set reasonable expiration times (15-30 mins)
- ✅ Use strong SECRET_KEY (random 32+ chars)
- ✅ Clear token on logout
- ✅ Only send token in Authorization header
- ✅ Validate token on every protected route
- ✅ Implement token refresh for better UX

### ❌ Don'ts

- ❌ Don't put sensitive data in token (it's base64 encoded, not encrypted)
- ❌ Don't expose SECRET_KEY in frontend
- ❌ Don't put password in token
- ❌ Don't use weak SECRET_KEY
- ❌ Don't disable token expiration
- ❌ Don't send token in URL query params
- ❌ Don't log tokens to console in production

## Token Inspection (Debugging)

Use [jwt.io](https://jwt.io) to decode and verify tokens:

1. Copy your token
2. Paste into jwt.io
3. See decoded payload and signature validity
4. Paste SECRET_KEY to verify signature

**Example Decoded Token:**
```json
// HEADER
{
  "alg": "HS256",
  "typ": "JWT"
}

// PAYLOAD
{
  "sub": "1",
  "role": "STUDENT",
  "exp": 1516239022
}

// SIGNATURE
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  "your-secret-key"
)
```

## Checking Token in Browser

```javascript
// In browser console
const token = localStorage.getItem("student_token");
console.log(token);

// Decode manually (for debugging only)
const parts = token.split(".");
const payload = JSON.parse(atob(parts[1]));
console.log("Token payload:", payload);
console.log("Expires:", new Date(payload.exp * 1000));
```

## Logout & Token Cleanup

### Complete Logout Process

```typescript
// Frontend (authService.ts)
export const logout = () => {
  // 1. Clear token from storage
  localStorage.removeItem(STUDENT_TOKEN_KEY);
  localStorage.removeItem(STUDENT_USER_KEY);
  
  // 2. Clear sensitive data
  sessionStorage.clear();
  
  // 3. Redirect to login
  window.location.href = "/login";
};
```

```python
# Backend (optional, for audit logging)
@app.post("/api/student/logout")
async def logout(payload = Depends(verify_jwt_token)):
    # Log logout action to database
    log_user_action(
        user_id=payload["sub"],
        action="logout",
        timestamp=datetime.utcnow()
    )
    # Token is invalidated by frontend clearing localStorage
    # No need to blacklist on backend for simple implementation
    return {"message": "Logged out successfully"}
```

---

## Summary

- **JWT** = Digitally signed user identity card
- **Token created** on login and stored in localStorage
- **Token sent** with every protected request in Authorization header
- **Token verified** by backend to allow/deny access
- **Token expires** automatically, requiring new login
- **Security** depends on strong SECRET_KEY and HTTPS usage

