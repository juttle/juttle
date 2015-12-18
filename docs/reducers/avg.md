---
title: avg | Juttle Language Reference
---

avg 
===

Return the average of the values of a specified field.

``` 
put|reduce avg(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The name of the field to average  |  Yes

_Example_

This example uses the [batch](../processors/batch.md) processor.

```
{!docs/examples/reducers/reduce_avg.juttle!}
```

