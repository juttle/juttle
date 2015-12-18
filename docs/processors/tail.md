---
title: tail | Juttle Language Reference
---

tail 
====

Only emit the last limit points from each batch.

``` 
tail limit [by field1, [field2, ...]]
```


Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`limit`    |  The number of points to emit; may be an expression that evaluates to an integer  | No; defaults to 1
`by`       |  One or more fields by which to group. See [Grouping fields with by](../concepts/dataflow.md#grouping).  |  No

_Example: Generate batches containing 10 points each, but only log the last 2 points from each batch_

```
{!docs/examples/processors/batch_tail_live.juttle!}
```

