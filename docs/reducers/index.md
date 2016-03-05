---
title: Reducers Overview | Juttle Language Reference
---

# Reducers

Juttle reducers operate on batches of points, carrying
out a running computation over values contained in the points, optionally over a [moving time window](../reducers/juttle_reducers_timewindows.md).

Reducers can be used as the right-hand side of
[put](../processors/put.md)
expressions, in which case they compute a result over points in the
current batch as each new point arrives. They can also be used as the
right-hand side of
[reduce](../processors/reduce.md)
expressions, in which case they compute a result over points in the
current batch when the batch ends.
For options that govern all reducers, see
[put](../processors/put.md)
and
[reduce](../processors/reduce.md).

Juttle comes with built-in reducers:

**[avg](../reducers/avg.md)**

Return the average of the values of a specified field.

**[count](../reducers/count.md)**

Return the number of points in the stream, optionally filtering on a
specified field.

**[count_unique](../reducers/count_unique.md)**

Return the total number of unique values of a specified field throughout
the batch.

**[delta](../reducers/delta.md)**

Return the change in value of a field.

**[first](../reducers/first.md)**

Return the value of the specified field in the first point that contains it.

**[last](../reducers/last.md)**

Return the value of the specified field for the last point that contains it.

**[mad](../reducers/mad.md)**

Return the Median Absolute Deviation (MAD) of the value of the specified field.

**[max](../reducers/max.md)**

Return the maximum value of the specified field from among all points containing that field.

**[min](../reducers/min.md)**

Return the minimum value of the specified field from among all points
containing that field.

**[percentile](../reducers/percentile.md)**

Return the p<super>th</super> percentile ranked value of the specified field.

**[pluck](../reducers/pluck.md)**

Return an array of the values of a specified field in the batch.

**[stdev](../reducers/stdev.md)**

Return the standard deviation of the value of the specified field.

**[sum](../reducers/sum.md)**

Return the sum of the values of the specified field throughout the batch.
