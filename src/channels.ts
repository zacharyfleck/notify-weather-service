import type { Teams, Slack, Discord, Subscription } from "./types.js"
import { buildTeamsMessage } from "./teamsCard.js"
import { buildSlackMessage, buildSlackThreadReply } from "./slackCard.js"
import { buildDiscordMessage } from "./discordCard.js"

export async function sendTeams(
  target: Teams,
  locationName: string,
  feature: any,
): Promise<void> {
  const message = buildTeamsMessage(locationName, feature)

  try {
    const response = await fetch(target.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error(`[Teams] ${locationName}: webhook responded ${response.status} ${response.statusText}`)
    }
  } catch (err) {
    console.error(`[Teams] ${locationName}: failed to POST alert —`, err)
  }
}

export async function sendDiscord(
  target: Discord,
  locationName: string,
  feature: any,
): Promise<void> {
  const { payload, files } = buildDiscordMessage(locationName, feature, target.includeDetails)

  // Discord takes uploads as multipart/form-data with the JSON body in a
  // payload_json part — unlike Teams, images can't be inlined as data URIs.
  // Leave Content-Type unset so fetch fills in the multipart boundary.
  const form = new FormData()
  form.append("payload_json", JSON.stringify(payload))
  files.forEach((file, index) => {
    form.append(
      `files[${index}]`,
      new Blob([new Uint8Array(file.data)], { type: file.contentType }),
      file.name,
    )
  })

  try {
    const response = await fetch(target.webhook, {
      method: "POST",
      body: form,
    })

    if (!response.ok) {
      // Discord explains rejections in the body ({ code, message, errors }),
      // which is far more useful than the bare status.
      const detail = await response.text().catch(() => "")
      console.error(
        `[Discord] ${locationName}: webhook responded ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ""}`,
      )
    }
  } catch (err) {
    console.error(`[Discord] ${locationName}: failed to POST alert —`, err)
  }
}

// Slack's chat.postMessage wants a channel ID; it only accepts "#name" via a
// deprecated fallback. Resolve names to IDs once via conversations.list and
// cache them (keyed by bot token so multiple workspaces don't collide).
// Requires the channels:read scope (and groups:read for private channels).
const channelIdCache = new Map<string, string>()

async function resolveChannelId(botToken: string, channel: string): Promise<string | undefined> {
  // Already an ID (e.g. "C0123456789") — Slack channel IDs start with C/G/D.
  if (/^[CGD][A-Z0-9]+$/.test(channel)) {
    return channel
  }

  const name = channel.replace(/^#/, "")
  const cacheKey = `${botToken}::${name}`
  const cached = channelIdCache.get(cacheKey)
  if (cached) {
    return cached
  }

  let cursor: string | undefined
  do {
    const params = new URLSearchParams({
      types: "public_channel,private_channel",
      limit: "1000",
    })
    if (cursor) {
      params.set("cursor", cursor)
    }

    const response = await fetch(`https://slack.com/api/conversations.list?${params}`, {
      headers: { Authorization: `Bearer ${botToken}` },
    })

    if (!response.ok) {
      console.error(`[Slack] conversations.list responded ${response.status} ${response.statusText}`)
      return undefined
    }

    const result = (await response.json()) as {
      ok: boolean
      error?: string
      channels?: { id: string; name: string }[]
      response_metadata?: { next_cursor?: string }
    }

    if (!result.ok) {
      console.error(`[Slack] conversations.list failed — ${result.error}`)
      return undefined
    }

    for (const c of result.channels ?? []) {
      channelIdCache.set(`${botToken}::${c.name}`, c.id)
    }

    const hit = channelIdCache.get(cacheKey)
    if (hit) {
      return hit
    }

    cursor = result.response_metadata?.next_cursor || undefined
  } while (cursor)

  return undefined
}

export async function sendSlack(
  target: Slack,
  locationName: string,
  feature: any,
  threshold?: Subscription["threshold"],
): Promise<void> {
  const channelId = await resolveChannelId(target.botToken, target.channel)
  if (!channelId) {
    console.error(`[Slack] ${locationName}: could not resolve channel "${target.channel}"`)
    return
  }

  const message = buildSlackMessage(channelId, locationName, feature)

  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${target.botToken}`,
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error(`[Slack] ${locationName}: API responded ${response.status} ${response.statusText}`)
      return
    }

    // Slack returns HTTP 200 with { ok: false, error } on logical failures.
    const result = (await response.json()) as { ok: boolean; error?: string; ts?: string }
    if (!result.ok) {
      console.error(`[Slack] ${locationName}: chat.postMessage failed — ${result.error}`)
      return
    }

    // Post description/instructions as a threaded reply so they stay collapsed
    // by default — the Slack analogue of the Teams "Show details" toggle.
    if (result.ts) {
      const reply = buildSlackThreadReply(channelId, result.ts, feature)
      if (reply) {
        await postSlackThreadReply(target.botToken, locationName, reply)
      }
    }
  } catch (err) {
    console.error(`[Slack] ${locationName}: failed to POST alert —`, err)
  }
}

async function postSlackThreadReply(
  botToken: string,
  locationName: string,
  reply: object,
): Promise<void> {
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify(reply),
    })

    if (!response.ok) {
      console.error(`[Slack] ${locationName}: details reply responded ${response.status} ${response.statusText}`)
      return
    }

    const result = (await response.json()) as { ok: boolean; error?: string }
    if (!result.ok) {
      console.error(`[Slack] ${locationName}: details reply failed — ${result.error}`)
    }
  } catch (err) {
    console.error(`[Slack] ${locationName}: failed to POST details reply —`, err)
  }
}
