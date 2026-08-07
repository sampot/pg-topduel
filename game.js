/**
 * Spinning top duel — circular arena, charge & launch, spin decay.
 * Genre homage, not a commercial clone.
 */

export const W = 360;
export const H = 360;
export const ARENA_R = 148;
export const TOP_R = 14;
export const MAX_RPM = 1500;
export const MIN_RPM = 28;
export const WINS_TO_MATCH = 2;
export const BEST_KEY = "pg-topduel-best";

/**
 * @param {string} name
 * @param {string} fallback
 */
function readCss(name, fallback) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * @typedef {{
 *   side: 'player'|'enemy',
 *   x: number, y: number,
 *   vx: number, vy: number,
 *   rpm: number,
 *   angle: number,
 *   alive: boolean,
 *   launched: boolean,
 * }} Top
 */

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} angle
 * @param {number} dist
 */
export function spawnPoint(cx, cy, angle, dist) {
  return {
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
  };
}

export class TopDuelGame {
  constructor() {
    this.cx = W / 2;
    this.cy = H / 2;
    this.spawnDist = ARENA_R * 0.62;
    /** @type {'idle'|'match'|'round_ready'|'round_playing'|'round_over'|'match_over'} */
    this.phase = "idle";
    this.message = "點「開局」開始三戰兩勝";
    this.playerRoundWins = 0;
    this.enemyRoundWins = 0;
    this.matchWins = 0;
    this.winStreak = 0;
    this.bestStreak = TopDuelGame.loadBest();
    /** @type {Top | null} */
    this.player = null;
    /** @type {Top | null} */
    this.enemy = null;
    this.charge = 0;
    this.charging = false;
    /** @type {number} */
    this.aimAngle = -Math.PI / 2;
    this.aiTimer = 0;
    this.aiCharge = 0;
    this.aiCharging = false;
    this.roundPause = 0;
    this.lastHitAt = 0;
    this.shake = 0;
  }

  static loadBest() {
    try {
      const v = localStorage.getItem(BEST_KEY);
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    if (this.winStreak > this.bestStreak) {
      this.bestStreak = this.winStreak;
      try {
        localStorage.setItem(BEST_KEY, String(this.bestStreak));
      } catch {
        /* ignore */
      }
    }
  }

  resetTops() {
    const you = spawnPoint(this.cx, this.cy, Math.PI / 2, this.spawnDist);
    const foe = spawnPoint(this.cx, this.cy, -Math.PI / 2, this.spawnDist);
    this.player = {
      side: "player",
      x: you.x,
      y: you.y,
      vx: 0,
      vy: 0,
      rpm: 0,
      angle: 0,
      alive: true,
      launched: false,
    };
    this.enemy = {
      side: "enemy",
      x: foe.x,
      y: foe.y,
      vx: 0,
      vy: 0,
      rpm: 0,
      angle: 0,
      alive: true,
      launched: false,
    };
    this.charge = 0;
    this.charging = false;
    this.aimAngle = -Math.PI / 2;
    this.aiTimer = 0.35 + Math.random() * 0.55;
    this.aiCharge = 0;
    this.aiCharging = false;
    this.roundPause = 0;
    this.lastHitAt = 0;
  }

  startMatch() {
    this.phase = "match";
    this.playerRoundWins = 0;
    this.enemyRoundWins = 0;
    this.message = "三戰兩勝 — 第 1 局";
    this.beginRound();
  }

  beginRound() {
    this.resetTops();
    this.phase = "round_ready";
    const n = this.playerRoundWins + this.enemyRoundWins + 1;
    this.message = `第 ${n} 局 · 按住競技場蓄力`;
  }

  /**
   * @param {boolean} on
   * @param {number} [aimAngle]
   */
  setCharging(on, aimAngle) {
    if (this.phase !== "round_ready" || !this.player || this.player.launched) return;
    this.charging = on;
    if (typeof aimAngle === "number") this.aimAngle = aimAngle;
    if (!on && this.charge > 0.08) {
      this.launchPlayer();
    } else if (!on) {
      this.charge = 0;
    }
  }

  /**
   * @param {number} dt
   */
  tickCharge(dt) {
    if (this.phase !== "round_ready" || !this.charging || !this.player || this.player.launched) return;
    this.charge = Math.min(1, this.charge + dt / 1.35);
  }

  launchPlayer() {
    const p = this.player;
    if (!p || p.launched) return;
    const power = Math.max(0.18, this.charge);
    const speed = 70 + power * 260;
    const dir = this.aimAngle;
    p.vx = Math.cos(dir) * speed;
    p.vy = Math.sin(dir) * speed;
    p.rpm = 280 + power * (MAX_RPM - 280);
    p.launched = true;
    p.alive = true;
    this.charging = false;
    this.charge = 0;
    this.phase = "round_playing";
    this.message = "對戰中…";
    this.aiCharging = true;
    this.aiCharge = 0;
    this.aiTimer = 0.25 + Math.random() * 0.45;
  }

  launchEnemy() {
    const e = this.enemy;
    const p = this.player;
    if (!e || !p || e.launched) return;
    const power = 0.45 + Math.random() * 0.45;
    let dir = Math.atan2(p.y - e.y, p.x - e.x);
    dir += (Math.random() - 0.5) * 0.35;
    const speed = 65 + power * 250;
    e.vx = Math.cos(dir) * speed;
    e.vy = Math.sin(dir) * speed;
    e.rpm = 260 + power * (MAX_RPM - 260);
    e.launched = true;
    e.alive = true;
    this.aiCharging = false;
  }

  /**
   * @param {Top} a
   * @param {Top} b
   */
  resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const minD = TOP_R * 2;
    if (dist >= minD) return false;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minD - dist;
    a.x -= nx * overlap * 0.5;
    a.y -= ny * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.y += ny * overlap * 0.5;

    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    const rel = rvx * nx + rvy * ny;
    if (rel < 0) {
      const imp = rel * 0.92;
      a.vx += imp * nx;
      a.vy += imp * ny;
      b.vx -= imp * nx;
      b.vy -= imp * ny;
    }

    const hit = 0.18 + Math.min(0.12, Math.abs(rel) / 400);
    a.rpm *= 1 - hit;
    b.rpm *= 1 - hit;
    this.shake = Math.min(8, this.shake + 3 + Math.abs(rel) * 0.01);
    this.lastHitAt = performance.now();
    return true;
  }

  /**
   * @param {Top} t
   */
  wallBounce(t) {
    const dx = t.x - this.cx;
    const dy = t.y - this.cy;
    const dist = Math.hypot(dx, dy);
    const maxD = ARENA_R - TOP_R;
    if (dist <= maxD) return false;

    const nx = dx / (dist || 1);
    const ny = dy / (dist || 1);
    const dot = t.vx * nx + t.vy * ny;
    if (dot > 85) return false;

    t.x = this.cx + nx * maxD;
    t.y = this.cy + ny * maxD;
    if (dot > 0) {
      t.vx -= 1.85 * dot * nx;
      t.vy -= 1.85 * dot * ny;
      t.rpm *= 0.88;
    }
    return true;
  }

  /**
   * @param {Top} t
   */
  isOut(t) {
    const dist = Math.hypot(t.x - this.cx, t.y - this.cy);
    return dist > ARENA_R - TOP_R * 0.35;
  }

  /**
   * @param {Top} t
   * @param {number} dt
   */
  integrateTop(t, dt) {
    if (!t.launched || !t.alive) return;
    t.x += t.vx * dt;
    t.y += t.vy * dt;
    const friction = Math.pow(0.985, dt * 60);
    t.vx *= friction;
    t.vy *= friction;

    const decay = 1 - 0.42 * dt;
    t.rpm = Math.max(0, t.rpm * decay);
    t.angle += (t.rpm / 60) * Math.PI * 2 * dt * (t.side === "player" ? 1 : -1);

    this.wallBounce(t);
    if (t.rpm < MIN_RPM) t.alive = false;
  }

  /**
   * @param {number} dt
   * @returns {string[]}
   */
  update(dt) {
    /** @type {string[]} */
    const events = [];

    if (this.phase === "round_ready") {
      this.tickCharge(dt);
      return events;
    }

    if (this.phase === "round_playing") {
      const p = this.player;
      const e = this.enemy;
      if (!p || !e) return events;

      if (this.aiCharging && p.launched && !e.launched) {
        this.aiTimer -= dt;
        if (this.aiTimer <= 0) {
          this.aiCharge = Math.min(1, this.aiCharge + dt / (0.7 + Math.random() * 0.5));
          if (this.aiCharge >= 0.55 + Math.random() * 0.35) {
            this.launchEnemy();
            events.push("launchEnemy");
          }
        }
      }

      this.integrateTop(p, dt);
      this.integrateTop(e, dt);

      if (p.launched && e.launched && this.resolveCollision(p, e)) {
        events.push("hit");
      }

      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 22);

      const pOut = p.launched && this.isOut(p);
      const eOut = e.launched && this.isOut(e);
      const pDead = p.launched && !p.alive;
      const eDead = e.launched && !e.alive;

      if ((p.launched && e.launched) && (pOut || eOut || pDead || eDead)) {
        let playerWon = false;
        if (pOut && !eOut) playerWon = false;
        else if (eOut && !pOut) playerWon = true;
        else if (pDead && !eDead) playerWon = false;
        else if (eDead && !pDead) playerWon = true;
        else playerWon = p.rpm >= e.rpm;

        this.finishRound(playerWon, events);
      } else if (p.launched && e.launched && !p.alive && !e.alive && p.rpm <= MIN_RPM && e.rpm <= MIN_RPM) {
        this.finishRound(p.rpm >= e.rpm, events);
      }
      return events;
    }

    if (this.phase === "round_over") {
      this.roundPause -= dt;
      if (this.roundPause <= 0) {
        if (this.playerRoundWins >= WINS_TO_MATCH || this.enemyRoundWins >= WINS_TO_MATCH) {
          this.finishMatch(events);
        } else {
          this.beginRound();
        }
      }
    }

    return events;
  }

  /**
   * @param {boolean} playerWon
   * @param {string[]} events
   */
  finishRound(playerWon, events) {
    this.phase = "round_over";
    this.roundPause = 1.35;
    if (playerWon) {
      this.playerRoundWins += 1;
      this.message = `你贏第 ${this.playerRoundWins + this.enemyRoundWins} 局！`;
      events.push("roundWin");
    } else {
      this.enemyRoundWins += 1;
      this.message = `對手贏第 ${this.playerRoundWins + this.enemyRoundWins} 局…`;
      events.push("roundLose");
    }
  }

  /**
   * @param {string[]} events
   */
  finishMatch(events) {
    this.phase = "match_over";
    const playerMatchWin = this.playerRoundWins >= WINS_TO_MATCH;
    if (playerMatchWin) {
      this.matchWins += 1;
      this.winStreak += 1;
      this.saveBest();
      this.message = `勝利！${this.playerRoundWins} : ${this.enemyRoundWins} · 再點「開局」`;
      events.push("matchWin");
    } else {
      this.winStreak = 0;
      this.message = `落敗 ${this.playerRoundWins} : ${this.enemyRoundWins} · 再點「開局」`;
      events.push("matchLose");
    }
  }

  get scoreLabel() {
    return `${this.playerRoundWins} : ${this.enemyRoundWins}`;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const { cx, cy } = this;

    ctx.save();
    if (this.shake > 0.2) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    ctx.fillStyle = readCss("--arena-bg", "#1a2420");
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(cx, cy, ARENA_R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = readCss("--arena-ring", "#5a6b5c");
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, ARENA_R, 0, Math.PI * 2);
    ctx.fillStyle = readCss("--arena-floor", "#243028");
    ctx.fill();
    ctx.strokeStyle = readCss("--arena-line", "#3d5244");
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, ARENA_R * 0.45, 0, Math.PI * 2);
    ctx.strokeStyle = readCss("--arena-line", "#3d5244");
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    if (this.phase === "round_ready" && this.player && !this.player.launched) {
      this.drawAim(ctx);
      this.drawChargeRing(ctx);
    }

    if (this.enemy) this.drawTop(ctx, this.enemy);
    if (this.player) this.drawTop(ctx, this.player);

    ctx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  drawAim(ctx) {
    const p = this.player;
    if (!p) return;
    const len = 36 + this.charge * 48;
    ctx.save();
    ctx.strokeStyle = readCss("--accent", "#2563eb");
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(this.aimAngle) * len, p.y + Math.sin(this.aimAngle) * len);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(this.aimAngle) * len, p.y + Math.sin(this.aimAngle) * len, 4, 0, Math.PI * 2);
    ctx.fillStyle = readCss("--accent", "#2563eb");
    ctx.fill();
    ctx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  drawChargeRing(ctx) {
    const p = this.player;
    if (!p || this.charge <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, TOP_R + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.charge);
    ctx.strokeStyle = readCss("--accent", "#2563eb");
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {Top} t
   */
  drawTop(ctx, t) {
    const isYou = t.side === "player";
    const base = isYou ? "#2f8f5b" : "#c2410c";
    const rim = isYou ? "#1e5c3a" : "#7c2d12";
    const alpha = t.launched ? (t.alive ? 1 : 0.35) : 0.85;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);

    ctx.beginPath();
    ctx.arc(0, 0, TOP_R, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(TOP_R - 2, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, TOP_R * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();

    if (t.launched && t.rpm > MIN_RPM) {
      const blur = ctx.createRadialGradient(0, 0, TOP_R * 0.2, 0, 0, TOP_R * 1.2);
      blur.addColorStop(0, "transparent");
      blur.addColorStop(1, isYou ? "rgba(47,143,91,0.22)" : "rgba(194,65,12,0.22)");
      ctx.fillStyle = blur;
      ctx.beginPath();
      ctx.arc(0, 0, TOP_R * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
