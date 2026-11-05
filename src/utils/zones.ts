// Dates dans un fuseau horaire (sans dépendance) : « 26/10/2026 20:30 » à Paris -> instant UTC, et inversement.

export function isValidZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function partsInZone(date: Date, zone: string): Parts {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).formatToParts(date);

  const get = (type: string) => Number(formatted.find(p => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}

// Décalage (ms) du fuseau par rapport à UTC à un instant donné
function offsetAt(timestamp: number, zone: string): number {
  const p = partsInZone(new Date(timestamp), zone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - Math.floor(timestamp / 60000) * 60000;
}

// « JJ/MM/AAAA » + « HH:MM » dans le fuseau -> Date, ou null si la date est invalide
export function parseLocalDateTime(dateText: string, timeText: string, zone: string): Date | null {
  const d = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateText.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(timeText.trim());
  if (!d || !t) return null;

  const [day, month, year, hour, minute] = [Number(d[1]), Number(d[2]), Number(d[3]), Number(t[1]), Number(t[2])];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted - offsetAt(wanted, zone);
  guess = wanted - offsetAt(guess, zone);

  // Vérifie qu'on retombe sur la même date (rejette 31/02, heures inexistantes…)
  const back = partsInZone(new Date(guess), zone);
  if (back.year !== year || back.month !== month || back.day !== day || back.hour !== hour || back.minute !== minute) return null;
  return new Date(guess);
}

export function formatDate(date: Date, zone: string): string {
  const p = partsInZone(date, zone);
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}/${p.year}`;
}

export function formatTime(date: Date, zone: string): string {
  const p = partsInZone(date, zone);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

export function zoneLabel(zone: string): string {
  return zone === 'Europe/Paris' ? 'heure de Paris' : zone;
}
