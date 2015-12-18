---
title: Data types | Juttle Language Reference
---

Data types 
==========

Here are the data types supported in Juttle data points.

Type       | Description
---------- | -----------
Null       | Non-existing or unknown value
Boolean    | A logical truth value, either "true" or "false"
Number     | A number in IEEE 754 64-bit double-precision format
String     | Zero or more Unicode characters
RegExp     | A regular expression, [as implemented in Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
Date       | An exact moment in time, represented by a number
Duration   | An interval between to moments in time, represented by a numerical length
Array      | An ordered sequence of zero or more values
Object     | An unordered collection of zero or more properties, each consisting of a key and a value

All data types supported by Juttle data points are equivalent to their
corresponding [JavaScript types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures),
except Date and Duration which are specific to Juttle.

You can also convert a field to or from type string, using these data
typing functions:

-   [Boolean.toString()](../modules/string.md#booleantostring)
-   [Date.toString()](../modules/date.md#datetostring)
-   [Duration.toString()](../modules/duration.md#durationtostring)
-   [Number.fromString()](../modules/number.md#numberfromstring)
-   [Number.toString()](../modules/number.md#numbertostring)
-   [RegExp.toString()](../modules/string.md#regexptostring)

