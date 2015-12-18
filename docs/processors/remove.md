---
title: remove | Juttle Language Reference
---

remove 
======

Remove the specified fields from the input stream. Like the keep
processor, you can use this to prune the input stream, removing any
uninteresting fields.

``` 
remove fieldName1[, fieldName2,...fieldNameN]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
fieldNameN |  The name of one or more fields to remove from incoming points  |  At least one

_Example: Remove all fields except the a field (and the time field, always required), then log the remaining data points_

```
{!docs/examples/processors/remove.juttle!}
```


