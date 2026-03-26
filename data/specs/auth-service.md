# OAuth2 Authentication Microservice

## Overview
Build an OAuth2-compliant authentication microservice that supports the authorization code flow with PKCE, refresh tokens, and secure session management. The service handles user registration, authentication, and token lifecycle management.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL for user storage
- **Cache:** Redis for session management and rate limiting
- **Hashing:** bcrypt for passwords
- **Tokens:** jsonwebtoken for JWT, crypto for PKCE

## Requirements

### Functional Requirements
1. **User Registration** - Email/password registration with email validation
2. **User Login** - Authenticate and issue access + refresh token pair
3. **Authorization Code Flow** - Full OAuth2 authorization code grant
4. **PKCE Support** - Proof Key for Code Exchange for public clients
5. **Refresh Tokens** - Rotate refresh tokens on use, detect reuse (token theft)
6. **Session Management** - Track active sessions per user, allow revocation
7. **Password Reset** - Secure password reset flow via email token

### API Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Authenticate user, return tokens
- `POST /auth/logout` - Revoke current session
- `POST /auth/refresh` - Exchange refresh token for new token pair
- `GET /auth/authorize` - OAuth2 authorization endpoint
- `POST /auth/token` - OAuth2 token endpoint
- `POST /auth/revoke` - Revoke a specific token
- `GET /auth/userinfo` - Get authenticated user profile
- `POST /auth/password/reset-request` - Request password reset
- `POST /auth/password/reset` - Complete password reset
- `GET /auth/sessions` - List active sessions for user
- `DELETE /auth/sessions/:id` - Revoke specific session

### Security Requirements
- Passwords hashed with bcrypt (cost factor 12)
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Rate limit login attempts: 5 per minute per email, 20 per minute per IP
- PKCE code verifier minimum 43 characters
- Authorization codes expire in 10 minutes, single-use
- Secure HTTP-only cookies for web clients
- CORS configuration for allowed origins

### Non-Functional Requirements
- Redis-backed session store with TTL
- Structured JSON logging
- Health check endpoint at `/health`
- Graceful shutdown handling
- Request ID tracking for debugging
- Input sanitization against injection attacks

## Data Models

### User
```
id: UUID (primary key)
email: VARCHAR(255) UNIQUE NOT NULL
password_hash: VARCHAR(255) NOT NULL
display_name: VARCHAR(100)
email_verified: BOOLEAN DEFAULT false
created_at: TIMESTAMP DEFAULT NOW()
updated_at: TIMESTAMP DEFAULT NOW()
```

### RefreshToken
```
id: UUID (primary key)
user_id: UUID (foreign key)
token_hash: VARCHAR(255) NOT NULL
family_id: UUID NOT NULL (for rotation detection)
expires_at: TIMESTAMP NOT NULL
revoked: BOOLEAN DEFAULT false
created_at: TIMESTAMP DEFAULT NOW()
```

### AuthorizationCode
```
id: UUID (primary key)
code_hash: VARCHAR(255) NOT NULL
client_id: VARCHAR(255) NOT NULL
user_id: UUID (foreign key)
redirect_uri: TEXT NOT NULL
code_challenge: VARCHAR(255)
code_challenge_method: VARCHAR(10)
scope: TEXT
expires_at: TIMESTAMP NOT NULL
used: BOOLEAN DEFAULT false
```

### Session
```
id: UUID (primary key)
user_id: UUID (foreign key)
ip_address: INET
user_agent: TEXT
last_active: TIMESTAMP DEFAULT NOW()
created_at: TIMESTAMP DEFAULT NOW()
```
