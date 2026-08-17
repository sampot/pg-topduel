import { TopDuelAudio } from "./audio.js";
import { TopDuelGame, W, H, MAX_RPM } from "./game.js";

const audio = new TopDuelAudio();
const game = new TopDuelGame();
// KV 為權威；本地快取過舊時以遠端為準
void game.mergeBestFromKv().then(() => syncHud());

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("game"));
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const btnStart = document.getElementById("btn-start");
const btnMute = document.getElementById("btn-mute");
const barYou = document.getElementById("bar-you");
const barEnemy = document.getElementById("bar-enemy");
const rpmYou = document.getElementById("rpm-you");
const rpmEnemy = document.getElementById("rpm-enemy");
const chargeHint = document.getElementById("charge-hint");
const stageEl = document.querySelector(".stage");

canvas.width = W;
canvas.height = H;

/** @type {number | null} */
let chargePointer = null;
let lastChargeTick = 0;
let lastTs = 0;

/**
 * @param {string} msg
 * @param {string} [tone]
 */
function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncHud() {
  scoreEl.textContent = game.scoreLabel;
  bestEl.textContent = String(game.bestStreak);

  const pRpm = Math.round(game.player?.rpm ?? 0);
  const eRpm = Math.round(game.enemy?.rpm ?? 0);
  rpmYou.textContent = String(pRpm);
  rpmEnemy.textContent = String(eRpm);
  barYou.style.width = `${Math.min(100, (pRpm / MAX_RPM) * 100)}%`;
  barEnemy.style.width = `${Math.min(100, (eRpm / MAX_RPM) * 100)}%`;
  barYou.parentElement?.setAttribute("aria-valuenow", String(pRpm));
  barEnemy.parentElement?.setAttribute("aria-valuenow", String(eRpm));

  const ready = game.phase === "round_ready";
  chargeHint.hidden = !ready;
  stageEl.classList.toggle("is-ready", ready);
  stageEl.classList.toggle("is-playing", game.phase === "round_playing");

  if (game.phase === "idle" || game.phase === "match_over") {
    btnStart.textContent = "開局";
  } else if (game.phase === "match" || game.phase === "round_over") {
    btnStart.textContent = "重開";
  } else {
    btnStart.textContent = "重開";
  }
}

/**
 * @param {PointerEvent} ev
 */
function aimFromEvent(ev) {
  const p = game.player;
  if (!p) return game.aimAngle;
  const rect = canvas.getBoundingClientRect();
  const sx = ((ev.clientX - rect.left) / rect.width) * W;
  const sy = ((ev.clientY - rect.top) / rect.height) * H;
  return Math.atan2(sy - p.y, sx - p.x);
}

/**
 * @param {string[]} events
 */
function handleEvents(events) {
  for (const e of events) {
    if (e === "launchEnemy") {
      void audio.unlock();
      audio.enemyLaunch();
    } else if (e === "hit") {
      audio.hit();
    } else if (e === "roundWin") {
      audio.roundWin();
      setStatus(game.message, "ok");
    } else if (e === "roundLose") {
      audio.roundLose();
      setStatus(game.message, "bad");
    } else if (e === "matchWin") {
      audio.matchWin();
      audio.stopSpin();
      setStatus(game.message, "ok");
    } else if (e === "matchLose") {
      audio.matchLose();
      audio.stopSpin();
      setStatus(game.message, "bad");
    }
  }
}

canvas.addEventListener(
  "pointerdown",
  (ev) => {
    if (game.phase !== "round_ready") return;
    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);
    chargePointer = ev.pointerId;
    void audio.unlock();
    game.setCharging(true, aimFromEvent(ev));
  },
  { passive: false },
);

canvas.addEventListener(
  "pointermove",
  (ev) => {
    if (chargePointer !== ev.pointerId || game.phase !== "round_ready") return;
    ev.preventDefault();
    game.setCharging(true, aimFromEvent(ev));
  },
  { passive: false },
);

/**
 * @param {PointerEvent} ev
 */
function endCharge(ev) {
  if (chargePointer !== ev.pointerId) return;
  chargePointer = null;
  const wasLaunch = game.charging && game.charge > 0.08;
  game.setCharging(false);
  if (wasLaunch) {
    audio.launch();
  }
}

canvas.addEventListener("pointerup", endCharge);
canvas.addEventListener("pointercancel", endCharge);

btnStart.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  game.startMatch();
  setStatus(game.message);
  syncHud();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  const on = !(btnMute.getAttribute("aria-pressed") === "true");
  btnMute.setAttribute("aria-pressed", on ? "true" : "false");
  btnMute.textContent = on ? "音效開" : "音效關";
  audio.setEnabled(on);
});

/**
 * @param {number} ts
 */
function frame(ts) {
  const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;

  const events = game.update(dt);
  handleEvents(events);

  if (game.charging && game.charge > 0 && ts - lastChargeTick > 120) {
    lastChargeTick = ts;
    audio.chargeTick();
  }

  const maxRpm = Math.max(game.player?.rpm ?? 0, game.enemy?.rpm ?? 0);
  if (game.phase === "round_playing" && maxRpm > 80) {
    audio.setSpin(maxRpm);
  } else {
    audio.stopSpin();
  }

  game.draw(ctx);
  syncHud();
  requestAnimationFrame(frame);
}

syncHud();
setStatus(game.message);
requestAnimationFrame(frame);
