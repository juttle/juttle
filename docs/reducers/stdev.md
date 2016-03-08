---
title: stdev | Juttle Language Reference
---

stdev 
=====

Return the standard deviation of the value of the specified field.

``` 
put|reduce stdev(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to compute  |  Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_stdev.juttle!}
```

