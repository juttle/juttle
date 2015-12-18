---
title: skip | Juttle Language Reference
---

skip 
====

Drop the first n points of a series.

``` 
skip [n] [by field1, [field2, ...]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`n`    |   The number of points to skip  |  No; if not specified, a single point is skipped
`by`   | One or more fields by which to group. See [Grouping fields with by](../concepts/dataflow.md#grouping).  |  No
    
_Example: For each value of id, skip the first two points_

```
{!docs/examples/processors/skip_by.juttle!}
```

