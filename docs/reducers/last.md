---
title: last | Juttle Language Reference
---

last 
====

Return the value of the specified field for the last point that contains
it.

``` 
put|reduce last(field)
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

