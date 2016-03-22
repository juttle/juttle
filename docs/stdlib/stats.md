---
title: Stats Module | Juttle Language Reference
---

# Stats

Streaming statistics for time series data.

The stdlib stats module offers "standardization" of metric time series --
shifting and re-scaling based on estimates of their center and scale. This
places streams into a standard form for comparison with others, or for
thresholding based on deviations from the center. Besides "z-score"
standardization using the sample mean and estimated standard deviation,
there is a robust variant (MAD) and mean-relative (CV).

All stats methods are reducers, and therefore can only be used in stream context.

## demean - reducer

Return the difference between the last observed value and the batch average.

```
... | reduce value=demean(value) | ...
```

Option    |                   Description                      | Required?
--------- | -------------------------------------------------- | ---------:
`-field`  | name of the field to apply the reduce operation on |  Yes

## stdev - reducer

Return the standard deviation of a specified field over a batch

```
... | reduce value=stdev(value) | ...
```

Option    |                   Description                      | Required?
--------- | -------------------------------------------------- | ---------:
`-field`  | name of the field to apply the reduce operation on |  Yes

## z - reducer

Return the sample Z-score of the specified field.

```
... | reduce value=z(value) | ...
```

Option    |                   Description                      | Required?
--------- | -------------------------------------------------- | ---------:
`-field`  | name of the field to apply the reduce operation on |  Yes

## relMean - reducer

Return the last observed value as a percentage of the batch mean

```
... | reduce value=relMean(value) | ...
```

Option    |                   Description                      | Required?
--------- | -------------------------------------------------- | ---------:
`-field`  | name of the field to apply the reduce operation on |  Yes

## cv - reducer

Return the coefficient of variation (stdev / mean) of the batch

```
... | reduce value=cv(value) | ...
```

Option    |                   Description                      | Required?
--------- | -------------------------------------------------- | ---------:
`-field`  | name of the field to apply the reduce operation on |  Yes
