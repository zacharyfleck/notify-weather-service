# Configuration (`config.json`)

The service is driven entirely by a `config.json` file in the `config/` directory. It's
read once at startup ([src/index.ts](../src/index.ts)) and validated against the
expected `configVersion`. Once running, the service polls for alerts on a loop
every `pollIntervalSeconds` seconds (default `30`).

## Top-level shape

```json
{
  "configVersion": 1,
  "pollIntervalSeconds": 30,
  "locations": [ ... ],
  "notifications": [ ... ],
  "subscriptions": [ ... ]
}
```

| Field                 | Type             | Description                                                     |
| --------------------- | ---------------- | --------------------------------------------------------------- |
| `configVersion`       | number           | Must match the version the service expects (currently `1`).     |
| `pollIntervalSeconds` | number           | Optional. How often to poll for alerts, in seconds. Defaults to `30`. |
| `locations`           | `Location[]`     | Places to poll the National Weather Service for active alerts.  |
| `notifications`       | `Notification[]` | Named delivery targets (Teams / Slack).                         |
| `subscriptions`       | `Subscription[]` | Wiring that ties a location to a notification (with a threshold). |

The three arrays are joined by name: a **subscription** references a
**location** and a **notification**, both by their `name`.

## `locations`

Each location is polled against [api.weather.gov](https://api.weather.gov). Provide
**either** `coordinates` **or** `zoneIds` (one is required):

```json
{
  "name": "My House",
  "coordinates": [34.05559815072185, -118.41341284562557]
}
```

```json
{
  "name": "Cooked County",
  "zoneIds": ["ILC031"]
}
```

Use the following endpoint to find your County Code: [Counties](https://api.weather.gov/zones/county)

The NWS has multiple alert zone types, however for most use cases, what provides polygon based alerts, such as a sever thunderstorm warning, or tornado warning. Broader forecast zone alerts will also show in county zones when applicable. More information can be found in [this guide](https://www.weather.gov/media/documentation/docs/NWS_Geolocation.pdf) from the NWS.

| Field         | Type                 | Description                                                          |
| ------------- | -------------------- | ------------------------------------------------------------------- |
| `name`        | string               | Unique label; referenced by subscriptions.                          |
| `coordinates` | `[number, number]`   | `[latitude, longitude]` point query. Use this **or** `zoneIds`.     |
| `zoneIds`     | `string[]`           | NWS county codes (e.g. `ILC031`). Use this **or** `coordinates`. |

## `notifications`

A named target that can deliver to one or more channels. Include whichever
channel blocks you need — each configured channel receives the alert.

```json
{
  "name": "Slack and Teams",
  "teams": { "webhook": "https://..." },
  "slack": { "botToken": "xoxb-...", "channel": "#weather-alerts" }
}
```

| Field   | Type    | Description                                                        |
| ------- | ------- | ----------------------------------------------------------------- |
| `name`  | string  | Unique label; referenced by subscriptions.                        |
| `teams` | `Teams` | Optional. Teams webhook target — see [TEAMS.md](TEAMS.md).         |
| `slack` | `Slack` | Optional. Slack bot-token target — see [SLACK.md](SLACK.md).       |

## `subscriptions`

Ties a location to a notification and sets the alert threshold.

```json
{
  "location": "Cooked County",
  "notification": "Slack and Teams",
  "threshold": "Warning"
}
```

| Field          | Type   | Description                                                            |
| -------------- | ------ | --------------------------------------------------------------------- |
| `location`     | string | Must match a `locations[].name`.                                      |
| `notification` | string | Must match a `notifications[].name`.                                  |
| `threshold`    | string | Optional. `"Advisory"` (default), `"Watch"`, or `"Warning"`.          |

### Threshold tiers

Thresholds are tiered and filter which events are delivered based on the event
name:

| Threshold    | Delivers                                             |
| ------------ | ---------------------------------------------------- |
| `Advisory`   | Every active event (default when omitted).           |
| `Watch`      | Events whose name contains "Watch" or "Warning".     |
| `Warning`    | Events whose name contains "Warning" only.           |

## Full example

```json
{
  "configVersion": 1,
  "locations": [
    { "name": "My House", "coordinates": [34.05559815072185, -118.41341284562557] },
    { "name": "Cooked County", "zoneIds": ["ILC031", "ILZ014"] }
  ],
  "notifications": [
    {
      "name": "Slack and Teams",
      "teams": { "webhook": "https://..." },
      "slack": { "botToken": "xoxb-...", "channel": "#weather-alerts" }
    },
    {
      "name": "Teams Only",
      "teams": { "webhook":  "https://..."}
    }
  ],
  "subscriptions": [
    { "location": "My House", "notification": "Teams Only", "threshold": "Warning" },
    { "location": "Cooked County", "notification": "Slack and Teams" }
  ]
}
```

## Notes

- `config.json` holds secrets (Teams webhook URLs, Slack bot tokens). Keep it out
  of source control and rotate any credential that leaks.
- A `configVersion` mismatch throws at startup, so bump it in lockstep with the
  service.
- Channel-specific setup lives in [TEAMS.md](TEAMS.md) and [SLACK.md](SLACK.md).
