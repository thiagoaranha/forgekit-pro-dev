# ForgeKit Starter Data Model 

Since ForgeKit dictates an architecture emphasizing isolated domains ("Database Per Service"), there is no "global data model". Each service creates and holds its own truths.

## Example Service Database (PostgreSQL)

The primary model used to demonstrate the functionality of Prisma within ForgeKit:

### `Item`
Table representing an abstract resource interacting with the `POST /api/example/items` endpoint.

| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key. |
| `name` | String | Standard text identifier. |
| `description` | String | Optional long-form text. |
| `createdAt` | DateTime | Timestamp of row insertion. |
