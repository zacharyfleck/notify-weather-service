import processAlerts from "./alertProcessor.js"
import type { Location } from "./types.js"

export default async function buildMonitors(locations: Location[]) {
  for (let location of locations) {
    await processAlerts(location)
  }
}
