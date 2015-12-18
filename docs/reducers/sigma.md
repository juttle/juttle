---
title: sigma | Juttle Language Reference
---

sigma 
=====

Return the standard deviation of the value of the specified field.

``` 
put|reduce sigma(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to compute  |  Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_sigma.juttle!}
```

