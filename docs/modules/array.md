---
title: Array Module | Juttle Language Reference
---

# Array

[TOC]

Arrays can be declared as constants in a flowgraph or variables in
[user defined functions](../concepts/programming_constructs.md#functions). To create an array from your data in a Juttle pipeline, use the [pluck](../reducers/pluck.md) reducer.

The Array module exposes a limited set of operations on array variables.

## Array.concat

Combine the elements of a list of arrays into a single array
```
Array.concat(array1, array2, ...)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array1`    |   The first elements in the resulting array  | Yes
`array2`    |   Elements to append to array1  | No
`...`     | Any number of additional arrays | No

_Example: Concatenate `["hello"]`, `[]` and `["world"]` into `["hello", "world"]`_

```
{!docs/examples/modules/array_concat.juttle!}
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

## Array.join

Combine the elements of an array into a string
```
Array.join(array, separator)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    |   Array whose elements to join | Yes
`separator`| Separator to delimit the joined elements  | No; defaults to `','`

_Example: Join ['joe','meg','bob','may'] into the string 'joe,meg,bob,may'_

```
{!docs/examples/modules/array_join.juttle!}
```

## Array.lastIndexOf

Search an array and return the zero-based index of the last match, or
-1 if there is no match.

```
Array.lastIndexOf(array, searchvalue)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    |   The array to search  | Yes
`searchvalue`  |  The value for which to search  |  Yes

_Example: Search for a random integer in an array of random integers_

```
{!docs/examples/modules/array_last_index_of.juttle!}
```

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

## Array.pop

Remove the last element of an array and return it
```
Array.pop(array)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array to pop an element from | Yes

_Example: Pop the element 'b' off ['a', 'b']_

```
{!docs/examples/modules/array_pop.juttle!}
```

## Array.push

Add an element to the end of an array
```
Array.push(array, element)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array to add `element` to | Yes
`element`  | Element to add | Yes

_Example: Push `'pajama'` and `'potatoes'` into the array `['banana']`_

```
{!docs/examples/modules/array_push.juttle!}
```

## Array.reverse

Reverse the order of elements in an array
```
Array.reverse(array)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array reverse | Yes

_Example: Reverse ['a', 'b'], yielding ['b', 'a']_

```
{!docs/examples/modules/array_reverse.juttle!}
```

## Array.shift

Removes and returns the first element of an array
```
Array.shift(array)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array to take first element from | Yes

_Example: Take the element `'a'` out of `['a', 'b']`_

```
{!docs/examples/modules/array_shift.juttle!}
```

## Array.slice

Returns a subarray of the given array
```
Array.slice(array, start, end)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array to return a slice of | Yes
`start`    | Index of subarray start | No; defaults to 0
`end`      | Index of subarray end | No; defaults to end of array

_Example: Take the slice `['banana']` of the array `['banana', 'pajama']`_

```
{!docs/examples/modules/array_slice.juttle!}
```

## Array.sort

Sort an array. If the array contains numbers, they are sorted in increasing order. If it contains strings, they are sorted alphabetically. Sorting a mixed array is an error.
```
Array.sort(array)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array to sort | Yes

_Example: Sort `['c', 'a', 'b']`, yielding `['a', 'b', 'c']`._

```
{!docs/examples/modules/array_sort.juttle!}
```

## Array.splice

Removes and returns a subarray, and replaces the subarray with given elements in the input array
```
Array.splice(array, start, end, elements...)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array to splice | Yes
`start`    | Start of subarray to replace | No; defaults to 0
`end`    | End of subarray | No; defaults to end of `array`
`elements`    | List of elements to add | No; defaults to none

_Example: Replace `'banana'` with `'potatoes'` and return `['banana']` given the array `['banana', 'pajama']`._

```
{!docs/examples/modules/array_splice.juttle!}
```

## Array.toString

Returns a string representation of a given array.
```
Array.toString(array)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    |   The array to stringify  | Yes

_Example: Stringify `["hello", "goodbye"]`, yielding the string `["hello", "goodbye"]`._

```
{!docs/examples/modules/array_to_string.juttle!}
```

## Array.unshift

Add an element to the beginning of an array
```
Array.unshift(array, element)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`array`    | Array to add element to | Yes
`element`  | Element to add | Yes

_Example: Add `'pajama'` and `'potatoes'` to the beginning of `['banana']`_

```
{!docs/examples/modules/array_unshift.juttle!}
```
