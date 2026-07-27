# Notify Weather Service

A configurable tool that watches the [U.S. National Weather Service](https://www.weather.gov/documentation/services-web-api) for active alerts and forwards them to the people who care about them, via **Microsoft Teams** or **Slack**

## What it does

- **Monitors locations** — track one or more places, either by geographic coordinates or by NWS zone IDs.
- **Routes alerts to multiple channels** — a single recipient can receive notifications over Teams and/or Slack at the same time.
- **Filters by severity threshold** — subscriptions choose how noisy they want to be:
  - `Advisory` — every event (default)
  - `Watch` — events containing "Watch" or "Warning"
  - `Warning` — warnings only
- **Avoids duplicate alerts** — each alert is only delivered once per recipient, even if it matches multiple monitored locations. Sent alerts are tracked to a file so restarting the app won't re-fire recent notifications.

## How it works

1. Locations are polled against the NWS active-alerts API.
2. Each returned alert is matched to the subscriptions for that location.
3. The subscription's threshold decides whether the alert is relevant.
4. Relevant alerts are dispatched to whichever channels the recipient has configured. At this time, only NEW events are sent. Updates or Cancellations will be disregarded.

See the [Configuration Instructions](docs/) for more details

### Quick Start

1. `mv config/example.config.json config/config.json`
2. Make edits for your locations and alerts.
  - You can get lat / long coordinates on Google Maps by right clicking on the spot you want coordinates for
  - NWS County / Zone Codes are a bit harder to find: [Counties](https://api.weather.gov/zones/county), [Land](https://api.weather.gov/zones/land). I recommend having at least both of these to get all types of alerts.
3. Simply run `docker compose up -d` and you should be in business

## Status

Currently implemented:

- Location monitoring (coordinates and zone IDs)
- Alert fetching from the NWS API
- Channel routing between Teams and Slack
- Tiered severity thresholds

## Development

```sh
npm install
npm start       # build and run
```

## License

AGPL-3.0
