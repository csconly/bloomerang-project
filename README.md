# Volunteer shift eligibility

Implementation of `checkEligibility(volunteerId, openingId, fixtures) -> { status, reasons }`
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

```bash
npm run cli -- <volunteerId> <openingId>
```

Example:

```bash
npm run cli -- vol-001 open-meals-mon-pm-server
```

Volunteer and opening IDs come from `fixtures/fixtures.json`. Prints the
`{ status, reasons }` result as JSON.

## Other commands

```bash
npm run typecheck   # type-check without emitting
npm run build       # compile to dist/
```
