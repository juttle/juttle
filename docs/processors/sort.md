---
title: sort | Juttle Language Reference
---

sort 
====

Sort points in order based on values of one or more specified fields,
and remove the time field.

``` 
sort [-limit N] name1 [-desc] [, name2 [-desc], ... nameN [-desc]] [by groupfield1, [groupfield2, ...]]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-limit`   | Sort only the first n points that arrive; additional points will be dropped. <p>To limit the output after sorting, use [head](../processors/head.md) or [tail](../processors/tail.md) after sort. </p>   |  No
`nameN`    |   The name of a field by which to sort. <p>First the points are compared based on their name1 fields, then any ties among name1 fields are broken by comparing name2 fields, then any points whose name1 and name2 are the same are compared in their name3 field, and so forth.</p>  |  Name1 is required; the rest are optional
`-desc`    | If you put "-desc" after the name of a field, the sort on that field will be in descending order; otherwise, it will be in ascending order.  |  No
`by`  |  One or more fields by which to group. See [Grouping fields with by](../concepts/dataflow.md#grouping).   |  No
     
Ordering is numeric (for number values) or alphabetical (for string
values). It also supports multi-key sorting in ascending or descending
order for alphabetical and numerical comparisons.

:information_source: `Note:` Sorting is limited to 10,000 data points by default. To sort more points, use the -limit flag to set a higher value.

_Example: Output a table of sorted random values_

```
{!docs/examples/processors/sort.juttle!}
```

