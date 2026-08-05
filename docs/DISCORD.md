# Discord Notifications

The service can post weather alerts to Discord using a **channel webhook**. Each
alert is delivered as a single [rich embed](https://docs.discord.com/developers/resources/message#embed-object)
`POST`ed to the webhook via [Execute Webhook](https://docs.discord.com/developers/resources/webhook#execute-webhook).

## Required setup

Like Teams — and unlike Slack — Discord webhooks need **no bot, OAuth scopes, or
app install**. The webhook URL itself is the credential, so treat it as a secret:
anyone holding it can post to the channel.

1. In the target Discord channel, open **Edit Channel → Integrations →
   Webhooks**.
2. Click **New Webhook**, name it, and confirm the channel.
3. Click **Copy Webhook URL** — this is your `webhook` value. It looks like
   `https://discord.com/api/webhooks/<id>/<token>`.

The webhook's name and avatar (set in that same dialog) are what appear as the
message author, so the service doesn't override them.

## Configure `config.json`

Add a `discord` block to a notification:

```json
{
  "notifications": [
    {
      "name": "My Discord server",
      "discord": {
        "webhook": "https://discord.com/api/webhooks/123456789012345678/abcdef...",
        "includeDetails": false
      }
    }
  ]
}
```

### `discord` fields

| Field            | Required | Description                                                                              |
| ---------------- | -------- | ----------------------------------------------------------------------------------------- |
| `webhook`        | yes      | Channel webhook URL copied from Discord.                                                  |
| `includeDetails` | no       | Attach the full description and instructions as a `.txt`. Defaults to `false` (embed only). |

A notification can combine `discord` with `teams` and `slack` — every configured
channel receives the alert. Subscriptions then point at the notification by name:

```json
{
  "subscriptions": [
    { "location": "Cooked County", "notification": "My Discord server", "threshold": "Warning" }
  ]
}
```

## Embed layout & icons

The embed mirrors the Teams card:

| Element             | Contents                                                        |
| ------------------- | --------------------------------------------------------------- |
| Author line         | Location name.                                                  |
| Title               | Event name (e.g. "Tornado Warning").                            |
| Colour bar          | Severity tier — yellow (Advisory), orange (Watch), red (Warning). |
| Thumbnail           | Tier-specific weather icon.                                     |
| Description         | Headline only.                                                  |
| Footer / timestamp  | "National Weather Service" and the alert's `sent` time.         |

By default that's the whole message — a compact card with no alert body.

Icons are the same PNGs the Teams card uses, from
[assets/icons](../assets/icons). Discord embeds **cannot** render base64 `data:`
URIs the way Adaptive Cards can, so the PNG is uploaded with the message as a
`multipart/form-data` part and referenced by the embed as
`attachment://<filename>.png`.

## Alert details (`includeDetails`)

Discord doesn't have a great way for this service to hide the alert details like it does with Teams or Slack. The closest option is to send the details / instructions from NWS into a `.txt` attachment with our requet. Personal preference has this off by default, but it can be enabled by setting `includeDetails` to true:

```json
{
  "discord": {
    "webhook": "https://discord.com/api/webhooks/...",
    "includeDetails": true
  }
}
```

> [!NOTE]
> In testing, the attachment is always sent first before the alert.

## Notes

- Discord returns a non-2xx status on failure, logged as
  `[Discord] <location>: webhook responded <status> <statusText> — <body>`. The
  body carries Discord's own `{ code, message, errors }`, which usually names
  the offending field outright.
- `allowed_mentions` is set to `{ "parse": [] }` on every message. NWS text is
  quoted verbatim, and this guarantees it can never produce an `@everyone`,
  `@here`, or role ping.
- Webhook posts are rate-limited per webhook (roughly 5 requests per 2 seconds).
  Bursts beyond that get an HTTP `429`, which is logged and dropped rather than
  retried.
- Deleting the webhook in Discord invalidates the URL immediately — the service
  will log `404 Unknown Webhook` until the config is updated.
