---
title: Array Module | Juttle Language Reference
---

# Array

[TOC]

Arrays can be declared as constants in a flowgraph or variables in
[user defined functions](../concepts/programming_constructs.md#functions). To create an array from your data in a Juttle pipeline, use the [pluck](../reducers/pluck.md) reducer.

The Array module exposes a limited set of operations on array variables.

## Array.length 

Return the number of items in an array.

``` 
Array.length(array)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`array`    | The array to measure  |  Yes

_Example: Create an array containing a random number of values, then count them_

```
{!docs/examples/modules/array_length.juttle!}
```


## Array.indexOf 

Search an array and return the zero-based index of the first match, or
-1 if there is no match.

``` 
Array.indexOf(array, searchvalue)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    |   The array to search  | Yes
`searchvalue`  |  The value for which to search  |  Yes

_Example: Search for a random integer in an array of random integers_

```
{!docs/examples/modules/array_indexof.juttle!}
```
