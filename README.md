# Bella

<!-- cspell:ignore Replicache -->

Bella is a quick proof-of-concept experiment to test out the TanStackDB + ElectricSQL combo.

For a long time, I’ve been exploring different local-first/sync-first approaches. I’ve been curious about ElectricSQL for a while, and the release of TanStackDB finally gave me the push to try it out.

The app itself is a simple AI chat (pretty boring, I know 😅), but the real goal here was to experiment with an alternative architecture compared to what I’m building at work. Along the way, I also wanted to play with a few new pieces of tech.

Not every tool ended up being a perfect fit, e.g. Effect Cluster, for example, was a bit of pain at a times (or at least not the way I’ve used it here).

## Thoughts

- ElectricSQL is super easy to use, setup and has a good set of tradeoffs. I'm really curious about further development and eagerly waiting for a few features they're building atm.
- TanStackDB fits perfectly but is still super early and has a lot of rough edges. It took really interesting niche and fills it really, really well. If it gets polished, it'll be super awesome.
- Effect Cluster/Workflow are super cool, especially Workflow but require deliberate design and good fit.
- o11y is impressive, Effect makes it super easy to just have really good insights into what goes under the hood. I'd love to debug apps this way.
- TanStack Start type safety is as impressive as I remembered it. I still don't fully agree with some of their choices, but can't complain because it's overall excellent for this client-heavy apps.
