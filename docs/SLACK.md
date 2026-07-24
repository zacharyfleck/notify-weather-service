# Slack Notifications

The service can post weather alerts to Slack using a **bot token** (`xoxb-...`).
Each alert is delivered via [`chat.postMessage`](https://api.slack.com/methods/chat.postMessage)
as a Block Kit message.

## Required scopes

Add these OAuth **Bot Token Scopes** to your Slack app
(**OAuth & Permissions** → *Scopes* → *Bot Token Scopes*):

| Scope           | Why it's needed                                                        |
| --------------- | --------------------------------------------------------------------- |
| `chat:write`    | Post messages via `chat.postMessage`.                                 |
| `channels:read` | Resolve a public channel **name** (e.g. `#alerts`) to its channel ID. |
| `groups:read`   | Only if you target a **private** channel.                             |

> If you configure `channel` with a raw channel **ID** (e.g. `C0123456789`),
> the `channels:read` / `groups:read` scopes are not strictly required, since
> no name lookup happens.

## Install & invite the bot

1. Install (or reinstall, after changing scopes) the app to your workspace via
   **OAuth & Permissions** → *Install to Workspace*, and copy the
   **Bot User OAuth Token** (`xoxb-...`).
2. Invite the bot into the target channel — it must be a member to post there:
   ```
   /invite @YourBotName
   ```

## Configure `config.json`

Add a `slack` block to a notification. The `channel` may be a channel **name**
(with or without a leading `#`) or a channel **ID**.

```json
{
  "notifications": [
    {
      "name": "Slack",
      "slack": {
        "botToken": "xoxb-your-bot-token",
        "channel": "#weather-alerts"
      }
    }
  ]
}
```

### `slack` fields

| Field      | Required | Description                                                                             |
| ---------- | -------- | --------------------------------------------------------------------------------------- |
| `botToken` | yes      | Bot User OAuth Token (`xoxb-...`).                                                         |
| `channel`  | yes      | Channel name (`#alerts` or `alerts`) or channel ID (`C0123456789`).                     |

A notification can combine `slack` with `teams` — every
configured channel receives the alert. Subscriptions then point at the
notification by name:

```json
{
  "subscriptions": [
    { "location": "My HOuse", "notification": "Slack", "threshold": "Warning" }
  ]
}
```

## Notes

- The main message shows the location, event/tier, and headline. The alert's
  **description and instructions are posted as a threaded reply**, so they stay
  collapsed by default — the Slack analogue of the Teams "Show details" toggle.
- Channel names are resolved to IDs once via `conversations.list` and cached for
  the lifetime of the process, so renaming a channel requires a restart.
- Slack returns HTTP `200` even for logical failures (`{ "ok": false, "error": ... }`).
  These are logged as `[Slack] <location>: chat.postMessage failed — <error>`.
  Common errors include `not_in_channel` (invite the bot) and
  `missing_scope` (add the scopes above and reinstall).
