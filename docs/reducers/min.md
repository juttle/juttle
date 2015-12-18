---
title: min | Juttle Language Reference
---

min 
===

Return the minimum value of the specified field from among all points
containing that field.

``` 
put|reduce min(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to analyze for the minimum value  | Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_min_max.juttle!}
```

