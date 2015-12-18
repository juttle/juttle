---
title: Moving time windows | Juttle Language Reference
---

Moving time windows 
===================

Reducers can operate over moving time windows.

With the [reduce](../processors/reduce.md)
processor, three parameters are used to define a moving time window:
`-over`, `-every`, and `-on`. With [put](../processors/put.md),
only `-over` is used. The `-over` parameter is known as the window,
because it specifies a moving window of points up to the moment at which
the reducer is run. The window may be greater or less than the interval
`-every`, but is typically some multiple of `-every`.

For example, the snippet below emits a new point every hour at 15
minutes past the hour, using all points received in the past 6 hours:

```
reduce
  -over :6 hours:
  -every :hour:
  -on :00:15:00: a = avg(foo)
| ...
```

Its first point will be at 15 minutes after the first hour in which data
arrives, and it will continue emitting points every hour at 15 minutes
past the hour, each being the average of points received over the
preceding 6 hours. It ignores any upstream batch marks, and does not
emit any batch marks of its own.

When an `-over` window is specified,
The optional parameters `-from :moment:` and `-to :moment:`
allow you to explicitly state the range of time covered by the stream.
For example, if you were computing a trailing yearly average from points
that fall on the 15th of each month, `-from :2013-01-01:` and `-to :2015-01-01:` 
let you specify that two full years of time is
represented by these points. Without it, yearly averages involving the
first month would not be produced, because the points themselves only
span part of a month. And if there was no data for the final months, the
`-to` parameter would force results to be produced for those empty months.

If you want the reduce to be driven by an upstream batch processor, but
with a window of different size than the batch interval, specify 
`-over` without `-every`. reduce will emit a point when it
receives a batch mark, using points within the current window. In this
use, the batch triggers computation according to its interval, but the
`-over` parameter controls which points are used by reduce in its computation.

When using a put processor, only `-over` may be specified, since it runs on
each point as it is received.

