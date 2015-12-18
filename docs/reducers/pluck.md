---
title: pluck | Juttle Language Reference
---

pluck 
=====

Return an array of the values of a specified field in the batch. The
resulting array is stored in a field called "pluck".

``` 
put|reduce pluck(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to pluck  |  Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_pluck.juttle!}
```

