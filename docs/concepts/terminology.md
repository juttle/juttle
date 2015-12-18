---
title: Terminology | Juttle Language Reference
---

Terminology 
===========

##### batch
A sub-sequence of points in a stream, such as delineated by the [batch](../processors/batch.md) processor.
[Reducers](../reducers/index.md) and certain [processor nodes](../processors/index.md) are unique in their ability to work with batches of points.

##### flowgraph
An arrangement of one or more source nodes, one or more sink nodes, and zero or more processor nodes, chained together to operate on one or more streams of points. Juttle flowgraphs are different from pipelines in other languages, in that they may be forked and merged.

##### function
Much like a function in other programming languages, a Juttle function performs a calculation based on provided inputs and returns a single result. Juttle comes with some built-in functions, and you can also define your own.

##### job
A running instance of a Juttle program.

##### module
A collection of functionality that can be shared among multiple Juttle programs. A module can export constants, shared variables, subgraphs, reducers, and functions, making them available for import by other programs. See [modules](../concepts/programming_constructs.md#modules). 

##### node
A primitive element in a Juttle flowgraph. Types of nodes include sources, sinks, and processors.

##### out-of-order points
Data points that arrive out of sequence with respect to their time stamps.

##### point
The primitive unit of data that travels through a Juttle flowgraph, made up of arbitrary name-value properties.

##### processor
A processor, or processor node, resides in the middle of a Juttle flowgraph, modifying streams as they pass through. Example modifications include transforming, reducing, and filtering.

##### program
Juttle code that includes at least one flowgraph as well as any additional supporting code.

##### reducer
Juttle reducers operate on batches of points, carrying out a running computation over values contained in the points. Several reducers come built-in to Juttle, and users can also define their own.

##### source
Sources, or source nodes, appear at the beginning of a flowgraph to stream data points synthetically or from your own data. Sources can stream live data in real time or historical data all at once.

##### straggler
A data point that arrives after an excessive interval. For example, if point A and point B have time stamps one second apart, but point B arrives ten seconds after point A, then point B is a straggler.

##### subgraph
A reusable, user-defined element consisting of an arbitrary arrangement of nodes and other supporting code.

##### view
A sink node that displays data visually, such as in a table or a chart.
