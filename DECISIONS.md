# Decisions

> This is the part of your submission we read most carefully. Prose is fine—bullet
> points are fine too. Length isn't a virtue—roughly a page is plenty.

## What I built

A single function, `checkEligibility(volunteerId, openingId)`, matching the spec's exact
signature — it loads the fixture data internally rather than taking it as an argument, the
same way a real implementation would hide a database call behind that same two-argument
shape. Internally it's split into an opportunity-level check (qualifications, waiver, group
restriction — depends only on the volunteer and opportunity) and an opening-level check
(shift/opening status, capacity, schedule conflict — depends on the specific shift), which
lets a second function, `checkEligibilityForOpportunity`, reuse the opportunity-level piece
once across every opening under an opportunity instead of recomputing it per opening.

## Assumptions I made

When the spec was unclear or contradicted itself, I assumed its own stated spirit —
especially the background section's insistence that telling a volunteer "you can't sign
up" with no explanation is "the worst possible outcome" — outweighed the literal wording
of any specific rule that conflicted with it. I applied this consistently: reasons always
accumulate across rules rather than getting suppressed, even in places where a rule's
specific phrasing (the capacity section's "status is WAITLIST," the group-restriction
section's "return an empty reasons list") read as if it should override everything else.
In a real engineering setting I'd have taken these contradictions back to the spec's
author rather than resolving them myself — with that option unavailable, I protected the
one thing the spec was unambiguous about over anything it was vague or inconsistent about.

I also assumed `checkEligibilityForOpportunity` should return one result per opening under
the opportunity — matching a page that lists a single opportunity's shifts/roles — rather
than one combined result for the whole opportunity, which would fit a page listing many
opportunities instead. The spec's one line ("worked for a whole opportunity at once, so the
browse page stays fast") doesn't say which page it means. I'd have asked directly which
browse page this was for before building either version.

I also assumed we don't need to sort the `reasons` array ourselves before returning it. The
spec says "the checker sorts before comparing," so I left sorting to whoever consumes the
result (our tests sort both sides before comparing).

## Problems I found in the spec

**1. Capacity's wording (rule 2).** The spec says "status is WAITLIST" as if capacity
decides the final answer by itself. But what if another rule blocks the volunteer too?
The spec doesn't say. I made blocking reasons always win — WAITLIST only shows up when
capacity is the only problem. I'd reword that line so it doesn't sound like the final say.

**2. DOES_NOT_HAVE_ALL contradicts its own example (rule 3).** The table says this rule
only fails if you hold *every* listed qualification. But the worked example blocks Fern
for holding just *one* of two. I went with the example, since it's concrete proof of what's
intended. I'd rename the rule and fix the table text to match.

**3. GROUP_RESTRICTED can never be shown to a volunteer — but is that really a mistake, or
a security choice? (rule 5).** The code is listed as valid, but the rule says to hide it
from the volunteer, so it never shows up in a volunteer-facing result. My first take was
"this code is dead, just delete it" — but hiding group membership looks like a deliberate
privacy/security decision, not an oversight. The real gap is that the spec (and our
function) only has one audience in mind. It never asks: should this information exist
somewhere, just not here — like an internal log, or a view an admin can see? Our function
can't answer that on its own, since it doesn't have any concept of who's asking. I'd take
this straight to a product manager rather than guess: is group-restriction status meant to
be invisible to *everyone*, or just to the volunteer? If it's the latter, the function
might need a way to know who's asking.

**4. Rule 6 only covers "two shifts" (rule 6).** It never says what happens when someone
holds two different roles on the *same* shift. I guessed that should count as a conflict.
The official test data said otherwise — a volunteer already booked for one role isn't
flagged when checked against a different role on that same shift. I changed the code to
match. I'd add a line to the spec covering this case directly.

## What I deliberately did not build

- **Location-awareness for schedule conflicts.** Considered whether two back-to-back shifts
  in different cities should count as a conflict (travel time), but the spec only ever talks
  about time overlap, and shifts don't even carry a location field (only opportunities do).
  Building this would mean inventing a rule the spec never asked for.
- **A way to show GROUP_RESTRICTED to an admin or internal caller.** Given the confidentiality
  question above, I could have added something like a caller-role parameter. I didn't, because
  I'd be guessing at a design nobody asked for — this needs a product conversation first.
- **Runtime validation of the fixture data.** The code trusts that `fixtures.json` matches the
  TypeScript types and never checks it at runtime. Fine for fixture data we control; not fine
  for a real API taking arbitrary input.
- **Deeper performance optimization for the bulk check.** `checkEligibilityForOpportunity`
  shares the opportunity-level work once per call, but still does full linear scans of
  `fixtures.shifts`/`fixtures.openings` rather than indexing them up front. Didn't build that
  further, since nothing about our actual data size shows it's needed.

## What I'd do with three more hours

1. **Fix timezone handling.** The fixtures span two cities (Indianapolis, Denver) in
   different real-world timezones, but every timestamp is a bare string with no offset. Our
   schedule-conflict check compares them directly, which silently assumes they're all on the
   same clock — wrong if a volunteer ever holds shifts in both cities. I'd convert each
   shift's timestamp to UTC based on its opportunity's city, and flag to whoever owns the data
   that timestamps should carry an explicit UTC offset going forward, not ambiguous per-city
   local time.
2. **Add test coverage for two edge cases we found but never exercised.** Every qualification
   rule in the fixtures is active, so the code path that skips an inactive rule has never run
   against real data. Likewise, no opportunity has two active rules of the same type failing
   at once, so the reason-code dedup has never been proven against an actual collision.
3. **Get real answers from a product manager** on the open judgment calls: whether
   GROUP_RESTRICTED should ever be visible to an admin, which browse page the nice-to-have
   was actually for, and the other spec contradictions we had to resolve ourselves.
4. **Index the fixture data up front** (by id, and signups grouped by opening) if real usage
   ever shows `checkEligibilityForOpportunity` needs to scale past what a few linear scans
   can handle.

## How I used AI, if I did

I used A.I. to write, review, and test the code.
I had it walk through step by step in order for me to try to make as many decisions as possible about what to instruct it to do. My main goal was to display decision making so I kept it on a pretty short leash. It did take SOME liberties but I tried to get it to go back and explain when it did so that I was in the know. 
It actually got the checkEligibility's parameters wrong and I had to do a last minute refactor as I wanted to match the spec. 
I also use it to "talk through my thoughts" as speaking with another always helps get my head moving.