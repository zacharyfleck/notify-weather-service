import fs from "fs"
import type { Config } from "./types.ts"
import buildMonitors from "./subscriptionBuilder.js"
import { sentAlerts } from "./sentAlertStore.js"

const configVersion = 1

export const config: Config = JSON.parse(fs.readFileSync("config/config.json", "utf-8"))

if (config.configVersion !== configVersion) {
  throw new Error(`Config version mismatch. Expected ${configVersion}, but got ${config.configVersion}. Please ensure your config version is up to date!`);
}

const pollIntervalSeconds = config.pollIntervalSeconds ?? 30

async function poll() {
  try {
    sentAlerts.reload()
    await buildMonitors(config.locations ?? [])
  } catch (err) {
    console.error("Error while polling for alerts:", err)
  }
}

async function main() {
  console.log(`Starting weather alert polling every ${pollIntervalSeconds} seconds.`)
  while (true) {
    await poll()
    await new Promise((resolve) => setTimeout(resolve, pollIntervalSeconds * 1000))
  }
}

main()

