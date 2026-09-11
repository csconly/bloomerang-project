# Volunteer shift eligibility

Implementation of `checkEligibility(volunteerId, openingId) -> { status, reasons }`
per [`SPEC.md`](SPEC.md). See [`EXERCISE-README.md`](EXERCISE-README.md) for
the original assessment instructions, and [`DECISIONS.md`](DECISIONS.md) for
the reasoning behind every judgment call made while resolving gaps and
contradictions in the spec.

## Setup

```bash
npm install
```

## Run the tests

```bash
npm test
```

Runs the given scenarios in `fixtures/cases.json`, plus a set of
supplementary tests covering the spec ambiguities resolved in
`DECISIONS.md`.

## Run it from the command line

Check a single opening:

```bash
npm run cli -- opening <volunteerId> <openingId>
```

Check every opening under an opportunity at once:

```bash
npm run cli -- opportunity <volunteerId> <opportunityId>
```

Examples:

```bash
npm run cli -- opening vol-001 open-meals-mon-pm-server
npm run cli -- opportunity vol-002 opp-meals
```

IDs come from `fixtures/fixtures.json`. Prints the result as JSON --
`{ status, reasons }` for a single opening, or a `{ openingId, status, reasons }[]`
array for a whole opportunity.

## Other commands

```bash
npm run typecheck   # type-check without emitting
npm run build       # compile to dist/
```
