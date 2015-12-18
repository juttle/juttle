# Juttle Documentation

Welcome to the documentation for Juttle, a dataflow programming language!

## About Juttle

Juttle is an analytics system and language for developers built upon
a stream-processing core and targeted for *presentation-layer* scale.
Juttle gives you an agile way to query,
analyze, and visualize live and historical data from many different
big data backends or other web services.
Using the Juttle *dataflow* language,
you can specify your presentation analytics in a single place with a
syntax modeled after the classic unix shell pipeline.  There is no need
to program against data query and visualization libraries.  Juttle scripts,
or *juttles*, tie everything together and abstract away the details.

While the Juttle syntax embraces the simplicity of the
unix pipeline design pattern,
it also includes a number of more powerful language concepts including
functions, dataflow subgraph notation, native expressions, modules, scoping,
and special aggregation functions called *reducers*.  The details of
the language and the dataflow model are desribed in the
[Juttle Language Reference](http://juttle.github.io/juttle).

In Juttle, you read data from a backend service, analyze it using
*dataflow processors*, and send derived data or synthesized events to
some output, e.g., streaming results to a browser view,
writing data to a storage backend, posting http events to
slack, hipchat, pagerduty, etc.

Juttle presently includes a number of adapters for various big-data backends
and we are continually adding more.
This means that you can interoperate with
your existing infrastructure, whether it is a cassandra cluster, elastic
search, a SQL database, something from the hadoop ecosystem, and so forth.
If a particular backend is not yet supported, an adapter for it can be
added in a relatively straightforward manner using
Juttle's backend adapter API.

Under the hood, the Juttle compiler generates javascript
output that implements the Juttle dataflow computation by
executing alongside the Juttle runtime, either in node or the
browser.  The Juttle optimizer figures out the pattern of queries
needed to run on the various big-data backends to perform
the analytics specified in your Juttle programs.  This greatly
simplifies the development of presentation-layer analytics since you
can simply specify a high-level Juttle program and don't have to worry about
all the details involved in querying the big-data backends.

## Use Cases

Here are some ideas of what you can do with Juttle:

* embedding analytics-driven visualization in your application,
* providing users of your software with highly customizable views by
  tapping into data residing in your system's storage backends,
* composing custom dashboards or "wallboards" that run continuously for
  your internal users (ops teams, dev teams, business users, etc),
* building custom dataflow microservices around a specific
  analytics workflow like smart alerting, anomaly detection, or
  custom application logic,
* exploring your data interactively using Juttle's rapid prototyping model,
* introspecting and debugging your big-data pipeline, and
* prototyping and experimenting with dataflow concepts applied to
  your data before implementing them in detail and in production using other
  stream-processing systems like Spark or Storm.


## Stream-processing Systems

Juttle was inspired by modern, stream-processing systems like
[Storm](http://storm.apache.org/)
and
[Spark Streaming](http://spark.apache.org/streaming).
While Juttle
can do a lot of what these other systems do, it is not intended
as an outright replacement for them nor does it have their
properties of parallelizability, durability, or checkpointing.
Rather, Juttle's strengths are centered around interactive visualizations,
i.e., performing analytics at a scale
where data is interactively viewed and complements systems like Spark where
the output of Spark can feed the input of Juttle (the Juttle Spark adapter
is currently under development).
An interesting future extension for Juttle would be to adapt
the Juttle compiler and runtime to generate scala in addition to
javascript as a target output langauge and leverage the Spark infrastructure
for Juttle programs.

## How To Navigate

Use the left sidebar menu for navigating the sections. Getting started with the [Juttle Overview](concepts/overview.md) should orient you reasonably well; the rest of the Concepts section has background information on the language design.

The search feature (powered by lunr.js in mkdocs) can be helpful too, see the search box in upper left corner.

Juttle examples are provided as code snippets; copy them to run in your own environment.

:construction: Embedded Juttle examples are coming soon.

## Maintaining Docs

:baby_symbol: These docs are just coming together.

If you find a problem in the documentation, members of juttle GitHub project can edit the articles inline by following "Edit on GitHub" link. Small obvious fixes may be committed directly to master. If discussion is needed, please put up a PR on a branch.

:information_source: This documentation was produced with [mkdocs](http://mkdocs.org), see details in [README](README.md).
