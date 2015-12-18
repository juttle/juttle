---
title: count_unique | Juttle Language Reference
---

count_unique 
=============

Return the total number of unique values of a specified field throughout
the batch.

:information_source: `Note:` For efficiency, the back-end
implementation of count_unique() uses an approximation algorithm, which
may return imprecise values for sets with large cardinality

``` 
put|reduce count_unique(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field for which to count unique values  | Yes

_Example_

This example uses the
[batch](../processors/batch.md)
processor.

```
{!docs/examples/reducers/reduce_count_unique.juttle!}
```

