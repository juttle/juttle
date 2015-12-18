---
title: uniq | Juttle Language Reference
---

uniq 
====

Compare adjacent points and discard any duplicates, much like the UNIX
uniq command.

``` 
uniq [field1, ... fieldN] [by groupfield1, ... groupfieldN]
```


Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`fieldN`   | One or more fields to check for changes. <p>If all of a point's fieldN values are the same as on the previous point, the point is discarded as being a duplicate. </p>  |  No; the default is all fields other than time
`by`       | One or more fields by which to group. See [Grouping fields with by](../concepts/dataflow.md#grouping).  |  No

_Example: Only output points where the random value of y is unique_

```
{!docs/examples/processors/uniq.juttle!}
```

