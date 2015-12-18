---
title: User-defined reducers | Juttle Language Reference
---

User-defined reducers 
=====================

Juttle includes [built-in reducers](../reducers/index.md),
but users can also define their own reducers by using the reducer keyword.

A custom reducer is composed of two required functions and two optional
functions:

Function | Description | Required?
-------- | ----------- | --------:
`update` | This function is called once for each point in a stream. | Yes
`result` | This function is called at the end of a batch or stream in order to retrieve the final computed value from the reducer. | Yes
`expire` | This function is only needed if the reducer is to be used in a windowed reduce or put. | No

In addition, a reducer can define local variables that are used in its computation.

***

### Time windows with user-defined reducers 

If a user-defined reducer is to be used with a [moving time window](../reducers/juttle_reducers_timewindows.md) (in a `reduce`, or `put -over`), then it may include an optional expire function.

An expire function is called once for each point as it leaves the
window. It is considered the "opposite" of the update function, and it
should undo what update did when the point entered the window.

It it not always possible to define an expire function (for example,
there is no way to write expire for max or min functions). An expire
function should be though of as an optimization -- without it, the
computation is redone for all points in the current window each time
result is called. The same result should be achieved whether or not
expire is defined.

***

_Example: this reducer counts the number of times a field has an odd value, and can be used with -over_

```
{!docs/examples/reducers/custom_reducer_count_odd.juttle!}
```


_Example: let's define an exponentially weighted moving average (EWMA) reducer_

```
{!docs/examples/reducers/custom_reducer_ewma.juttle!}
```

1.  The first line declares the reducer name and indicates that the
    reducer takes two arguments: a field name (fieldname) and a
    weighting value (alpha). The alpha argument is optional because it
    is defined with a default value.

2.  The second line defines a variable (ma) that we'll use to store the
    running value of the moving average.

3.  The update() function updates the moving average each time it is
    invoked (for example, for each point passing through the reducer). 
    
    See [Field referencing](../concepts/fields.md#referencing)
    for an explanation of why we used the `*` operator to
    reference `*fieldname`.

4.  The result() function simply returns that moving average.

5.  Then we have a flowgraph that emits a synthetic data point, sets the
    cnt field to a random number, invokes the ewma reducer twice, and
    outputs a point with two fields: ma_fast and ma_slow. Each is
    computed over the values of the cnt field, with a different
    alpha parameter.

    Note that ma_fast and ma_slow are computed independently, by
    separate instances of the reducer. A single reducer instance is
    created for each assignment expression, and each reducer instance
    has its own variables and state.

The alpha parameter is used by the reducer like a regular function
argument. The fieldname parameter is used differently. Specifically, in
the update() function, the fieldname parameter is de-referenced to
obtain the value of the field whose name was passed in via the fieldname
parameter. This allows reducers to be used generally over arbitrary
field names, by having the user of a reducer specify which fields the
reducer should use in its computation. In the above example, the field
of interest is cnt, and is the first argument passed to the EWMA
reducer.

