---
title: Procs Overview | Juttle Language Reference
---

# Procs

[TOC]

A Juttle proc is a flowgraph node that can be a source, a processor, or a sink.

```text
(source; source) | processor | (processor; processor) | processor | (sink; sink)
```

## Sources

Source procs appear at the beginning of a flowgraph to feed data points into it. 

**[emit](../sources/emit.md)**

Use `emit` source to synthetically generate points that contain only a timestamp, to compose test/example Juttle programs.

**[read](../sources/read.md)**

Read data via adapters such as the built-in `read file`, `read stochastic`, `read http`, or plug in external [adapters](../adapters/index.md) to read from remote backends.

## Processors

Processor nodes reside in the middle of a Juttle flowgraph, modifying streams as they pass through. Example modifications include transforming, reducing, and filtering.

**[batch](../processors/batch.md)**

Create batches by segmenting a sequence of points ordered by time stamp,
each segment spanning a specified interval of time.

**[filter](../processors/filter.md)**

Output only the points for which the given filtering expression
evaluates to true.

**[head](../processors/head.md)**

Only emit the first limit points from each batch.

**[join](../processors/join.md)**

Create new points from the points of multiple input streams.

**[keep](../processors/keep.md)**

Prune the input stream by removing all fields except the specified ones.

**[pace](../processors/pace.md)**

Play back historic points in real time or at the specified pace.

**[put](../processors/put.md)**

Set the specified field of each point to the result of an expression.

**[reduce](../processors/reduce.md)**

Accumulate collections of points and aggregate them using reducers,
optionally within a moving time window.

**[remove](../processors/remove.md)**

Prune the input stream by removing the specified fields.

**[sort](../processors/sort.md)**

Sort points in order based on values of one or more specified fields.

**[split](../processors/split.md)**

Split each incoming point, emitting one new point for each of the
specified fields in the original point.

**[tail](../processors/tail.md)**

Only emit the last limit points from each batch.

**[unbatch](../processors/unbatch.md)**

Turn a batched stream into an unbatched stream.

**[uniq](../processors/uniq.md)**

Compare adjacent points and discard any duplicates.

## Sinks

Final nodes of Juttle flowgraphs are referred to as sinks.

**[view](../sinks/view.md)** 

Visualize data using the view sink with built-in views `view table`, `view text`, or charts available via juttle-viz library.

**[write](../sinks/write.md)**

Send data out using the write sink with built-in adapters `write file`, `write http`, or plug in external [adapters](../adapters/index.md) to write to remote backends.

