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
`-over`     | The moving time window over which the value will be computed, as a [duration literal](../modules/juttle_time_moment_literals). This is typically some multiple of the `-every` interval (for example, `reduce -every :minute: -over :hour: value=avg(value)` updates a trailing hourly average every minute). <br><br>When `-over` is specified, results will only be produced for full windows of data. No results will be produced until `-over` has passed after the first point. No result will be produced for any final points that span interval less than `-over`. <br><br>If `-over` is :forever:, the reducer emits results cumulatively, over all points seen so far. <br><br>See [Moving time windows](../reducers/juttle_reducers_timewindows.md) for more information about moving time windows.  | No; defaults to not using a moving window.
`-reset`  |  Set this to 'false' to emit results cumulatively, over all points seen so far.  |  No; defaults to resetting every interval.
`-forget`  |  When grouping reducer results with 'by', set this to 'false' to cause results to be emitted for every value of 'by' that has been seen in previous batches. Values that do not appear in the current batch will report their 'empty' value (for example, count() will produce 0, avg() will produce null)  |  No; defaults to forgetting.
`-from`    | When used with `-over`, the start time of the earliest full window of data.  |  No; if not specified, the earliest window begins with the earliest point or batch received.
`-to`      | When used with `-over`, the end time of the last full window of data.  |  No; if not specified, the last point or batch time stamp received is assumed.
`-on`      | A time alignment for `-every`. It may be a duration or a calendar offset less than `-every`. For example, `-every :hour: -on :00:30:00:` runs every hour on the half-hour, while `-every :month: -on :day 10:` runs a monthly computation on day 10 of the month.  |  No; if `-on` is not specified, output batches are aligned with the UNIX epoch, as if from a batch node.
`fieldname=expr`  |  An assignment expression, where `expr` can be a [reducer](../reducers/index.md) or a constant value. See [Note 2](#note-2). |  At least one
`by`  |  One or more fields for which the assignment expression is computed separately. <br><br>If grouping fields are present, then the assignment expression is computed independently for each unique combination of values present in the grouping fields. See [Processors](../processors/index.md) for more about grouping with by.  <br><br> |  No; if no grouping fields are present, then the assignment expression is computed over all points in the batch.

###### Note 1

The output points contain:

-   All the fields specified as assignment expressions or grouping fields in the arguments
-   Each of the grouping fields with the unique value(s) for which the assignment expressions were computed
-   When operating on batched points, every output point contains a time field containing the end time of the incoming batch.

When reduce operates on batched points (that is, when there is a
[batch](../processors/batch.md) processor preceding `reduce`), it generates a set of output points for each incoming batch of points, resetting its internal state after each
batch. When the points flowing into reduce are not batched, output
points are generated for all points when the stream ends.

See [Field referencing](../concepts/fields.md#referencing) for additional information relevant to this processor.

###### Note 2

In the assignment expression `fieldname=expr`, if `expr` is a reducer, the resulting point will have the return value of reducer's result() function as the value of field `fieldname`.

If `expr` is a constant value (Juttle constant, string literal, number), the resulting point will have field 'fieldname' with that value. This is commonly used to place "naming" fields into the data point, such as:

```
... | reduce name = 'pct90', value = percentile (value, 0.9)
```

Assignments that try to dereference fields from the incoming data point are invalid; the field values of the point being processed by `reduce` are only accessible in the context of a reducer.

For example, this is not valid Juttle, it would emit error "a is not defined" because it would try looking for a constant named 'a':

```text
// INVALID JUTTLE
emit -points [ { a: 5, b: 7 }, { a: 12, b: 88 } ]
| reduce c = a + b
```

This is also not valid Juttle, it would error out when trying to add up two null values, because dereferencing of fields 'a' and 'b' would attempt to access such fields in the data point being _created_ by the `reduce`, not the data point being _processed_ by it, since the fields of incoming point are not in scope.

```text
// INVALID JUTTLE
emit -points [ { a: 5, b: 7 }, { a: 12, b: 88 } ]
| reduce c = *'a' + *'b'
```

The legitimate way to achieve the desired result (compute a cumulative sum of field values for 'a' and 'b' over all points) would be to use `reduce` to get sums of 'a' and 'b' separately, with the built-in reducer [sum()](../reducers/sum.md), and then add resulting field values in a `put` expression:

```juttle
emit -points [ { a: 5, b: 7 }, { a: 12, b: 88 } ]
| reduce sum_a = sum(a), sum_b = sum(b)
| put c = sum_a + sum_b
```

More examples of using `reduce`:

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

