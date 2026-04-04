import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// --- Types ---

interface EmotionLabel {
  label: string;
  P: number;
  A: number;
  D: number;
}

interface CharacterState {
  character_id: string;
  st_pleasure: number;
  st_arousal: number;
  st_dominance: number;
  bl_pleasure: number;
  bl_arousal: number;
  bl_dominance: number;
  plasticity: number;
  experience_count: number;
  last_spoke_at: string | null;
  last_topic: string | null;
  speak_count: number;
  updated_at: string;
}

interface EmotionLogEntry {
  cause: string | null;
  processing: string | null;
}

interface DecayResult {
  decayed: boolean;
  st_p: number;
  st_a: number;
  st_d: number;
  dt_hours?: number;
}

// --- Config ---

const RELAY_BASE = "http://host.docker.internal:9819";
const LAMBDA = 0.1; // 半減期 約7時間
const MIN_DECAY_HOURS = 5 / 60; // 5分未満は減衰しない
const BLEND_THRESHOLD = 0.3; // 2番目のラベルとの距離差閾値

// --- Relay helpers ---

async function relayGet<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${RELAY_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`GET ${endpoint} failed: ${res.status}`);
  return res.json();
}

async function relayPost(
  endpoint: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${RELAY_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${endpoint} failed: ${res.status}`);
}

// --- Decay ---

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function calcDecay(state: CharacterState): DecayResult {
  const updated = new Date(state.updated_at).getTime();
  const now = Date.now();
  const dtHours = (now - updated) / (1000 * 60 * 60);

  if (dtHours < MIN_DECAY_HOURS) {
    return {
      decayed: false,
      st_p: state.st_pleasure,
      st_a: state.st_arousal,
      st_d: state.st_dominance,
    };
  }

  const decay = Math.exp(-LAMBDA * dtHours);
  const st_p = clamp(
    state.bl_pleasure + (state.st_pleasure - state.bl_pleasure) * decay,
    -1,
    1
  );
  const st_a = clamp(
    state.bl_arousal + (state.st_arousal - state.bl_arousal) * decay,
    -1,
    1
  );
  const st_d = clamp(
    state.bl_dominance + (state.st_dominance - state.bl_dominance) * decay,
    -1,
    1
  );

  return {
    decayed: true,
    st_p: Math.round(st_p * 10000) / 10000,
    st_a: Math.round(st_a * 10000) / 10000,
    st_d: Math.round(st_d * 10000) / 10000,
    dt_hours: Math.round(dtHours * 100) / 100,
  };
}

// --- PAD→感情ラベル変換 ---

function loadEmotionLabels(): EmotionLabel[] {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const path = join(__dirname, "emotion-labels.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function padToLabel(
  p: number,
  a: number,
  d: number,
  labels: EmotionLabel[]
): string {
  const dists = labels
    .map((e) => ({
      label: e.label,
      dist: Math.sqrt((p - e.P) ** 2 + (a - e.A) ** 2 + (d - e.D) ** 2),
    }))
    .sort((a, b) => a.dist - b.dist);

  const primary = dists[0].label;
  if (dists.length > 1 && dists[1].dist < dists[0].dist + BLEND_THRESHOLD) {
    return `${primary}（やや${dists[1].label}気味）`;
  }
  return primary;
}

// --- トーンガイド ---

function toneGuide(label: string): string {
  if (/嬉しい|感謝|愛着/.test(label)) {
    return "温かみのある表現、ポジティブな着地";
  }
  if (/穏やか|満足/.test(label)) {
    return "落ち着いた語り口、丁寧な応答";
  }
  if (/興奮|好奇心/.test(label)) {
    return "テンポの良い短文、明るく前のめり";
  }
  if (/不安|落ち込み|切ない/.test(label)) {
    return "控えめなトーン、内省的な切り口";
  }
  if (/退屈/.test(label)) {
    return "軽いユーモア、話題を探す";
  }
  if (/苛立ち/.test(label)) {
    return "率直な表現、ただし攻撃的にはならない";
  }
  if (/驚き/.test(label)) {
    return "素直なリアクション、好奇心を乗せる";
  }
  if (/恥ずかしい/.test(label)) {
    return "照れを見せつつ、素直に受け止める";
  }
  if (/緊張/.test(label)) {
    return "慎重な言い回し、確認を挟む";
  }
  if (/自信がある/.test(label)) {
    return "はっきりした口調、提案を積極的に";
  }
  return "自然体で応答";
}

// --- Main handler ---

const handler = async (event: any) => {
  if (event.type !== "agent" || event.action !== "bootstrap") {
    return;
  }

  try {
    // 1. character_state取得（リレー経由）
    const rows = await relayGet<CharacterState[]>("/emotion-get");
    if (!rows || rows.length === 0) {
      console.error("[emotion-state] character_state not found");
      return;
    }
    const state = rows[0];

    // 2. 遅延評価型減衰
    const decay = calcDecay(state);

    // 3. 減衰が発生したらリレー経由でDB更新
    if (decay.decayed) {
      await relayPost("/emotion-decay", {
        st_pleasure: decay.st_p,
        st_arousal: decay.st_a,
        st_dominance: decay.st_d,
        updated_at: new Date().toISOString(),
        prev_pleasure: state.st_pleasure,
        prev_arousal: state.st_arousal,
        prev_dominance: state.st_dominance,
        d_pleasure:
          Math.round((decay.st_p - state.st_pleasure) * 10000) / 10000,
        d_arousal:
          Math.round((decay.st_a - state.st_arousal) * 10000) / 10000,
        d_dominance:
          Math.round((decay.st_d - state.st_dominance) * 10000) / 10000,
        cause: `${decay.dt_hours}時間経過による自然減衰`,
      });
    }

    // 4. PAD→感情ラベル変換
    const labels = loadEmotionLabels();
    const emotionLabel = padToLabel(decay.st_p, decay.st_a, decay.st_d, labels);

    // 5. 直近のきっかけ取得（リレー経由）
    let causeText = "";
    try {
      const logs = await relayGet<EmotionLogEntry[]>("/emotion-log-latest");
      if (logs && logs.length > 0 && logs[0].cause) {
        causeText = logs[0].cause;
        if (logs[0].processing) {
          causeText += ` → ${logs[0].processing}`;
        }
      }
    } catch {
      // きっかけ取得失敗は無視
    }

    // 6. EMOTION.mdを生成してbootstrapFilesに注入
    const tone = toneGuide(emotionLabel);
    const blNote = `基準: P=${state.bl_pleasure}, A=${state.bl_arousal}, D=${state.bl_dominance}`;

    let content = `# 現在の感情状態\n\n`;
    content += `感情: ${emotionLabel}\n`;
    content += `P=${decay.st_p}, A=${decay.st_a}, D=${decay.st_d}（${blNote}）\n`;
    if (causeText) {
      content += `きっかけ: ${causeText}\n`;
    }
    content += `\nこの感情状態を意識して応答のトーンに反映すること。\n`;
    content += `トーンガイド: ${tone}\n`;

    if (event.context?.bootstrapFiles) {
      event.context.bootstrapFiles.push({
        name: "EMOTION.md",
        content,
      });
    }
  } catch (err) {
    console.error("[emotion-state] hook error:", err);
  }
};

export default handler;
