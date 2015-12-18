---
title: count | Juttle Language Reference
---

count 
=====

Return the number of points in the stream, optionally filtering on a
specified field.

``` 
put|reduce count(field)
```


Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field on which to filter <p>If field is specified, then count returns the number of points containing that field. If unspecified, it returns the total number of points received. </p> |  No  

_Example_

This example uses batching. See the
[batch](../processors/batch.md)
processor for details about batching.

```
{!docs/examples/reducers/reduce_count.juttle!}
```

