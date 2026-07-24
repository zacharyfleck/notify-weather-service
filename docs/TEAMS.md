# Teams Notifications

The service can post weather alerts to Microsoft Teams using an **incoming
webhook** (a Power Automate / Workflows URL). Each alert is delivered as an
[Adaptive Card](https://adaptivecards.io/) wrapped in a message attachment and
`POST`ed to the webhook.

## Required setup

Unlike Slack, Teams webhooks need **no OAuth scopes or bot install** — the
webhook URL itself is the credential. Anyone with the URL can post to the
channel, so treat it as a secret.

Create the webhook via **Workflows** (the successor to the deprecated Office 365
connectors):

1. In the target Teams channel, open **... → Workflows**.
2. Choose the template **"Post to a channel when a webhook request is
   received"** and complete the prompts.
3. Copy the generated **HTTP POST URL** — this is your `webhook` value.

## Configure `config.json`

Add a `teams` block to a notification:

```json
{
  "notifications": [
    {
      "name": "My Teams chat",
      "teams": {
        "webhook": "https://.../triggers/manual/paths/invoke?api-version=1&sp=...&sig=..."
      }
    }
  ]
}
```

### `teams` fields

| Field     | Required | Description                                              |
| --------- | -------- | -------------------------------------------------------- |
| `webhook` | yes      | Incoming webhook / Workflows HTTP POST URL for the channel. |

A notification can combine `teams` with `slack` — every
configured channel receives the alert. Subscriptions then point at the
notification by name:

```json
{
  "subscriptions": [
    { "location": "Cooked County", "notification": "My Teams chat", "threshold": "Warning" }
  ]
}
```

## Card layout & icons

The Adaptive Card shows the location and event in a header, the headline below
it, and tucks the description and instructions into a **collapsible "Show
details"** section (`Action.ToggleVisibility`).

Each alert gets an icon chosen from the event name (tornado, wave, storm, snow,
or a generic alert) and the threshold tier (Advisory / Watch / Warning). The
PNGs live in [assets/icons](../assets/icons) and are embedded directly in the
card as base64 `data:` URIs, so no external image hosting is required.

## Notes

- Teams returns a non-2xx HTTP status on failure, logged as
  `[Teams] <location>: webhook responded <status> <statusText>`.
- The webhook URL grants posting rights to the channel — keep it out of source
  control and rotate it if it leaks.
