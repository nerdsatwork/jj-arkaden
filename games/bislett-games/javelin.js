"use strict";

function mix(from, to, amount) {
  return from + (to - from) * amount;
}

function javelinRunningPose(distance, speed, motionReduced) {
  const effort = motionReduced ? 0 : Math.min(speed / 5, 1);
  const crossover = Math.max(0, (distance - 14) / 10);
  const cycle = distance * 3.2;
  const stride = Math.sin(cycle) * effort;
  const lift = Math.cos(cycle) * effort;
  return {
    hip: [0, -24],
    shoulder: [mix(4 * effort, -8, crossover), -46],
    head: [mix(6 * effort, -7, crossover), -59],
    frontKnee: [5 + stride * 12, -12 - Math.max(0, lift) * 6],
    frontFoot: [stride * 19, -Math.max(0, lift) * 10],
    backKnee: [mix(-4, 2, crossover) - stride * 10, -12 + Math.min(0, lift) * 6],
    backFoot: [crossover * 7 - stride * 17, Math.min(0, lift) * 10],
    freeElbow: [mix(1 - stride * 8, 9, crossover), mix(-35, -44, crossover)],
    freeHand: [mix(10 - stride * 10, 20, crossover), mix(-40, -46, crossover)],
    throwElbow: [mix(15, -19, crossover), mix(-53, -47, crossover)],
    throwHand: [mix(11, -31, crossover), mix(-70, -48, crossover)],
    spearAngle: [mix(0, -5 * Math.PI / 180, crossover)]
  };
}

{
  const throwing = get("throwing");
  const runTab = get("run-tab");
  const throwTab = get("throw-tab");
  const input = get("throw-name");
  const start = get("throw-start");
  const abort = get("throw-abort");
  const result = get("throw-result");
  const field = get("throw-field");
  const context = field.getContext("2d");
  const ground = 236;
  const foulLine = 208;
  const pixelsPerMeter = 6.2;
  const releaseDuration = 180;
  const flightDuration = 1000;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const athleteImage = new Image();
  const athleteSprites = {
    head: [154, 68, 375, 472],
    torso: [810, 48, 265, 532],
    upperArm: [212, 665, 208, 522],
    thigh: [792, 687, 258, 502]
  };
  const recordStorage = "bislett-games.javelin.v1";
  let best = [];
  try {
    const saved = JSON.parse(localStorage.getItem(recordStorage) || "[]");
    if (Array.isArray(saved)) best = saved.filter(entry =>
      entry && typeof entry.name === "string" && Number.isFinite(entry.meters));
  } catch {
    result.textContent = "Gemte rekorder kunne ikke læses.";
  }

  let active = false;
  let name = "";
  let angle = 40;
  let speed = 0;
  let distance = 0;
  let last = "";
  let previousFrame;
  let runFrame;
  let flightFrame;
  let foul = false;
  let renderedFlight = null;
  let renderedElapsed = 0;

  function line(points, color, width = 2) {
    context.beginPath();
    context.moveTo(...points[0]);
    for (const point of points.slice(1)) context.lineTo(...point);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineCap = "round";
    context.stroke();
  }

  function runnerX() {
    return foul ? foulLine : 36 + distance / 24 * (foulLine - 68);
  }

  function blendPose(from, to, amount) {
    return Object.fromEntries(Object.entries(from).map(([joint, values]) =>
      [joint, values.map((value, index) => mix(value, to[joint][index], amount))]));
  }

  const plantPose = {
    hip: [0, -24], shoulder: [-8, -46], head: [-6, -59],
    frontKnee: [11, -13], frontFoot: [19, 0], backKnee: [-13, -13], backFoot: [-25, 0],
    freeElbow: [8, -46], freeHand: [21, -46],
    throwElbow: [-20, -47], throwHand: [-31, -48], spearAngle: [-0.1]
  };
  const releasePose = {
    hip: [6, -25], shoulder: [14, -45], head: [19, -57],
    frontKnee: [16, -14], frontFoot: [19, 0], backKnee: [-12, -17], backFoot: [-23, -5],
    freeElbow: [7, -36], freeHand: [3, -39],
    throwElbow: [22, -55], throwHand: [33, -61], spearAngle: [0]
  };
  const recoveryPose = {
    hip: [9, -24], shoulder: [17, -44], head: [21, -55],
    frontKnee: [13, -12], frontFoot: [17, 0], backKnee: [4, -13], backFoot: [0, 0],
    freeElbow: [6, -37], freeHand: [1, -33],
    throwElbow: [22, -35], throwHand: [15, -25], spearAngle: [0]
  };

  function drawAthlete(x, pose) {
    const place = ([dx, dy]) => [x + dx, ground + dy];
    const limb = (joints, color, width) => line(joints.map(joint => place(pose[joint])), color, width);
    if (athleteImage.naturalWidth) {
      const segment = (sprite, from, to, width, overlap) => {
        const [x, y] = place(pose[from]);
        const [endX, endY] = place(pose[to]);
        const dx = endX - x;
        const dy = endY - y;
        context.save();
        context.translate(x, y);
        context.rotate(Math.atan2(-dx, dy));
        context.drawImage(athleteImage, ...sprite, -width / 2, -overlap,
          width, Math.hypot(dx, dy) + overlap * 2);
        context.restore();
      };
      const leg = (knee, foot, skin) => {
        limb([knee, foot], skin, 5);
        const [footX, footY] = place(pose[foot]);
        line([[footX - 3, footY - 1], [footX + 5, footY - 1]], "#233831", 4);
        line([[footX - 3, footY + 1], [footX + 5, footY + 1]], "#f3f2e7", 1.5);
        segment(athleteSprites.thigh, "hip", knee, 10, 2);
      };
      const arm = (elbow, hand, skin) => {
        limb([elbow, hand], skin, 4);
        segment(athleteSprites.upperArm, "shoulder", elbow, 6, 1.5);
      };
      context.save();
      context.globalAlpha = 0.78;
      leg("backKnee", "backFoot", "#bb8867");
      arm("freeElbow", "freeHand", "#bb8867");
      context.restore();
      leg("frontKnee", "frontFoot", "#dfa47d");
      const [headX, headY] = place(pose.head);
      context.drawImage(athleteImage, ...athleteSprites.head, headX - 8, headY - 9, 16, 20);
      segment(athleteSprites.torso, "shoulder", "hip", 16, 3);
      arm("throwElbow", "throwHand", "#dfa47d");
      return place(pose.throwHand);
    }
    limb(["hip", "backKnee", "backFoot"], "#203029", 6);
    limb(["shoulder", "freeElbow", "freeHand"], "#c99170", 5);
    limb(["hip", "frontKnee", "frontFoot"], "#263c32", 7);
    limb(["hip", "shoulder"], "#d5f263", 12);
    limb(["shoulder", "throwElbow", "throwHand"], "#edbd91", 5);
    context.fillStyle = "#edbd91";
    context.beginPath();
    context.arc(...place(pose.head), 8, 0, Math.PI * 2);
    context.fill();
    return place(pose.throwHand);
  }

  const spectators = ["#e0ac67", "#78bad1", "#b5726f", "#ded5b7", "#90ab76", "#ab92ba"];
  const standCrowd = document.createElement("canvas");
  standCrowd.width = field.width;
  standCrowd.height = field.height;
  const crowdContext = standCrowd.getContext("2d");
  for (const [left, right] of [[66, 179], [195, 286], [302, 397], [414, 504], [520, 618], [635, 730]]) {
    for (let row = 0; row < 5; row++) {
      for (let x = left + row % 2 * 3; x < right; x += 6) {
        const seat = x + row * 17;
        if (seat % 11 < 3) continue;
        const y = 190 + row * 7 + seat % 3;
        crowdContext.fillStyle = "#a88b73";
        crowdContext.fillRect(x + 1, y - 2, 2, 2);
        crowdContext.fillStyle = spectators[(seat + Math.floor(x / 6)) % spectators.length];
        crowdContext.fillRect(x, y, 4, 3);
      }
    }
  }

  const skyLight = crowdContext.createLinearGradient(0, 0, 0, 140);
  skyLight.addColorStop(0, stadiumWeather.sky);
  skyLight.addColorStop(0.32, stadiumWeather.sky);
  skyLight.addColorStop(1, "rgba(169, 205, 226, 0)");
  crowdContext.fillStyle = skyLight;
  crowdContext.fillRect(0, 0, field.width, 140);
  crowdContext.fillStyle = stadiumWeather.coldLight;
  crowdContext.fillRect(0, 0, field.width, field.height);
  drawStadiumWeather(crowdContext, 457, 54, 322);

  function drawField(flight = null, elapsed = 0) {
    renderedFlight = flight;
    renderedElapsed = elapsed;
    context.clearRect(0, 0, field.width, field.height);
    context.drawImage(standCrowd, 0, 0);
    context.fillStyle = "#a45647";
    context.fillRect(0, ground - 7, foulLine, 35);
    context.fillStyle = "#294a33b8";
    context.fillRect(foulLine, ground - 7, 800 - foulLine, 35);
    line([[0, ground - 7], [800, ground - 7]], "#e6ebd7");
    for (const meters of [20, 40, 60, 80]) {
      const x = foulLine + meters * pixelsPerMeter;
      line([[x, ground - 7], [x, ground + 28]], "#a8c4a1");
      context.fillStyle = "#f3f2e7";
      context.font = 'bold 28px "Cascadia Mono", Consolas, monospace';
      context.textAlign = "center";
      drawFieldLabel(meters + " m", x, 298);
    }
    line([[foulLine, ground - 20], [foulLine, ground + 31]], foul ? "#ff9b86" : "#f3f2e7", 5);
    context.fillStyle = foul ? "#ffb29f" : "#f3f2e7";
    context.font = "bold 28px system-ui";
    drawFieldLabel("Kastelinje", foulLine, 298);

    if (!flight) {
      const pose = javelinRunningPose(distance, speed, reducedMotion.matches);
      const hand = drawAthlete(runnerX(), pose);
      if (!foul) drawSpear(hand, pose.spearAngle[0]);
    } else if (elapsed < releaseDuration) {
      const delivery = elapsed / releaseDuration;
      const pose = delivery < 0.55
        ? blendPose(flight.approach, plantPose, delivery / 0.55)
        : blendPose(plantPose, flight.release, (delivery - 0.55) / 0.45);
      const hand = drawAthlete(mix(flight.startX, flight.plantX, Math.min(1, delivery / 0.55)), pose);
      drawSpear(hand, pose.spearAngle[0]);
    } else {
      const progress = Math.min(1, (elapsed - releaseDuration) / flightDuration);
      const recovery = Math.min(1, (elapsed - releaseDuration) / 320);
      const pose = blendPose(flight.release, recoveryPose, recovery);
      drawAthlete(flight.plantX + flight.brakingStep * recovery, pose);
      const point = t => [
        mix(flight.tipX, flight.end, t),
        mix(flight.tipY, ground, t) - 4 * flight.height * t * (1 - t)
      ];
      const trail = Array.from({length: 21}, (_, index) => point(progress * index / 20));
      line(trail, "#d5f263aa");
      const heading = mix(flight.heading, Math.PI * 0.36, progress);
      const [tipX, tipY] = point(progress);
      drawSpear([tipX - 28 * Math.cos(heading), tipY - 28 * Math.sin(heading)], heading);
      if (progress === 1) {
        line([[flight.end, ground - 16], [flight.end, ground + 12]], "#d5f263", 5);
        context.fillStyle = "#f3f2e7";
        context.font = 'bold 25px "Cascadia Mono", Consolas, monospace';
        drawFieldLabel(format(flight.meters) + " m", flight.end, ground - 26);
      }
    }
  }

  function drawFieldLabel(text, x, y) {
    context.strokeStyle = "#14251e";
    context.lineWidth = 4;
    context.lineJoin = "round";
    context.strokeText(text, x, y);
    context.fillText(text, x, y);
  }

  function drawSpear([x, y], heading) {
    const dx = Math.cos(heading);
    const dy = Math.sin(heading);
    line([[x - 21 * dx, y - 21 * dy], [x + 24 * dx, y + 24 * dy]], "#e5cf9f", 3);
    line([[x + 20 * dx, y + 20 * dy], [x + 28 * dx, y + 28 * dy]], "#f3f2e7", 4);
  }

  function animateThrow(meters) {
    const startX = runnerX();
    const heading = -angle * Math.PI / 180;
    const release = {...releasePose, spearAngle: [heading]};
    const end = foulLine + meters * pixelsPerMeter;
    const tipOffset = release.throwHand[0] + 28 * Math.cos(heading);
    const plantX = Math.min(startX + 8, foulLine - 24, end - tipOffset - 1);
    const flight = {
      meters,
      approach: javelinRunningPose(distance, speed, reducedMotion.matches),
      release,
      startX,
      plantX,
      brakingStep: Math.min(14, foulLine - 23 - plantX),
      heading,
      tipX: plantX + tipOffset,
      tipY: ground + release.throwHand[1] + 28 * Math.sin(heading),
      end,
      height: 30 + angle * 1.5
    };
    const duration = releaseDuration + flightDuration;
    if (reducedMotion.matches) {
      drawField(flight, duration);
      return;
    }
    let started;
    function frame(now) {
      started ??= now;
      const elapsed = Math.min(duration, now - started);
      drawField(flight, elapsed);
      if (elapsed < duration) flightFrame = requestAnimationFrame(frame);
    }
    flightFrame = requestAnimationFrame(frame);
  }

  function switchTo(isThrow) {
    throwing.hidden = !isThrow;
    get("running").hidden = isThrow;
    runTab.setAttribute("aria-pressed", String(!isThrow));
    throwTab.setAttribute("aria-pressed", String(isThrow));
  }

  function drawThrow() {
    drawField();
    drawThrowStats();
  }

  function drawThrowStats() {
    get("runway").value = distance;
    get("throw-stats").textContent =
      angle + "° · " + format(speed, 1) + " m/s · " + format(24 - distance, 1) + " m til linjen";
  }

  function drawBest() {
    best.sort((a, b) => b.meters - a.meters);
    get("throw-records").replaceChildren(...best.slice(0, 8).map(entry => {
      const item = document.createElement("li");
      item.textContent = entry.name + " · " + format(entry.meters) + " m";
      return item;
    }));
  }

  function endAttempt() {
    active = false;
    cancelAnimationFrame(runFrame);
    abort.hidden = true;
    start.disabled = false;
    runTab.disabled = false;
    input.disabled = false;
    start.textContent = "Kast igen";
  }

  function finish() {
    endAttempt();
    if (distance >= 24 || speed === 0) {
      foul = distance >= 24;
      drawField();
      result.textContent = distance >= 24 ? "Ugyldigt kast. Du krydsede kastelinjen." : "Ugyldigt kast. Tag tilløb først.";
      return;
    }
    const angleFactor = 1 - Math.abs(angle - 40) / 65;
    const timingFactor = 1 - 0.55 * (24 - distance) / 24;
    const meters = speed * 8 * angleFactor * timingFactor;
    animateThrow(meters);
    result.textContent = "Kastelængde " + format(meters) + " m · " +
      (distance < 20 ? "Du slap tidligt." : "Du slap tæt på kastelinjen.");
    const index = best.findIndex(entry => entry.name.toLocaleLowerCase("da") === name.toLocaleLowerCase("da"));
    if (index >= 0 && best[index].meters >= meters) return;
    if (index < 0) best.push({name, meters});
    else best[index] = {name, meters};
    drawBest();
    try {
      localStorage.setItem(recordStorage, JSON.stringify(best));
    } catch {
      result.textContent += " Rekorder vises kun i denne session.";
    }
  }

  function tick(now) {
    if (!active) return;
    const dt = previousFrame === undefined ? 0 : Math.min(0.05, (now - previousFrame) / 1000);
    previousFrame = now;
    distance = Math.min(24, distance + speed * dt);
    speed *= Math.exp(-0.8 * dt);
    drawThrow();
    if (distance >= 24) finish();
    else runFrame = requestAnimationFrame(tick);
  }

  bindStart(start, input, () => {
    name = input.value.trim();
    if (!name || active) return;
    cancelAnimationFrame(flightFrame);
    foul = false;
    active = true;
    speed = 0;
    distance = 0;
    last = "";
    previousFrame = undefined;
    start.disabled = true;
    abort.hidden = false;
    runTab.disabled = true;
    input.disabled = true;
    result.textContent = "Klar. Vælg vinklen, og start tilløbet med A eller D.";
    drawThrow();
    runFrame = requestAnimationFrame(tick);
  });

  abort.addEventListener("click", () => {
    if (!active) return;
    endAttempt();
    distance = 0;
    speed = 0;
    result.textContent = "Kast afbrudt.";
    drawThrow();
    start.focus();
  });

  document.addEventListener("keydown", event => {
    if (throwing.hidden || event.repeat || event.target === input) return;
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "arrowdown") {
      if (!active || !last) {
        event.preventDefault();
        angle = Math.max(15, Math.min(70, angle + (key === "arrowup" ? 1 : -1)));
        drawThrowStats();
      }
    } else if (active && key === " " && event.target !== abort) {
      event.preventDefault();
      finish();
    } else if (active && (key === "a" || key === "d") && key !== last) {
      last = key;
      speed = Math.min(11, speed + 1.6);
    }
  });

  runTab.addEventListener("click", () => switchTo(false));
  throwTab.addEventListener("click", () => switchTo(true));
  athleteImage.addEventListener("load", () => drawField(renderedFlight, renderedElapsed));
  athleteImage.src = "javelin-athlete.png";
  drawThrow();
  drawBest();
}
