---
title: first | Juttle Language Reference
---

first 
=====

Return the value of the specified field in the first point that contains
it.

``` 
put|reduce first(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to return  |  Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_first_last.juttle!}
```

