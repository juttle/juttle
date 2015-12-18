---
title: keep | Juttle Language Reference
---

keep 
====

Remove all fields from the input stream except those that are specified.
Use this processor to prune the input stream, keeping only the fields of
interest.

:information_source: `Note:` The time field must be specified
explicitly in order to keep it; otherwise you end up with timeless
points.

``` 
keep fieldName1, fieldName2,...fieldNameN
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`fieldnameN` |   The fields to propagate from input to output  | At least one

_Example: Remove all fields except the a field, then log the remaining data points_

```
{!docs/examples/processors/keep.juttle!}
```

