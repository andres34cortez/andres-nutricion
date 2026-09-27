import { dateKeyInTimeZone } from "./reports";
export function localDateTime(timestamp: string, timezone: string) {
  const date = new Date(timestamp);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  return `${dateKeyInTimeZone(date, timezone)}T${time}`;
}
export function toTimestamp(local: string, timezone: string) {
  const wall = new Date(`${local}:00Z`).getTime();
  if (!Number.isFinite(wall)) throw new Error("Fecha inválida");
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const formatted = localDateTime(new Date(guess).toISOString(), timezone);
    guess += wall - new Date(`${formatted}:00Z`).getTime();
  }
  const timestamp = new Date(guess).toISOString();
  if (localDateTime(timestamp, timezone) !== local) throw new Error("La hora no existe en esta zona horaria.");
  return timestamp;
}
