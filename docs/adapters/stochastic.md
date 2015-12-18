---
title: Stochastic data sources | Juttle Language Reference
---

If you want to simulate real events or metrics data, try one of these
stochastic source nodes:

  - [CDN](./stochastic_cdn.md) - Simulate hosts and services in a content
    distribution network (CDN), providing metric and event streams that vary
    with demand throughout the day.

  - [Logs](./stochastic_logs.md) - Generate simulated streams of logs
    as event points from a variety of sources, emitting live or historic points
    using a configurable error rate.

  - [Search cluster](./stochastic_search_cluster.md) - Simulate a cluster
    of search engine hosts. This source is similar to [CDN
    source](./stochastic_cdn.md), but with defaults that simulate
    multiple hosts undergoing a denial-of-service attack.
