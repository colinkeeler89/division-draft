/**
 * Shown when the results feed could not be reached. The build no longer fails
 * in that case — the page renders, says so plainly, and repairs itself at the
 * next revalidation.
 */
export default function FeedDown() {
  return (
    <div className="notice">
      <h3>Couldn&apos;t reach the results feed</h3>
      <p>
        The numbers below may be missing or out of date. Nothing is broken on your side — the site
        retries automatically and should right itself within about fifteen minutes.
      </p>
    </div>
  );
}
