---
title: delta | Juttle Language Reference
---

delta 
=====

Return the change in value of a field.

delta computes the difference between a field's current value and the
value used in the previous delta. When used in a series of
[put](../processors/put.md)s,
that is simply the point-to-point difference. When used in a series of
[batch](../processors/batch.md)es,
it is the difference between the last points of successive batches. When
no point is present (for example, an empty batch), delta returns its
special "empty" value, which defaults to 0.

:information_source: `Note:` If used in batched mode, or with
[reduce](../processors/reduce.md)
-every, you must specify -reset false. delta does not work at all with
-over (in put or reduce).

``` 
put|reduce delta(field, emptyValue, wrap)
```


Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to use as a value   | Yes
`empty`    | The value to return when a current or previous value is not present (for example, no point has been observed since last call), default is 0.  |  No
`wrap`     | Treat field as an incrementing counter that wraps occasionally. When wrap is specified, any field value that is less than the previous value is assumed to have wrapped. There are 3 ways to specify what should be returned: <dl><dt>wrap != 0</dt> <dd>Add wrap to delta (to make it positive). Use this for ingesting counters like a collectd bytes-in counter, which wraps when it reaches a specified maximum (for example, 2^32). </dd><dt>wrap=0</dt> <dd>Return the current (not delta) value. Use this for statsd's "periodic counters", which regularly reset themselves to 0 but are otherwise cumulative (and thus their first reading after a reset is in fact the delta value).  </dd><dt>wrap=true</dt><dd>Return the "empty" value. Use this when you know you have a wrapping counter, but do not know the wrap value. </dd></dl> | No  

_Example: rate of change_

At the moment, juttle has no rate-of-change reducer (for example,
derivative). In this example delta computes rate of change the
old-fashioned way, by dividing the change in a field by the change in
time. This example also shows the use of delta with a time value.
delta(time) is a duration, and is converted to seconds so it can divide
delta(position) to give a rate per second. The example also shows use of
the "empty" parameter with delta(time). When a value is not present (in
this example, for the very first delta), delta(time) will return a
default duration of 0 seconds.

```
{!docs/examples/reducers/reduce_delta.juttle!}
```

