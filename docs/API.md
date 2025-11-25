# RippleFreelance API Documentation

Base URL: `http://localhost:3000/api/v1`

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### Authentication

#### GET /auth/challenge
Get a challenge message for wallet signing.

**Request Body:**
```json
{
  "wallet_address": "rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg"
}
```

**Response:**
```json
{
  "message": "Sign this message to authenticate with RippleFreelance\nWallet: rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg\nTimestamp: 1700000000000\nNonce: abc123"
}
```

---

#### POST /auth/connect-wallet
Login or register a user with wallet signature.

**Request Body:**
```json
{
  "wallet_address": "rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg",
  "signature": "304402...",
  "message": "Sign this message...",
  "role": "both",
  "email": "user@example.com",
  "phone_number": "+1234567890"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "wallet_address": "rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg",
    "email": "user@example.com",
    "role": "both",
    "profile_data": {},
    "reputation_score": 0.00,
    "is_verified": false
  }
}
```

---

#### POST /auth/logout
Logout current user (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

---

#### POST /auth/refresh
Refresh JWT token.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### GET /auth/me
Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "wallet_address": "rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg",
    "email": "user@example.com",
    "phone_number": "+1234567890",
    "role": "both",
    "profile_data": {
      "name": "John Doe",
      "bio": "Full-stack developer",
      "skills": ["React", "Node.js", "Solidity"],
      "location": "Remote"
    },
    "reputation_score": 4.8,
    "is_verified": true,
    "created_at": "2025-11-25T00:00:00.000Z"
  },
  "stats": {
    "total_gigs": 25,
    "completed_gigs": 23,
    "average_rating": 4.8,
    "total_reviews": 20
  }
}
```

---

### Users

#### GET /users/:wallet_address
Get public user profile.

**Parameters:**
- `wallet_address` (path): XRPL wallet address

**Response:**
```json
{
  "user": {
    "wallet_address": "rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg",
    "role": "freelancer",
    "profile_data": {
      "name": "Jane Developer",
      "bio": "Blockchain specialist",
      "skills": ["Solidity", "Web3", "Smart Contracts"],
      "location": "USA"
    },
    "reputation_score": 4.9,
    "is_verified": true,
    "created_at": "2025-11-20T00:00:00.000Z"
  },
  "stats": {
    "total_gigs": 50,
    "completed_gigs": 48,
    "average_rating": 4.9,
    "total_reviews": 45
  }
}
```

---

#### PUT /users/profile
Update own profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "phone_number": "+1234567890",
  "role": "freelancer",
  "profile_data": {
    "name": "Updated Name",
    "bio": "Updated bio",
    "skills": ["Skill1", "Skill2"],
    "location": "Updated Location",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

**Response:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "wallet_address": "rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg",
    "email": "newemail@example.com",
    "phone_number": "+1234567890",
    "role": "freelancer",
    "profile_data": {
      "name": "Updated Name",
      "bio": "Updated bio",
      "skills": ["Skill1", "Skill2"],
      "location": "Updated Location",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "reputation_score": 4.8,
    "is_verified": true
  }
}
```

---

#### GET /users
List users with optional filters.

**Query Parameters:**
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `role` (optional): Filter by role (`freelancer`, `client`, `both`)
- `is_verified` (optional): Filter by verification status (`true`, `false`)

**Example:**
```
GET /users?limit=10&role=freelancer&is_verified=true
```

**Response:**
```json
{
  "users": [
    {
      "wallet_address": "rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg",
      "role": "freelancer",
      "profile_data": {
        "name": "Developer 1",
        "bio": "Expert in blockchain"
      },
      "reputation_score": 4.8,
      "is_verified": true,
      "created_at": "2025-11-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

---

#### DELETE /users/account
Delete own account (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Account deleted successfully"
}
```

---

## Error Responses

All endpoints may return these error formats:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Missing or invalid authorization header"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Data Types

### User Roles
- `freelancer`: Can create gigs and offer services
- `client`: Can hire freelancers
- `both`: Can both hire and offer services

### Profile Data Structure
```typescript
{
  name?: string;
  bio?: string;        // Max 500 characters
  skills?: string[];
  location?: string;
  avatar_url?: string; // Must be valid URL
}
```

### XRPL Wallet Address Format
- Starts with 'r'
- 25-35 characters long
- Contains alphanumeric characters (excluding 0, O, I, l)
- Example: `rNYaRCYzXkLPhYVwSDNko39iLqJoYjJGmg`

---

## Rate Limiting

Coming in Week 3:
- 100 requests per 15 minutes per IP
- Authenticated endpoints: 200 requests per 15 minutes per user

---

## Changelog

### Week 1 (2025-11-25)
- Initial API release
- Authentication endpoints
- User management endpoints
- Database schema v1.0
