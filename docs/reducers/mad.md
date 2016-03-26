---
title: mad | Juttle Language Reference
---

mad 
===

Return the Median Absolute Deviation (MAD) of the value of the specified
field.

``` 
put|reduce mad(field)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`field`    | The field to compute  |  Yes

Median Absolute Deviation (MAD) is related to standard deviation in much
the way that median is related to mean. It is a robust measure of how
spread out a set of values are around their central location (the
median). `MAD = median( | x - median| )`

_Example: MAD and standard deviations_

The example below shows how MAD and standard deviation behave on samples
from a pure normal distribution and samples from a distribution
"contaminated" with an outlier distribution (1% contamination). The MAD
estimate for the contaminated distribution remains close to its value
for the dominant (pure) distribution, unlike the standard deviation.

This example uses a module from the
[standard library](../stdlib/index.md).

```
{!docs/examples/reducers/reduce_mad.juttle!}
```

