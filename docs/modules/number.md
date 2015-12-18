---
title: Number Module | Juttle Language Reference
---

# Number

Juttle Number module provides constants for numeric operations, and functions for number/string conversion. Refer to the [Math module](../modules/math.md) for other mathematical constants and functions.

[TOC]

***

## Number constants

Juttle supports these Number constants as well as [Math constants](../modules/math.md#math-constants). They can be referenced without an import directive in a Juttle program, but are more commonly found in the output of certain mathematical operations than used explicitly.

Constant    |  Description
----------- | ------------
Number.MAX_VALUE | Largest positive numeric value, approximately `1.7976931348623157e+308`. <br>Larger values are converted to `Infinity`
Number.MIN_VALUE | Smallest positive numeric value (closest to zero), approximately `5e-324`. <br>Smaller values are converted to `0`.<br>Note that the most negative number is `-Number.MAX_VALUE`.
Number.NaN       | Not-A-Number value, returned from illegal mathematical operations; always compares unequal to any other value including `NaN`. <br>The floating point literal `NaN` can be used for shorter notation.
Number.NEGATIVE_INFINITY | `-Infinity` value which is less than `-Number.MAX_VALUE`. <br>The floating point literal `-Infinity` can be used for shorter notation.
Number.POSITIVE_INFINITY | `Infinity` value which is greater than `Number.MAX_VALUE`. <br>The floating point literal `Infinitiy` can be used for shorter notation.

_Example_

```
{!docs/examples/modules/number_infinities.juttle!}
```

***

## Number.fromString()

Convert a value of type String to type Number.

``` 
Number.fromString(string)
```

_Example: Parse out HTTP status code from apache access log line, and convert to a number for mathematical comparison_

```
{!docs/examples/modules/number_from_string.juttle!}
```

***

## Number.toString()

Convert a value of type Number to type String.

``` 
Number.toString(number)
```

_Example: print out numeric values_

:information_source: Note that multiple ways of printing numbers as part of a string are available. This example shows both Number.toString() conversion, and [string interpolation](../modules/string.md#string-interpolation) without explicit conversion.

```
{!docs/examples/modules/number_to_string.juttle!}
```

***
