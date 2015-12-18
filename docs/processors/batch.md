---
title: batch | Juttle Language Reference
---

batch 
=====

Create batches by segmenting a sequence of points ordered by time stamp,
each segment spanning a specified interval of time.

``` 
batch
  -every duration
  -on duration-or-calendar-offset batch-interval
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-every` or `batch-interval` |   The time interval for batches, specified as one of the following: <dl><dt>n</dt><dd>The number of seconds in the time interval </dd><dt>:duration:</dt><dd>The time interval expressed as a [moment literal](../reference/time.md)</dd></dl>|  Yes
`-on`  |  A time alignment for the batches. It may be a duration or a calendar offset less than batch interval. For example, `-every :hour: -on :00:30:00:` batches points over an hour on the half-hour, while `-every :month: -on :day 10:` batches monthly starting on day 10 of the month. If the beginning or ending of your data does not align evenly with these times, the first and last batch will contain less than the specified interval.  |  No; if `-on` is not specified, output batches are aligned with the UNIX epoch. If `batch-interval` equals one day, then batch boundaries are at midnight UTC.

Many processors do their work over groups of points called batches. For
example, the [sort](../processors/sort.md) processor orders everything within a batch and the [reduce](../processors/reduce.md) processor aggregates points within a batch.

The batch processor creates batches by segmenting a sequence of points
ordered by time stamp, each segment spanning batch-interval seconds of
time. It does not alter points or their travel in any way. Instead, it
adds information to the sequence that segments it into disjoint groups
of points.

The end time of one batch is the start time of the following batch.
Batch boundaries are time values that exist independent of the points,
and there may or may not be points having these values as their time
stamps. When batching is in place, any points that share a given time
stamp are guaranteed to lie within the same batch. A batch processor
downstream from an earlier batch replaces the earlier grouping with the
new one.

_Example: Call records, day by day_

```
{!docs/examples/processors/call_records.juttle!}
```

_Example: create one-second interval batches_ 

In this example, [emit](../sources/emit.md)
sends 20 points at a rate of 5 points per second. The points are then
divided into batches at one-second intervals. The [tail](../processors/tail.md)
processor outputs the last point from each batch, resulting in 4 output
points. Without the batch processor, tail would handle all 20 points at
once, resulting in a single output point.

```
{!docs/examples/processors/batch_tail_historical.juttle!}
```

_Example: batching live data_

In contrast with the earlier example that used historical mode to emit data with past timestamps,
all at once, this example generates data in real time, divides into batches, and uses the
[tail](../processors/tail.md) processor to output the last 2 points from each batch.

```
{!docs/examples/processors/batch_tail_live.juttle!}
```
