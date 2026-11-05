const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

const CODES = {
  0: ["Clear", "☀️"], 1: ["Mostly Clear", "🌤️"], 2: ["Partly Cloudy", "⛅"], 3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy Rain", "🌧️"],
  71: ["Light Snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy Snow", "❄️"],
  80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};
const describe = (c) => CODES[c] || ["Unknown", "🌡️"];
const $ = (id) => document.getElementById(id);

async function loadWeather({ name, lat, lon }) {
  $("location").textContent = name;
  $("condition").textContent = "Loading…";

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(await res.json());
  } catch (err) {
    $("condition").textContent = "Couldn't load weather";
  }
}

function render(data) {
  const { current: c, hourly: h, daily: d } = data;
  const r = Math.round;

  $("temp").textContent = `${r(c.temperature_2m)}°`;
  $("condition").textContent = describe(c.weather_code)[0];
  $("hilo").textContent = `H:${r(d.temperature_2m_max[0])}°  L:${r(d.temperature_2m_min[0])}°`;
  $("feels").textContent = `${r(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${r(c.wind_speed_10m)} mph`;
  $("uv").textContent = r(d.uv_index_max[0]);

  // Next 24 hours, starting at the current hour
  const start = Math.max(0, h.time.findIndex((t) => t >= c.time.slice(0, 13)));
  $("hourly").innerHTML = h.time.slice(start, start + 24).map((t, i) => {
    const hour = new Date(t).getHours();
    const label = i === 0 ? "Now" : `${hour % 12 || 12}${hour < 12 ? "AM" : "PM"}`;
    return `<div class="hour"><span>${label}</span><span class="icon">${describe(h.weather_code[start + i])[1]}</span><span>${r(h.temperature_2m[start + i])}°</span></div>`;
  }).join("");

  // 7-day with temperature range bars
  const min = Math.min(...d.temperature_2m_min);
  const max = Math.max(...d.temperature_2m_max);
  const span = max - min || 1;
  $("daily").innerHTML = d.time.map((t, i) => {
    const day = i === 0 ? "Today" : new Date(t + "T00:00").toLocaleDateString("en-US", { weekday: "short" });
    const lo = d.temperature_2m_min[i], hi = d.temperature_2m_max[i];
    const left = ((lo - min) / span) * 100, width = ((hi - lo) / span) * 100;
    return `<li><span>${day}</span><span class="icon">${describe(d.weather_code[i])[1]}</span>
      <span class="range"><span class="lo">${r(lo)}°</span><span class="bar"><span style="left:${left}%;width:${width}%"></span></span><span class="hi">${r(hi)}°</span></span></li>`;
  }).join("");
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("city").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
    const { results } = await res.json();
    if (!results?.length) { $("condition").textContent = "City not found"; return; }
    const p = results[0];
    loadWeather({ name: p.name, lat: p.latitude, lon: p.longitude });
    $("city").value = "";
  } catch {
    $("condition").textContent = "Search failed";
  }
});

// ---------- Greeting ----------
const USER_NAME = "Rowan";
const hr = new Date().getHours();
const part = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
$("greeting").textContent = `${part}, ${USER_NAME}`;

// ---------- Theme: light / dark / system ----------
function applyTheme(choice) {
  const root = document.documentElement;
  if (choice === "light" || choice === "dark") root.dataset.theme = choice;
  else delete root.dataset.theme; // system: CSS follows prefers-color-scheme
  document.querySelectorAll("[data-theme-choice]").forEach((b) =>
    b.setAttribute("aria-pressed", b.dataset.themeChoice === choice)
  );
  try { localStorage.setItem("theme", choice); } catch {}
}

let savedTheme = "system";
try { savedTheme = localStorage.getItem("theme") || "system"; } catch {}
applyTheme(savedTheme);
document.querySelectorAll("[data-theme-choice]").forEach((b) =>
  b.addEventListener("click", () => applyTheme(b.dataset.themeChoice))
);

loadWeather(DEFAULT);
