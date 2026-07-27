import type { Location } from "./types.ts"
import notify from "./notifier.js"

export default async function processAlerts(location: Location) {
  let features = await getAlerts(location)
  
  for (let f of features) {
    notify(location.name, f.properties)
  }
}

async function getAlerts(location: Location) {
  let apiUrl = new URL(`https://api.weather.gov/alerts/active?status=actual&message_type=alert`)

  if (location.coordinates) {
    apiUrl.searchParams.set("point", `${location.coordinates[0]},${location.coordinates[1]}`)

    return await fetch(apiUrl.toString())
      .then(response => response.json())
      .then(data => data.features ?? [])
  }
  else if (location.zoneIds) {
    apiUrl.searchParams.set("zone", location.zoneIds.join(","))

    return fetch(apiUrl.toString())
      .then(response => response.json())
      .then(data => data.features ?? [])
  }
  else {
    throw new Error("Location must have either coordinates or zoneIds");
  }
}
