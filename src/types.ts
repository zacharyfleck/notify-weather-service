export interface Config {
  configVersion: number;
  pollIntervalSeconds?: number;
  locations: Location[];
  notifications: Notification[];
  subscriptions: Subscription[];
}

export interface Location {
  name: string;
  coordinates?: [number, number];
  zoneIds?: string[];
}

export interface Notification {
  name: string;
  teams?: Teams;
  slack?: Slack;
}

export interface Teams {
  webhook: string;
}

export interface Slack {
  botToken: string;
  channel: string;
}

export interface Subscription {
  location: string;
  notification: string;
  threshold?: "Advisory" | "Watch" | "Warning";
}
