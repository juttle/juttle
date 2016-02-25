---
title: Math Module | Juttle Language Reference
---

# Math

Juttle Math module provides functions and constants for mathematical operations.

[TOC]

***

## Math constants

Juttle supports these Math constants as well as [Number constants](../modules/number.md#number-constants). As all exports from Math module, they can be referenced without an import directive in a Juttle program.

Constant    |  Description
----------- | ------------
Math.E      | Euler's constant, the base of natural logarithms, approximately 2.718
Math.LN10   |  The natural logarithm of 10, approximately 2.302
Math.LN2    |The natural logarithm of 2, approximately 0.693
Math.LOG2E  |  The base 2 logarithm of Euler's constant, approximately 1.442
Math.Log10E |  The base 10 logarithm of Euler's constant, approximately 0.434
Math.PI     | Pi, the ratio of the circumference of a circle to its diameter, approximately 3.14159
Math.SQRT1_2 |  The square root of 1/2, approximately 0.707
Math.SQRT2  |  The square root of 2, approximately 1.414

_Example_

```
{!docs/examples/modules/math_circle_area.juttle!}
```

***

## Math.abs

Return the absolute value of a number.

``` 
Math.abs(number)
```

_Example_

```
{!docs/examples/modules/math_abs.juttle!}
```

***

## Math.acos

Return the arccosine of a specified number, in radians.

``` 
Math.acos(x)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`x`        | A number between -1 and 1  | Yes

***

## Math.asin

Return the arcsine of a specified number, in radians.

``` 
Math.asin(x)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`x`        | A number between -1 and 1  |  Yes

***

## Math.atan

Return the arctangent of a specified number, in radians.

``` 
Math.atan(x)
```

Parameter  | Description   | Required?
---------- | ------------- | ---------:
`x`        | A number      | Yes

***

## Math.atan2

Return the arctangent of the quotient of two numbers, in radians.

``` 
Math.atan2(y,x)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`y`   | A number representing the Y coordinate of a point  | Yes
`x`   | A number representing the X coordinate of a point  | Yes
   
:information_source: `Note:` The Y coordinate must be specified before the X coordinate.

***

## Math.ceil

Return the smallest integer greater than or equal to a specified number.

``` 
Math.ceil(number, digits)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`digits`   | The number of significant digits to be used. If 0, the value is rounded to the nearest integer; if greater than 0, the value is rounded to the specified number of decimal places; if less than 0, the value is rounded to the left of the decimal point. | No

_Example_

```
{!docs/examples/modules/math_ceil_floor.juttle!}
```

***

## Math.cos

Return the cosine of a specified number.

``` 
Math.cos(x)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`x`        |A number, in radians |  Yes

***

## Math.exp

Return e<super>x</super>, where x is a specified number and *e* is Euler's constant,
the base of the natural logarithms.

``` 
Math.exp(x)
```

Parameter  | Description   | Required?
---------- | ------------- | ---------:
`x`        | A number      | Yes

***

## Math.floor

Return the largest integer less than or equal to a number.

``` 
Math.floor(number, digits)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`digits`   | The number of significant digits to be used. If 0, the value is rounded to the nearest integer; if greater than 0, the value is rounded to the specified number of decimal places; if less than 0, the value is rounded to the left of the decimal point. | No

_Example_

```
{!docs/examples/modules/math_ceil_floor.juttle!}
```

***

## Math.log

Return the natural logarithm of the specified number.

``` 
Math.log(x)
```

Parameter  | Description   | Required?
---------- | ------------- | ---------:
`x`        | A number      | Yes

***

## Math.max

Return the largest of one or more numbers.

``` 
Math.max(x[, y[, .. ]])
```

_Example_

```
{!docs/examples/modules/math_max.juttle!}
```

***

## Math.min

Return the smallest of one or more numbers.

``` 
Math.min(x[, y[, .. ]])
```

_Example_

```
{!docs/examples/modules/math_min.juttle!}
```

***

## Math.random

Return a floating-point, pseudo-random number in the range \[0, 1); that
is, from 0 (inclusive) up to but not including 1 (exclusive), which you
can then scale to your desired range.

``` 
Math.random()
```

:information_source: `Note:` The implementation selects the initial seed to the random number generation algorithm. Use [Math.seed](../modules/math.md#mathseed) to choose your own.

_Example: Return a random integer between 1 and max_

```
{!docs/examples/modules/math_random.juttle!}
```

_Example: Throw rock, paper, or scissors at random_

```
{!docs/examples/modules/rock_paper_scissors.juttle!}
```

***

## Math.pow

Return base to the exponent power, that is, base<super>exponent</super>.

``` 
Math.pow(base, exponent)
```

_Example_

```
{!docs/examples/modules/math_pow.juttle!}
```

***

## Math.round

Return the value of a number rounded to the nearest integer.

``` 
Math.round(number, digits)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`digits`   | The number of significant digits to be used. If 0, the value is rounded to the nearest integer; if greater than 0, the value is rounded to the specified number of decimal places; if less than 0, the value is rounded to the left of the decimal point. | No

_Example_

```
{!docs/examples/modules/math_round.juttle!}
```

***

## Math.seed

Initialize the random number generator to a known value. Subsequent
calls to
[Math.random](../modules/math.md#mathrandom)
will always generate the same pseudo-random sequence for a given seed
value

``` 
Math.seed(seed)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`seed`     | Random number generator seed value. A number.  | Yes

_Example: Do something predictably random_

```
{!docs/examples/modules/math_seed.juttle!}
```

***

## Math.sin

Return the sine of the specified number.

``` 
Math.sin(x)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`x`        |A number, in radians  | Yes


***

## Math.sqrt

Return the positive square root of a number.

``` 
Math.sqrt(number)
```

_Example: find numbers with whole square roots_

```
{!docs/examples/modules/math_sqrt.juttle!}
```

***

## Math.tan

Return the tangent of the specified number.

``` 
Math.tan(x)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`x`        | A number, in radians  | Yes

***

