import type { Subscription } from "./types.js"

type IconName = "tornado" | "wave" | "storm" | "snow" | "alert"

// Slack Block Kit cannot render data-URI images the way Teams Adaptive Cards
// can, so the icon selection mirrors teamsCard.ts but maps to Slack emoji that
// render inline in a message header.
const ICON_EMOJI: Record<IconName, string> = {
  tornado: ":tornado:",
  wave: ":ocean:",
  storm: ":thunder_cloud_and_rain:",
  snow: ":snowflake:",
  alert: ":warning:",
}

function pickIcon(eventName: string): IconName {
  if (/tornado|funnel/i.test(eventName)) return "tornado"
  if (/flood|surge|tsunami|marine|coastal|rip current|seiche|water/i.test(eventName)) return "wave"
  if (/snow|winter|blizzard|ice|icy|sleet|freez|frost|wind chill|cold/i.test(eventName)) return "snow"
  if (/storm|thunder|hurricane|tropical|wind|hail|lightning/i.test(eventName)) return "storm"
  return "alert"
}

/**
 * Builds the Slack summary message (header, event/tier context, and headline).
 * Details (description + instructions) are delivered separately as a threaded
 * reply so they stay collapsed by default — see buildSlackThreadReply.
 */
export function buildSlackMessage(
  channel: string,
  locationName: string,
  feature: any,
) {
  const emoji = ICON_EMOJI[pickIcon(feature.event ?? "")]

  const event: string = feature.event ?? "Weather Alert"
  const headline: string | undefined = feature.headline

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `${emoji} ${event}`, emoji: true },
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `${locationName}` }],
    },
  ]

  if (headline) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: headline },
    })
  }

  return {
    channel,
    // Fallback text shown in notifications and by clients that can't render blocks.
    text: `${locationName}: ${event}`,
    blocks,
  }
}

/**
 * Builds the threaded details reply (description + instructions), or undefined
 * when there's nothing extra to say. Slack collapses thread replies by default,
 * which mirrors the "Show details" toggle used by the Teams card.
 */
export function buildSlackThreadReply(channel: string, threadTs: string, feature: any) {
  const description: string | undefined = feature.description
  const instruction: string | undefined = feature.instruction

  if (!description && !instruction) {
    return undefined
  }

  const blocks: unknown[] = []

  if (description) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: description },
    })
  }

  if (instruction) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Instructions*\n${instruction}` },
    })
  }

  return {
    channel,
    thread_ts: threadTs,
    text: "Alert details",
    blocks,
  }
}
