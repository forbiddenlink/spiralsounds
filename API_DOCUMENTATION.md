# 📚 API Documentation - Spiral Sounds

## Base URL
```
Production: https://your-domain.com/api/v1
Development: http://localhost:8000/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": { ... }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "is_verified": false,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "message": "Please check your email to verify your account"
  }
}
```

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "is_verified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "24h"
  }
}
```

### Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Reset Password
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123!"
}
```

### Verify Email
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

---

## 🎵 Product Endpoints

### Get All Products
```http
GET /products?search=rock&genre=rock&minPrice=10&maxPrice=50&sortBy=price&sortOrder=asc&page=1&limit=20
```

**Query Parameters:**
- `search` (string): Search in title, artist, genre, description
- `genre` (string): Filter by genre
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `sortBy` (string): Sort field (title, artist, price, genre, id)
- `sortOrder` (string): Sort direction (asc, desc)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 1,
        "title": "Abbey Road",
        "artist": "The Beatles",
        "genre": "Rock",
        "price": 29.99,
        "image": "vinyl1.png",
        "year": 1969,
        "description": "The Beatles' final studio album..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    },
    "filters": {
      "priceRange": {
        "min": 9.99,
        "max": 199.99
      }
    }
  }
}
```

### Get Product by ID
```http
GET /products/:id
```

### Get Genres
```http
GET /products/genres
```

**Response:**
```json
{
  "success": true,
  "data": ["Rock", "Jazz", "Classical", "Electronic", "Pop"]
}
```

### Search Suggestions
```http
GET /products/suggestions?q=beatles
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      { "text": "The Beatles", "type": "artist" },
      { "text": "Beatles for Sale", "type": "title" }
    ]
  }
}
```

---

## 🛒 Cart Endpoints

### Add to Cart
```http
POST /cart
Authorization: Bearer <token>
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```

### Get Cart Items
```http
GET /cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "title": "Abbey Road",
          "artist": "The Beatles",
          "price": 29.99,
          "image": "vinyl1.png"
        },
        "quantity": 2,
        "subtotal": 59.98
      }
    ],
    "total": 59.98,
    "item_count": 2
  }
}
```

### Update Cart Item
```http
PUT /cart/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 3
}
```

### Remove from Cart
```http
DELETE /cart/:itemId
Authorization: Bearer <token>
```

### Clear Cart
```http
DELETE /cart
Authorization: Bearer <token>
```

---

## 👤 User Profile Endpoints

### Get User Profile
```http
GET /me
Authorization: Bearer <token>
```

### Update User Profile
```http
PUT /me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

### Change Password
```http
POST /me/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "current_password": "OldPass123!",
  "new_password": "NewPass123!"
}
```

---

## 📊 Analytics Endpoints

### Get Analytics Dashboard
```http
GET /analytics/dashboard
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_products": 100,
    "total_users": 50,
    "total_orders": 25,
    "revenue": 1250.00,
    "popular_genres": [
      { "genre": "Rock", "count": 45 },
      { "genre": "Jazz", "count": 30 }
    ],
    "recent_activity": [
      {
        "type": "user_registration",
        "message": "New user registered",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### Track Search
```http
POST /analytics/search
Content-Type: application/json

{
  "search_query": "beatles",
  "filters": { "genre": "rock" },
  "results_count": 5,
  "session_id": "session-123"
}
```

### Track Product Click
```http
POST /analytics/product-click
Content-Type: application/json

{
  "product_id": 1,
  "search_query": "beatles",
  "session_id": "session-123"
}
```

---

## 🔧 System Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "production"
  }
}
```

### API Info
```http
GET /info
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Spiral Sounds API",
    "version": "v1",
    "description": "RESTful API for vinyl record store",
    "endpoints": {
      "authentication": "/auth",
      "products": "/products",
      "cart": "/cart",
      "user": "/me",
      "analytics": "/analytics"
    }
  }
}
```

---

## 🚨 Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Invalid username/password |
| `TOKEN_EXPIRED` | 401 | JWT token expired |
| `INVALID_TOKEN` | 401 | Invalid JWT token |
| `ACCESS_DENIED` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Authentication Rate Limiting**: 5 attempts per 15 minutes
- **JWT Tokens**: Secure authentication with 24h expiration
- **Input Validation**: Joi schema validation
- **XSS Protection**: Input sanitization
- **CORS**: Configurable cross-origin requests
- **Security Headers**: Helmet.js implementation

---

## 📝 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Search | 50 requests | 5 minutes |
| Analytics | 20 requests | 1 minute |

---

## 🧪 Testing

Test the API using curl, Postman, or any HTTP client:

```bash
# Test health endpoint
curl https://your-domain.com/api/v1/health

# Test product listing
curl https://your-domain.com/api/v1/products

# Test authentication
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

This comprehensive API documentation showcases professional development practices and makes your project more impressive for portfolio presentation!
