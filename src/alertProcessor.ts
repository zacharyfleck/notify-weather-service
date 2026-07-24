import type { Location } from "./types.ts"
import notify from "./notifier.js"

export default async function processAlerts(location: Location) {
  let features = await getAlerts(location)
  
  for (let f of features) {
    notify(location.name, f.properties)
  }
}

async function getAlerts(location: Location) {
  if (location.coordinates) {
    return await fetch(`https://api.weather.gov/alerts/active?status=actual&point=${location.coordinates[0]},${location.coordinates[1]}`)
      .then(response => response.json())
      .then(data => data.features ?? [])
  }
  else if (location.zoneIds) {
    return fetch(`https://api.weather.gov/alerts/active?status=actual&zone=${location.zoneIds.join(",")}`)
      .then(response => response.json())
      .then(data => data.features ?? [])
  }
  else {
    throw new Error("Location must have either coordinates or zoneIds");
  }
}
