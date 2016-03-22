---
title: Random Module | Juttle Language Reference
---

# Random

Functions and reducers to generate random samples from common probability
distributions.

# exponential - function

```
... | put value=random.exponential(2) | ...
```

Argument    |         Description          |
----------- | ---------------------------- |
`scale`     | 1 / lambda                   |


# normal - reducer

Uses Marsaglia polar method (improved [Box-Muller transform](https://en.wikipedia.org/wiki/Marsaglia_polar_method))
for the computation.

This is written as a custom reducer because generated values come in pairs,
and we want to save one for next time. We also need to work around not being
able to call a function recursively in stream context.

```
... | put x = random.normal(0,Math.sqrt(0.2)), y = random.normal(0, 1) | ...
```

Options    |         Description          |
---------- | ---------------------------- |
`loc`      | mean                         |
`scale`    | standard deviation           |

# poisson - reducer

Uses Knuth's algorithm for the computation.

This is written as a custom reducer to work around not being able to call a
function recursively in stream context.

```
... | put lambda_1=random.poisson(1) | ...
```

Options    |               Description               |
---------- | --------------------------------------- |
`lam`      | average events per draw, should be >= 0 |

# uniform - function

Uniformly distributed number generator between the `low` and `high` bound
arguments.

```
... | put value=uniform(0, 24)
```

Options    |  Description |
---------- | ------------ |
`low`      | lower bound  |
`high`     | upper bound  |
