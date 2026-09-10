import { fetchStandingsSafe, tryFetchGames } from "./nfl";
import { LATEST_SEASON, addWeekly, buildSeason, type SeasonView } from "./pool";
import { project, type Projection } from "./projection";

export * from "./pool";

/**
 * Home page needs the current season (with chart), last season's champion, and
 * the live projection. The schedule fetch serves both the race chart and the
 * simulation, so it happens once whether or not the season has started.
 */
export async function fetchPair(): Promise<{
  season: SeasonView;
  prior: SeasonView;
  projection: Projection | null;
  feedOk: boolean;
}> {
  const { table: standings, ok: feedOk } = await fetchStandingsSafe();
  let season = buildSeason(standings, LATEST_SEASON);
  const prior = buildSeason(standings, LATEST_SEASON - 1);

  const games = await tryFetchGames(LATEST_SEASON);
  if (games && season.started) season = addWeekly(season, games);
  const projection = games ? project(season, games, standings) : null;

  return { season, prior, projection, feedOk };
}
