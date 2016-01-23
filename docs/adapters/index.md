---
title: Adapters Overview | Juttle Language Reference
---

# Adapters

Juttle's `read` source and `write` sink integrate with remote backends via adapters. This enables a Juttle program to interact with various types of external systems, including databases, streaming data sources, object storage systems, network APIs, and more.

### Built In Adapters

These adapters are included in the Juttle runtime and can be used in Juttle programs directly without special configuration.

* [file](../adapters/file.md)
* [http](../adapters/http.md)
* [http_server](../adapters/http_server.md)
* [stdio](../adapters/stdio.md)
* [stochastic](../adapters/stochastic.md)

### External Adapters

This is a partial list of adapters that are not included with the Juttle distribution but which can be optionally configured.

See the [Juttle README](https://github.com/juttle/juttle) for instructions on configuring external adapters to read from remote backends.

* [elastic](https://github.com/juttle/juttle-elastic-adapter) (ElasticSearch)
* [graphite](https://github.com/juttle/juttle-graphite-adapter) (Graphite)
* [influx](https://github.com/juttle/juttle-influx-adapter) (InfluxDB)
* [mysql](https://github.com/juttle/juttle-mysql-adapter)(MySQL)
* [postgres](https://github.com/juttle/juttle-postgres-adapter) (PostgreSQL)
* [sqlite](https://github.com/juttle/juttle-sqlite-adapter) (SQLite)
* [twitter](https://github.com/juttle/juttle-twitter-adapter) (Twitter)
* [Gmail](https://github.com/juttle/juttle-gmail-adapter/) (Gmail)
