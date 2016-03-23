---
title: Random Module | Juttle Language Reference
---

# Random

Functions and reducers to generate random samples from common probability
distributions.

For random generators implemented as reducers (normal, poisson), note that they cannot be called from function context, but only from stream context. Random generators provided as functions can be called in either context.

# exponential - function

Generates random numbers following the [exponential distribution](https://en.wikipedia.org/wiki/Exponential_distribution).

Callable from function or stream context.

Returns x ~ Exp(scale).

```
... | put value=random.exponential(2) | ...
```

Argument    |         Description          |
----------- | ---------------------------- |
`scale`     | 1 / lambda, where lambda is the rate parameter |


# normal - reducer

Generates random numbers following the [normal, or Gaussian, distribution](https://en.wikipedia.org/wiki/Normal_distribution). Uses Marsaglia polar method (improved [Box-Muller transform](https://en.wikipedia.org/wiki/Marsaglia_polar_method))
for the computation.

Callable only from stream context.

Returns x ~ N(loc, scale).

```
... | put x = random.normal(0,Math.sqrt(0.2)), y = random.normal(0, 1) | ...
```

Options    |         Description          |
---------- | ---------------------------- |
`loc`      | mean                         |
`scale`    | standard deviation           |

# poisson - reducer

Generates random [Poisson-distributed](https://en.wikipedia.org/wiki/Poisson_distribution) numbers that represent the number of event occurrences per interval (therefore, this generator outputs whole nonnegative integers). Uses Knuth's algorithm for the computation.

Callable only from stream context.

Returns x ~ Poisson(lam).

```
... | put lambda_1=random.poisson(1) | ...
```

Options    |               Description               |
---------- | --------------------------------------- |
`lam`      | rate parameter, defining the average number of events in an interval, should be >= 0 |

# uniform - function

Generates random numbers between the `low` and `high` bound
arguments, following [uniform distribution](https://en.wikipedia.org/wiki/Uniform_distribution_(continuous)).

Callable from function or stream context.

Returns x ~ U(low..high).

```
... | put value=uniform(0, 24)
```

Options    |  Description |
---------- | ------------ |
`low`      | lower bound  |
`high`     | upper bound  |
