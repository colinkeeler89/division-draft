// Canonical NFL franchise registry.
// `abbr` is the nflverse / current-day abbreviation. `aliases` covers historical
// abbreviations for the same franchise so seasons back to 2015 resolve correctly.

export type Conference = "AFC" | "NFC";
export type Division =
  | "AFC East" | "AFC North" | "AFC South" | "AFC West"
  | "NFC East" | "NFC North" | "NFC South" | "NFC West";

export const DIVISIONS: Division[] = [
  "AFC East", "AFC North", "AFC South", "AFC West",
  "NFC East", "NFC North", "NFC South", "NFC West",
];

export type Team = {
  abbr: string;
  nick: string;
  city: string;
  div: Division;
  conf: Conference;
  color: string;   // franchise primary
  aliases: string[];   // historical abbreviations
  nickAliases: string[];   // historical / shorthand nicknames used in the old spreadsheet
};

export const TEAMS: Team[] = [
  { abbr: "BUF", nick: "Bills",      city: "Buffalo",       div: "AFC East",  conf: "AFC", color: "#00338D", aliases: [], nickAliases: [] },
  { abbr: "MIA", nick: "Dolphins",   city: "Miami",         div: "AFC East",  conf: "AFC", color: "#008E97", aliases: [], nickAliases: [] },
  { abbr: "NE",  nick: "Patriots",   city: "New England",   div: "AFC East",  conf: "AFC", color: "#002244", aliases: [], nickAliases: [] },
  { abbr: "NYJ", nick: "Jets",       city: "New York",      div: "AFC East",  conf: "AFC", color: "#125740", aliases: [], nickAliases: [] },

  { abbr: "BAL", nick: "Ravens",     city: "Baltimore",     div: "AFC North", conf: "AFC", color: "#241773", aliases: [], nickAliases: [] },
  { abbr: "CIN", nick: "Bengals",    city: "Cincinnati",    div: "AFC North", conf: "AFC", color: "#FB4F14", aliases: [], nickAliases: [] },
  { abbr: "CLE", nick: "Browns",     city: "Cleveland",     div: "AFC North", conf: "AFC", color: "#FF3C00", aliases: [], nickAliases: [] },
  { abbr: "PIT", nick: "Steelers",   city: "Pittsburgh",    div: "AFC North", conf: "AFC", color: "#FFB612", aliases: [], nickAliases: [] },

  { abbr: "HOU", nick: "Texans",     city: "Houston",       div: "AFC South", conf: "AFC", color: "#03202F", aliases: [], nickAliases: [] },
  { abbr: "IND", nick: "Colts",      city: "Indianapolis",  div: "AFC South", conf: "AFC", color: "#002C5F", aliases: [], nickAliases: [] },
  { abbr: "JAX", nick: "Jaguars",    city: "Jacksonville",  div: "AFC South", conf: "AFC", color: "#006778", aliases: ["JAC"], nickAliases: ["Jags"] },
  { abbr: "TEN", nick: "Titans",     city: "Tennessee",     div: "AFC South", conf: "AFC", color: "#4B92DB", aliases: [], nickAliases: [] },

  { abbr: "DEN", nick: "Broncos",    city: "Denver",        div: "AFC West",  conf: "AFC", color: "#FB4F14", aliases: [], nickAliases: [] },
  { abbr: "KC",  nick: "Chiefs",     city: "Kansas City",   div: "AFC West",  conf: "AFC", color: "#E31837", aliases: [], nickAliases: [] },
  { abbr: "LAC", nick: "Chargers",   city: "Los Angeles",   div: "AFC West",  conf: "AFC", color: "#0080C6", aliases: ["SD"], nickAliases: [] },
  { abbr: "LV",  nick: "Raiders",    city: "Las Vegas",     div: "AFC West",  conf: "AFC", color: "#A5ACAF", aliases: ["OAK"], nickAliases: [] },

  { abbr: "DAL", nick: "Cowboys",    city: "Dallas",        div: "NFC East",  conf: "NFC", color: "#7F9695", aliases: [], nickAliases: [] },
  { abbr: "NYG", nick: "Giants",     city: "New York",      div: "NFC East",  conf: "NFC", color: "#0B2265", aliases: [], nickAliases: [] },
  { abbr: "PHI", nick: "Eagles",     city: "Philadelphia",  div: "NFC East",  conf: "NFC", color: "#004C54", aliases: [], nickAliases: [] },
  { abbr: "WAS", nick: "Commanders", city: "Washington",    div: "NFC East",  conf: "NFC", color: "#5A1414", aliases: ["WSH"], nickAliases: ["Redskins", "Football Team", "Washington"] },

  { abbr: "CHI", nick: "Bears",      city: "Chicago",       div: "NFC North", conf: "NFC", color: "#C83803", aliases: [], nickAliases: [] },
  { abbr: "DET", nick: "Lions",      city: "Detroit",       div: "NFC North", conf: "NFC", color: "#0076B6", aliases: [], nickAliases: [] },
  { abbr: "GB",  nick: "Packers",    city: "Green Bay",     div: "NFC North", conf: "NFC", color: "#FFB612", aliases: [], nickAliases: [] },
  { abbr: "MIN", nick: "Vikings",    city: "Minnesota",     div: "NFC North", conf: "NFC", color: "#4F2683", aliases: [], nickAliases: [] },

  { abbr: "ATL", nick: "Falcons",    city: "Atlanta",       div: "NFC South", conf: "NFC", color: "#A71930", aliases: [], nickAliases: [] },
  { abbr: "CAR", nick: "Panthers",   city: "Carolina",      div: "NFC South", conf: "NFC", color: "#0085CA", aliases: [], nickAliases: [] },
  { abbr: "NO",  nick: "Saints",     city: "New Orleans",   div: "NFC South", conf: "NFC", color: "#D3BC8D", aliases: [], nickAliases: [] },
  { abbr: "TB",  nick: "Buccaneers", city: "Tampa Bay",     div: "NFC South", conf: "NFC", color: "#D50A0A", aliases: [], nickAliases: ["Bucs"] },

  { abbr: "ARI", nick: "Cardinals",  city: "Arizona",       div: "NFC West",  conf: "NFC", color: "#97233F", aliases: [], nickAliases: [] },
  { abbr: "LA",  nick: "Rams",       city: "Los Angeles",   div: "NFC West",  conf: "NFC", color: "#003594", aliases: ["LAR", "STL"], nickAliases: [] },
  { abbr: "SF",  nick: "49ers",      city: "San Francisco", div: "NFC West",  conf: "NFC", color: "#AA0000", aliases: [], nickAliases: ["Niners"] },
  { abbr: "SEA", nick: "Seahawks",   city: "Seattle",       div: "NFC West",  conf: "NFC", color: "#69BE28", aliases: [], nickAliases: [] },
];

/** abbreviation (current or historical) -> canonical abbreviation */
const ABBR_INDEX = new Map<string, string>();
/** lowercased nickname (current, historical, or "city nick") -> canonical abbreviation */
const NICK_INDEX = new Map<string, string>();

for (const t of TEAMS) {
  ABBR_INDEX.set(t.abbr, t.abbr);
  for (const a of t.aliases) ABBR_INDEX.set(a, t.abbr);
  NICK_INDEX.set(t.nick.toLowerCase(), t.abbr);
  NICK_INDEX.set(`${t.city} ${t.nick}`.toLowerCase(), t.abbr);
  for (const n of t.nickAliases) NICK_INDEX.set(n.toLowerCase(), t.abbr);
}

export const BY_ABBR = new Map(TEAMS.map((t) => [t.abbr, t]));

/** Resolve a feed abbreviation (incl. OAK/SD/STL/LAR) to the canonical franchise. */
export function teamFromAbbr(abbr: string): Team {
  const canon = ABBR_INDEX.get(abbr.trim().toUpperCase());
  if (!canon) throw new Error(`Unknown NFL abbreviation from feed: "${abbr}"`);
  return BY_ABBR.get(canon)!;
}

/**
 * Resolve a nickname as a human would type it into the roster file.
 * Case-insensitive; accepts "Bucs", "Jags", "Redskins", "Los Angeles Rams", "LAR".
 * Returns null rather than throwing so the roster page can flag bad entries.
 */
export function teamFromNick(nick: string): Team | null {
  const raw = nick.trim();
  if (!raw) return null;
  const byNick = NICK_INDEX.get(raw.toLowerCase());
  if (byNick) return BY_ABBR.get(byNick)!;
  const byAbbr = ABBR_INDEX.get(raw.toUpperCase());
  return byAbbr ? BY_ABBR.get(byAbbr)! : null;
}

export function teamsInDivision(div: Division): Team[] {
  return TEAMS.filter((t) => t.div === div);
}
