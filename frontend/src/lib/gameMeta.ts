/** Display metadata for installed game plugins (redesign-compliant). */

export interface GameMeta {
  id: string;
  short: string;
  label: string;
  icon: string;
  accent?: string;
}

const CATALOG: Record<string, GameMeta> = {
  zomboid: { id: "zomboid", short: "PZ", label: "Project Zomboid", icon: "🧟" },
  factorio: { id: "factorio", short: "FAC", label: "Factorio", icon: "⚙️" },
  hll: { id: "hll", short: "HLL", label: "Hell Let Loose", icon: "⚔️" },
  dayz: { id: "dayz", short: "DZ", label: "DayZ", icon: "🧭" },
  "arma-reforger": { id: "arma-reforger", short: "RFG", label: "Arma Reforger", icon: "🪖" },
  minecraft: { id: "minecraft", short: "MC", label: "Minecraft", icon: "⛏" },
  beammp: { id: "beammp", short: "BMP", label: "BeamMP", icon: "🚗" },
  rust: { id: "rust", short: "RST", label: "Rust", icon: "🔧" },
  terraria: { id: "terraria", short: "TER", label: "Terraria", icon: "🌳" },
  valheim: { id: "valheim", short: "VAL", label: "Valheim", icon: "⚔" },
  assettocorsa: { id: "assettocorsa", short: "AC", label: "Assetto Corsa", icon: "🏎" },
  stationeers: { id: "stationeers", short: "STN", label: "Stationeers", icon: "🛰" },
  humanitz: { id: "humanitz", short: "HUM", label: "HumanitZ", icon: "🧟" },
  icarus: { id: "icarus", short: "ICA", label: "Icarus", icon: "🚀" },
};

export function getGameMeta(gameType: string | undefined | null): GameMeta {
  if (!gameType) {
    return { id: "unknown", short: "???", label: "Unknown", icon: "🎮" };
  }
  const key = gameType.toLowerCase();
  if (CATALOG[key]) return CATALOG[key];
  const short = key.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "???";
  return {
    id: key,
    short,
    label: gameType,
    icon: "🎮",
  };
}

export function gameShort(gameType: string | undefined | null): string {
  return getGameMeta(gameType).short;
}

export function gameIcon(gameType: string | undefined | null): string {
  return getGameMeta(gameType).icon;
}

export function gameLabel(gameType: string | undefined | null): string {
  return getGameMeta(gameType).label;
}

export const ALL_GAME_META = Object.values(CATALOG);
