export const COUNTRY_LOCATIONS = {
  "Argentina": { lat: -34.61, lon: -58.38, tz: "America/Argentina/Buenos_Aires" },
  "Bolivia": { lat: -16.49, lon: -68.12, tz: "America/La_Paz" },
  "Brasil": { lat: -15.79, lon: -47.88, tz: "America/Sao_Paulo" },
  "Chile": { lat: -33.45, lon: -70.67, tz: "America/Santiago" },
  "Colombia": { lat: 4.71, lon: -74.07, tz: "America/Bogota" },
  "Costa Rica": { lat: 9.93, lon: -84.08, tz: "America/Costa_Rica" },
  "Cuba": { lat: 23.11, lon: -82.37, tz: "America/Havana" },
  "Ecuador": { lat: -0.18, lon: -78.47, tz: "America/Guayaquil" },
  "El Salvador": { lat: 13.69, lon: -89.19, tz: "America/El_Salvador" },
  "España": { lat: 40.42, lon: -3.7, tz: "Europe/Madrid" },
  "Guatemala": { lat: 14.63, lon: -90.51, tz: "America/Guatemala" },
  "Honduras": { lat: 14.07, lon: -87.19, tz: "America/Tegucigalpa" },
  "México": { lat: 19.43, lon: -99.13, tz: "America/Mexico_City" },
  "Nicaragua": { lat: 12.12, lon: -86.25, tz: "America/Managua" },
  "Panamá": { lat: 8.98, lon: -79.52, tz: "America/Panama" },
  "Paraguay": { lat: -25.29, lon: -57.58, tz: "America/Asuncion" },
  "Perú": { lat: -12.05, lon: -77.04, tz: "America/Lima" },
  "Puerto Rico": { lat: 18.47, lon: -66.11, tz: "America/Puerto_Rico" },
  "República Dominicana": { lat: 18.49, lon: -69.93, tz: "America/Santo_Domingo" },
  "Uruguay": { lat: -34.9, lon: -56.16, tz: "America/Montevideo" },
  "Venezuela": { lat: 10.48, lon: -66.9, tz: "America/Caracas" }
};

const rad = value => value * Math.PI / 180;
const deg = value => value * 180 / Math.PI;
const wrap = value => ((value % 360) + 360) % 360;

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function solarEvent(date, lat, lon, rising) {
  const n = dayOfYear(date);
  const lngHour = lon / 15;
  const t = n + ((rising ? 6 : 18) - lngHour) / 24;
  const m = 0.9856 * t - 3.289;
  let l = wrap(m + 1.916 * Math.sin(rad(m)) + 0.02 * Math.sin(rad(2 * m)) + 282.634);
  let ra = wrap(deg(Math.atan(0.91764 * Math.tan(rad(l)))));
  const lQuadrant = Math.floor(l / 90) * 90;
  const raQuadrant = Math.floor(ra / 90) * 90;
  ra = (ra + lQuadrant - raQuadrant) / 15;
  const sinDec = 0.39782 * Math.sin(rad(l));
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(rad(90.833)) - sinDec * Math.sin(rad(lat))) / (cosDec * Math.cos(rad(lat)));
  if (cosH > 1 || cosH < -1) return null;
  let h = rising ? 360 - deg(Math.acos(cosH)) : deg(Math.acos(cosH));
  h /= 15;
  const localMean = h + ra - 0.06571 * t - 6.622;
  const utcHours = ((localMean - lngHour) % 24 + 24) % 24;
  const event = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0));
  event.setUTCMinutes(Math.round(utcHours * 60));
  return event;
}

const shift = (date, minutes) => new Date(date.getTime() + minutes * 60000);
const time = (date, tz) => new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", ...(tz ? { timeZone: tz } : {}) }).format(date);

function dateInZone(now, tz) {
  if (!tz) return now;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
  return new Date(parts.year, parts.month - 1, parts.day, 12);
}

export function getSolarSchedule(coords, now = new Date()) {
  const solarDate = dateInZone(now, coords.tz);
  const sunrise = solarEvent(solarDate, coords.lat, coords.lon, true);
  let sunset = solarEvent(solarDate, coords.lat, coords.lon, false);
  if (!sunrise || !sunset) return null;
  if (sunset <= sunrise) sunset = shift(sunset, 1440);
  const morningStart = shift(sunrise, 10);
  const morningEnd = shift(sunrise, 120);
  const eveningStart = shift(sunset, -90);
  const eveningEnd = shift(sunset, -10);
  let status;
  if (now < morningStart) status = { tone: "next", title: "Tu próxima ventana es por la mañana", detail: `Desde ${time(morningStart, coords.tz)} hasta ${time(morningEnd, coords.tz)}` };
  else if (now <= morningEnd) status = { tone: "now", title: "Ahora es un buen momento", detail: `Luz suave disponible hasta las ${time(morningEnd, coords.tz)}` };
  else if (now < eveningStart) status = { tone: "later", title: "La próxima luz amable será al atardecer", detail: `Entre ${time(eveningStart, coords.tz)} y ${time(eveningEnd, coords.tz)}` };
  else if (now <= eveningEnd) status = { tone: "now", title: "Ahora es un buen momento", detail: `Última luz recomendada hasta las ${time(eveningEnd, coords.tz)}` };
  else status = { tone: "done", title: "La luz suave terminó por hoy", detail: `Mañana, vuelve cerca de las ${time(morningStart, coords.tz)}` };
  return {
    sunrise, sunset, morningStart, morningEnd, eveningStart, eveningEnd, status,
    sunriseLabel: time(sunrise, coords.tz), sunsetLabel: time(sunset, coords.tz),
    morningLabel: `${time(morningStart, coords.tz)}–${time(morningEnd, coords.tz)}`,
    eveningLabel: `${time(eveningStart, coords.tz)}–${time(eveningEnd, coords.tz)}`
  };
}

export function countryCoords(country) {
  return COUNTRY_LOCATIONS[country] || COUNTRY_LOCATIONS.Uruguay;
}
