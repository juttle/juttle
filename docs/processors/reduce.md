---
title: reduce | Juttle Language Reference
---

reduce 
======

Accumulate collections of points and aggregate them using reducers,
optionally within a [moving time window](../reducers/juttle_reducers_timewindows.md)

``` 
reduce [-every duration [-on duration-or-calendar-offset]]
  [-over duration]
  [-reset true|false]
  [-forget false]
  fieldname1=expr1 [, fieldnameN=exprN]
  [by field1, [field2, ...]]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-every`   | The interval at which values will be computed, as a duration literal. A new result is produced each time this duration passes.  |  No; if not specified, the upstream batch interval is used. If there is no upstream batch, a single result is produced after the stream has ended.
`over`     | The moving time window over which the value will be computed, as a [duration literal](../modules/juttle_time_moment_literals). This is typically some multiple of the `-every` interval (for example, `reduce -every :minute: -over :hour: value=avg(value)` updates a trailing hourly average every minute). <p>When `-over` is specified, results will only be produced for full windows of data. No results will be produced until `-over` has passed after the first point. No result will be produced for any final points that span interval less than `-over`. </p><p>If `-over` is :forever:, the reducer emits results cumulatively, over all points seen so far. </p><p>See [Moving time windows](../reducers/juttle_reducers_timewindows.md) for more information about moving time windows.  | No
`-reset`  |  Set this to 'false' to emit results cumulatively, over all points seen so far.  |  No
`-forget`  |  When grouping reducer results with 'by', set this to 'false' to cause results to be emitted for every value of 'by' that has been seen in previous batches. Values that do not appear in the current batch will report their 'empty' value (for example, count() will produce 0, avg() will produce null)  |  No
`-from`    | When used with `-over`, the start time of the earliest full window of data.  |  No; if not specified, the earliest window begins with the earliest point or batch received.
`-to`      | When used with `-over`, the end time of the last full window of data.  |  No; if not specified, the last point or batch time stamp received is assumed.
`-on`      | A time alignment for `-every`. It may be a duration or a calendar offset less than `-every`. For example, `-every :hour: -on :00:30:00:` runs every hour on the half-hour, while `-every :month: -on :day 10:` runs a monthly computation on day 10 of the month.  |  No; if `-on` is not specified, output batches are aligned with the UNIX epoch, as if from a batch node.
`fieldname=expr`  |  An assignment expression, where expr can be a [reducer](../reducers/index.md). Each assignment expression results in an output field that has the left-hand side of the expression as its name and the computed right-hand side as its value.   |  At least one
`by`  |  One or more fields for which the assignment expression is computed separately. <p>If grouping fields are present, then the assignment expression is computed independently for each unique combination of values present in the grouping fields. See [Processors](../processors/index.md) for more about grouping with by.  </p>  |  No; if no grouping fields are present, then the assignment expression is computed over all points in the batch.
    
The output points contain:

-   All the fields specified as assignment expressions or grouping fields in the arguments
-   Each of the grouping fields with the unique value(s) for which the assignment expressions were computed
-   When operating on batched points, every output point contains a time field containing the end time of the incoming batch.

When reduce operates on batched points (that is, when there is a
[batch](../processors/batch.md) processor preceding `reduce`), it generates a set of output points for each incoming batch of points, resetting its internal state after each
batch. When the points flowing into reduce are not batched, output
points are generated for all points when the stream ends.

See [Field referencing](../concepts/fields.md#referencing) for additional information relevant to this processor.

_Example: Trailing ten-minute average_

```
{!docs/examples/processors/reduce_trailing_avg.juttle!}
```

_Example: Superimposing yesterday's CPU usage over today's_

```
{!docs/examples/processors/put_over.juttle!}
```

_Example: Call records, day by day_

```
{!docs/examples/processors/call_records.juttle!}
```

_Example: Output a single point that counts the number of points in the data set (in this case 10)_

```
{!docs/examples/processors/reduce_count.juttle!}
```

_Example: Any number of assignments can be used and they can be any expression_

```
{!docs/examples/processors/reduce_assign.juttle!}
```

_Example: Aggregate the points in batches of three seconds_

```
{!docs/examples/processors/reduce_batch.juttle!}
```

_Example: Aggregate the ten points by unique values of y_

```
{!docs/examples/processors/reduce_by.juttle!}
```

_Example: Count the number of points per unique value of y (over the entire stream of points)_

```
{!docs/examples/processors/reduce_count_by.juttle!}
```

_Example: Count the number of points per unique value of y (over batches of five seconds of points)_

```
{!docs/examples/processors/reduce_count_by_batch.juttle!}
```

