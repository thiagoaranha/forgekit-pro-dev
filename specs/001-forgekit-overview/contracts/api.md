# API Contracts

## `example-service` Contract
This service handles Item resources and relies on internal headers passed down by the API gateway proxy.

### `POST /items`
Creates a brand new abstract item.
**Request Body**:
```json
{
  "name": "Sword of Forging",
  "description": "Optional text"
}
```

**Response (201 Created)**:
```json
{
  "id": "uuid-here",
  "name": "Sword of Forging",
  "description": "Optional text",
  "createdAt": "2026-04-14T..."
}
```

## Internal Networking Notes
When the API Gateway (`http://localhost:3000`) proxies the `/api/example` pathway, it consumes a JWT Token in the HTTP Authorization Header. Upon verification, the Gateway passes the following downstream to the internal services:
- `x-forgekit-user-id`
- `x-forgekit-role`
- `x-correlation-id`
