import type { Notification, Subscription } from "./types.js"
import { config } from "./index.js"
import { sentAlerts } from "./sentAlertStore.js"
import { sendTeams, sendSlack } from "./channels.js"

export default async function notify(location: string, feature: any) {
  for (const sub of config.subscriptions.filter(sub => sub.location === location)) {
    if (!meetsThreshold(sub.threshold, feature.event)) {
      continue
    }

    const key = `${feature.id}::${sub.notification}`
    if (sentAlerts.has(key)) {
      continue
    }

    const notification = config.notifications.find(n => n.name === sub.notification)
    if (!notification) {
      console.warn(`No notification named "${sub.notification}" is defined; skipping.`)
      continue
    }

    await dispatch(notification, location, feature, sub.threshold)
    sentAlerts.add(key)
  }
}

async function dispatch(
  notification: Notification,
  location: string,
  feature: any,
  threshold: Subscription["threshold"],
) {
  if (notification.teams) {
    await sendTeams(notification.teams, location, feature, threshold)
  }
  if (notification.slack) {
    await sendSlack(notification.slack, location, feature, threshold)
  }
}

// Thresholds are tiered (Advisory < Watch < Warning) and default to Advisory.
//   Advisory: every event
//   Watch:    events with "Watch" or "Warning" in the name
//   Warning:  events with "Warning" in the name
function meetsThreshold(threshold: Subscription["threshold"], eventName: string): boolean {
  switch (threshold ?? "Advisory") {
    case "Warning":
      return /warning/i.test(eventName)
    case "Watch":
      return /watch|warning/i.test(eventName)
    case "Advisory":
    default:
      return true
  }
}
