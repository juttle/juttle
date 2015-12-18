---
title: sum | Juttle Language Reference
---

sum 
===

Return the sum of the values of the specified field throughout the
batch.

``` 
put|reduce sum(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to sum  | Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_sum.juttle!}
```

