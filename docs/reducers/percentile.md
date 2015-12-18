---
title: percentile | Juttle Language Reference
---

percentile 
==========

Return the p^th^ percentile ranked value of the specified field (or a
list of percentile values if given a list of percentile ranks). When
percentile is applied to large numbers of distinct values (such as from
a continuous metric) the returned value is approximate rather than
exact.

``` 
put|reduce percentile(field, p)
```


Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to use as a value  |  Yes
`p`        | The percentile rank to select, in range 0...1 (or a list of percentile ranks). A value (or list of values) will be returned whose rank is equal to or greater than `p * number of points` when the points are sorted by the value of the field.  |  Yes

_Example: 10th and 90th percentiles_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_percentile_10_90.juttle!}
```

_Example: quartiles_ 

This example uses a list of percentile ranks to retrieve the quartile
values of the data (minimum, 25%, median, 75%, and maximum). Because of
the large number of x values, approximate quartile values are returned,
though min and max will always be exact.

```
{!docs/examples/reducers/reduce_percentile_quartiles.juttle!}
```

