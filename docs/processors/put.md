---
title: put | Juttle Language Reference
---

put 
===

Set the specified field of each point to the result of an expression, optionally computed over a [moving time window](../reducers/juttle_reducers_timewindows.md).

``` 
put [-over duration]
  [-reset true|false]
  fieldname1=expr1 [, fieldnameN=exprN]
  [by field1, [field2, ...]]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-over`  | The moving time window over which the value will be computed, as a [duration literal](../reference/time.md). <p>If `-over` is :forever:, the results are cumulative, over all points seen so far. </p><p>See [Moving time windows](../reducers/juttle_reducers_timewindows.md) for more information about moving time windows. </p> |  No; if `-over` is not specified, all points since the beginning of the current batch are used
`-reset`  |  Set this to 'false' to emit results cumulatively, over all points seen so far, when a reducer expression is present (by default, a reducer in a batched flow will be reset at the beginning of each batch).  |  No
`fieldname=expr`  |   Set the field named fieldname to the value specified by expr, where expr can be a literal value, an arithmetic expression, a [function](../concepts/programming_constructs.md#functions) invocation, or a [reducer](../reducers/index.md) invocation  |  Yes
`by`  |  One or more fields by which to group. See [Grouping fields with by](../concepts/dataflow.md#grouping).  |  No
     
See [Field referencing](../concepts/fields.md#referencing) 
for more about this syntax.

_Example: Set the field foo of every point to 5_

```
{!docs/examples/processors/put_1.juttle!}
```

_Example: Set the field foo to 5 and the bar field to "string" for every point_

```
{!docs/examples/processors/put_2.juttle!}
```

_Example: Set the field foo to the value of the field bar multiplied by 10_

```
{!docs/examples/processors/put_3.juttle!} 
```

_Set the field foo of every point to a random number between 0 and 1_

```
{!docs/examples/processors/put_4.juttle!}
```

_Example: Superimposing yesterday's CPU usage over today's_

```
{!docs/examples/processors/put_over.juttle!}
```
