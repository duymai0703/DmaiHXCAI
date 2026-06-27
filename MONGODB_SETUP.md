# MongoDB Setup For DmaiHXCAI

The app now supports two persistence layers:

- local fallback: SQLite + JSON
- durable remote storage: MongoDB

If `MONGODB_URI` is present, the server will:

1. connect to MongoDB during startup
2. merge remote users with local users
3. keep saving user accounts and match history to MongoDB

If MongoDB is unavailable, the app still runs with the local fallback store.

## Required environment variable

```text
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/dmaihxcai?retryWrites=true&w=majority
```

## Optional environment variables

```text
MONGODB_DB_NAME=dmaihxcai
MONGODB_COLLECTION=app_state
```

## Recommended Render setup

Add these variables in the Render service:

```text
MONGODB_URI=...
MONGODB_DB_NAME=dmaihxcai
MONGODB_COLLECTION=app_state
```

Then redeploy.

## How to verify

Open:

```text
/api/status
```

You should see:

```json
{
  "mongoEnabled": true,
  "mongoReady": true
}
```

If `mongoEnabled` is `true` but `mongoReady` is `false`, check:

- the URI
- MongoDB Atlas network access
- the database user/password

## What is stored durably now

- registered accounts
- profile changes
- user match history

## Current fallback behavior

If MongoDB is not configured, the server keeps using:

- `analysis-app/data/users.json`
- `analysis-app/data/rooms.json`
- the SQLite state file

That fallback is useful locally, but MongoDB is the better choice if you want accounts to survive server sleep, restart, and redeploy consistently.
