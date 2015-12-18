---
title: max | Juttle Language Reference
---

max 
===

Return the maximum value of the specified field from among all points
containing that field.

``` 
put|reduce max(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to analyze for the maximum value  |  Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_min_max.juttle!}
```

