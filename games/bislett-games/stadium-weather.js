// Oslo, weather_lookup via Jonas Juhl MCP, 26 November 2026 at 10:00 CET.
const stadiumWeather = Object.freeze({
  city: "Oslo",
  conditions: "Klar himmel",
  temperature: "−6 °C",
  wind: "2,2 km/t NNØ",
  observedAt: "26.11.2026 kl. 10.00",
  sky: "#a9cde2",
  coldLight: "rgba(137, 187, 224, 0.13)"
});

function drawStadiumWeather(context, x, y, width) {
  context.save();
  context.translate(x, y);
  context.scale(width / 400, width / 400);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.fillStyle = "#464f56";
  context.fillRect(28, 99, 9, 22);
  context.fillRect(363, 99, 9, 22);
  context.fillRect(0, 0, 400, 101);
  context.fillStyle = "#13232b";
  context.fillRect(4, 4, 392, 93);

  context.fillStyle = "#ffda83";
  context.beginPath();
  context.arc(29, 35, 9, 0, 2 * Math.PI);
  context.fill();
  context.strokeStyle = "#ffda83";
  context.lineWidth = 2;
  for (let ray = 0; ray < 8; ray++) {
    const angle = ray * Math.PI / 4;
    context.beginPath();
    context.moveTo(29 + 13 * Math.cos(angle), 35 + 13 * Math.sin(angle));
    context.lineTo(29 + 17 * Math.cos(angle), 35 + 17 * Math.sin(angle));
    context.stroke();
  }

  context.fillStyle = "#f4f8ff";
  context.font = "bold 25px Consolas, monospace";
  context.fillText(stadiumWeather.temperature, 55, 44);
  context.font = "bold 21px system-ui";
  context.fillText(stadiumWeather.conditions, 160, 43);
  context.font = "20px Consolas, monospace";
  context.fillText("Vind " + stadiumWeather.wind, 55, 68);
  context.fillStyle = "#b9d1df";
  context.font = "18px Consolas, monospace";
  context.fillText(stadiumWeather.city + " · " + stadiumWeather.observedAt, 55, 89);
  context.restore();
}

const weatherDescription = `${stadiumWeather.city}, ${stadiumWeather.observedAt}. ${stadiumWeather.conditions}, ${stadiumWeather.temperature}. Vind ${stadiumWeather.wind}.`;
for (const field of document.querySelectorAll("[data-stadium-weather]")) {
  const label = field.getAttribute("aria-label").replace(/\.?$/, ".");
  field.setAttribute("aria-label", label + " " + weatherDescription);
  const caption = document.createElement("p");
  caption.className = "stadium-weather-caption";
  caption.setAttribute("aria-hidden", "true");
  caption.textContent = weatherDescription;
  field.after(caption);
}
