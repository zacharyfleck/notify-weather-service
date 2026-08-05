import { readFileSync } from "fs"
import type { Subscription } from "./types.js"

type Threshold = NonNullable<Subscription["threshold"]>
type IconName = "tornado" | "wave" | "storm" | "snow" | "alert"

export interface DiscordFile {
  name: string
  contentType: string
  data: Buffer
}

export interface DiscordMessage {
  payload: Record<string, unknown>
  files: DiscordFile[]
}

// URIs — the file is uploaded alongside the message and referenced by name via
// the attachment:// scheme (see channels.ts for the multipart request).
const ICON_DIR = new URL("../assets/icons/", import.meta.url)

const iconCache = new Map<string, Buffer>()

// Discord paints the embed's left bar with this colour, which is how the tier
// reads at a glance — the analogue of the Teams card's per-tier icon.
const TIER_COLOR: Record<Threshold, number> = {
  Advisory: 0xeab308,
  Watch: 0xf97316,
  Warning: 0xdc2626,
}

// Discord's documented embed limits (docs.discord.com → Message § Embed Limits).
const TITLE_LIMIT = 256
const AUTHOR_LIMIT = 256
const DESCRIPTION_LIMIT = 4096

function readIcon(fileName: string): Buffer {
  const cached = iconCache.get(fileName)
  if (cached) {
    return cached
  }

  const data = readFileSync(new URL(fileName, ICON_DIR))
  iconCache.set(fileName, data)
  return data
}

function pickIcon(eventName: string): IconName {
  if (/tornado|funnel/i.test(eventName)) return "tornado"
  if (/flood|surge|tsunami|marine|coastal|rip current|seiche|water/i.test(eventName)) return "wave"
  if (/snow|winter|blizzard|ice|icy|sleet|freez|frost|wind chill|cold/i.test(eventName)) return "snow"
  if (/storm|thunder|hurricane|tropical|wind|hail|lightning/i.test(eventName)) return "storm"
  return "alert"
}

// Derive the severity tier from the alert's own event name (e.g. "Tornado
// Warning" -> Warning). This reflects the actual status of the alert, not the
// subscription's configured minimum threshold.
function pickTier(eventName: string): Threshold {
  if (/warning/i.test(eventName)) return "Warning"
  if (/watch/i.test(eventName)) return "Watch"
  return "Advisory"
}

function clamp(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`
}

/**
 * Builds the Discord webhook payload (a single rich embed plus its uploads).
 *
 * Discord has no collapsible container, and a spoiler only covers text rather
 * than hiding it, so there's nowhere tidy to put the description and
 * instructions. They're omitted unless `includeDetails` is set, in which case
 * they ride along as a .txt attachment that Discord previews below the embed.
 */
export function buildDiscordMessage(
  locationName: string,
  feature: any,
  includeDetails = false,
): DiscordMessage {
  const event: string = feature.event ?? "Weather Alert"
  const tier = pickTier(event)
  const iconName = `${pickIcon(event)}-${tier}.png`

  const files: DiscordFile[] = [
    { name: iconName, contentType: "image/png", data: readIcon(iconName) },
  ]

  const details = includeDetails ? buildDetailsFile(locationName, event, feature) : undefined
  if (details) {
    files.push({
      name: detailsFileName(event),
      contentType: "text/plain",
      data: Buffer.from(details, "utf8"),
    })
  }

  const embed: Record<string, unknown> = {
    author: { name: clamp(locationName, AUTHOR_LIMIT) },
    title: clamp(event, TITLE_LIMIT),
    color: TIER_COLOR[tier],
    thumbnail: { url: `attachment://${iconName}` },
    footer: { text: "National Weather Service" },
  }

  if (feature.headline) {
    embed.description = clamp(feature.headline, DESCRIPTION_LIMIT)
  }
  if (feature.sent) {
    embed.timestamp = feature.sent
  }

  return {
    payload: {
      embeds: [embed],
      attachments: files.map((file, index) => ({ id: index, filename: file.name })),
      // NWS text is quoted verbatim; never let it turn into an @everyone ping.
      allowed_mentions: { parse: [] },
    },
    files,
  }
}

/**
 * The optional attached details: description and instructions as plain text.
 * The event and location head the file so a downloaded copy stands on its own;
 * the headline is not repeated, since it's already the embed's description.
 * Returns undefined when the alert carries neither, leaving nothing to attach.
 */
function buildDetailsFile(locationName: string, event: string, feature: any): string | undefined {
  const description: string | undefined = feature.description
  const instruction: string | undefined = feature.instruction

  if (!description && !instruction) {
    return undefined
  }

  const parts: string[] = [`${event} — ${locationName}`]
  if (description) {
    parts.push(description)
  }
  if (instruction) {
    parts.push(`INSTRUCTIONS\n${instruction}`)
  }

  return `${parts.join("\n\n")}\n`
}

function detailsFileName(event: string): string {
  const slug = event.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `${slug || "weather-alert"}-details.txt`
}
