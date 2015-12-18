---
title: head | Juttle Language Reference
---

head 
====

Only emit the first limit points from each batch.

``` 
head limit [by groupfield1, [groupfield2, ...]]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`limit`    | The number of points to emit; may be an expression that evaluates to an integer  |  No
`by`       |  One or more fields by which to group. See [Grouping fields with by](../concepts/dataflow.md#grouping).  |  No

_Example: Generate batches containing ten points each but only log the first two points from each batch_ 

```
{!docs/examples/processors/head_batch_live.juttle!}
```

