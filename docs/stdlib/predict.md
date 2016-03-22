---
title: Predict Module | Juttle Language Reference
---

# Predict

Trend, seasonality, and noise estimation for metric streams.

## predict - reducer

Predict is a subgraph which consumes a metric stream and emits a prediction stream based on estimated trend, seasonality, and a smoothed version of the input. As any sub, it can only be used in stream context.

Prediction errors (the difference between predict's output and the input) can
signal anomalies in the stream.

### Usage

```
... | predict [-field field] [-over duration] [-every duration] [-pct percentile] [-nonneg true/false] [-detrend true/false] [-deseason true/false] [-denoise true/false]
```

Option       |                           Description                                | Required?
------------ | -------------------------------------------------------------------- | ---------:
`-field`     | name of metric field to predict                                      | No, default: `value`
`-over`      | period: the length of one repeating cycle in the input metric.       | No, default: `:1 week:`
`-every`     | interval between emitted prediction points                           | No, default: is based on period
`-pct`       | percentile to retain during initial reduction to every-spaced values | No, default: `0.5`
`-nonneg`    | do not allow predictions to become negative.                         | No, default: `true`
`-detrend`   | if false, do not remove estimated trend                              | No, default: `true`
`-deseason`  | if false, do not remove estimated cyclic effect                      | No, default: `true`
`-denoise`   | if false, do not smooth the detrended/deseasoned value               | No, default: `true`

predict is intended to be used with a historic read or superquery (combination of historic and live data stream) that includes
enough history to initialize its estimators. predict can begin emitting
prediction points almost immediately, though the early points will simply be
de-meaned. After 2 periods have gone by, trend and seasonality (at the
resolution of -every) will switch on, and after 3 periods have passed all
estimators have full windows of data.

### Output

Each output point contains the following fields:

Field    |                          Description
-------- | ----------------------------------------------------------------
fieldname (the value of the `-field` option) | average value of field over `-every` interval
`T`      | portion of field predicted by the trend estimator
`S`      | portion of field predicted by seasonality
`Y`      | portion of field predicted by smoothing
`P`      | predicted value of field, `T + S + Y`
`E`      | prediction error, `P` - field
`Z`      | normalized error based on the sample `stdev` over trailing periods

_Example: using predict to predict the next value of Math.sin(x) function_

```
{!docs/examples/stdlib/predict-sin.juttle!}
```
