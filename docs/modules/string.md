---
title: String Module | Juttle Language Reference
---

# String

String module provides Juttle functions to manipulate strings and convert from/to other data types to String. Juttle strings are subject to string coercion and interpolation rules, also described here.

[TOC]

***

## String Interpolation

In Juttle, your string literals can include placeholders that contain
expressions that generate variable values. Values that aren't originally
strings are automatically converted.

Placeholders have this format:

```
${expression}
```

_Example: simple string interpolation_

```
{!docs/examples/modules/string_interpolation_1.juttle!}
```

Because the values of count and total are numbers, Jut automatically
converts them to strings.

Placeholders can include more complex expressions, too.

_Example: complex string interpolation_

```
{!docs/examples/modules/string_interpolation_2.juttle!}
```

***

## String Coercion

These are the basic string coercion rules:

- Values for Juttle options are not subject to string coercion.

    That is, if you specify an option like `-option myvalue` then myvalue
    must be defined somewhere in your program as a constant or
    a variable. If the value of the option should be literally
    "myvalue", use `-option 'myvalue'`.

- Arguments for reducer calls are not subject to string coercion

    For example, if your program includes `reduce count(host)` then host
    must be defined elsewhere in your program. If you want to reduce by
    counting the instances of each value of your data's host field, use
    `reduce count('host')`.

***

## toString Conversion

While not part of the String module, these functions are listed here for convenience.

### [Date.toString()](../modules/date.md#datetostring)

### [Duration.toString()](../modules/duration.md#durationtostring)

### [Number.toString()](../modules/number.md#numbertostring)

### Boolean.toString()

Convert a value of type Boolean to type String.

```
Boolean.toString(boolean)
```

_Example: print a true/false statement_

```
{!docs/examples/modules/boolean_to_string.juttle!}
```

### RegExp.toString()

Convert a value of type RegExp to type String.

```
RegExp.toString(regular_expression)
```

This function replaces the first string it finds. To replace globally,
append the [/g modifier](http://www.w3schools.com/jsref/jsref_regexp_g.asp) to your
regular expression, like this:

```
/hi/g
```

***

## String.charAt

Given a string and an index, returns the character at that index in the string. Returns an empty string if the index is out of bounds.
```
String.charAt(string, index)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`string`   | The string to return a character from   |  Yes
`index`   | The index in `string` of the character to return|  Yes

_Example_

```
{!docs/examples/modules/string_char_at.juttle!}
```

***

## String.charCodeAt

Given a string and an index, returns the character code at that index in the string. Returns `null` if the index is out of bounds.
```
String.charCodeAt(string, index)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`string`   | The string to return a character from   |  Yes
`index`   | The index in `string` of the character code to return|  Yes

_Example_

```
{!docs/examples/modules/string_char_code_at.juttle!}
```

***

## String.concat

Combine two or more strings and return a new string.

```
String.concat(string1, string2 [, string3 [, ..] ])
```

:bulb: `Tip:` There are simpler ways to combine
strings; see [String interpolation](../modules/string.md#string-interpolation).
Strings can also be concatenated via the + operator; in the example
below, `String.concat` could also be replaced by `host + "." + domain`.

_Example_

```
{!docs/examples/modules/string_concat.juttle!}
```

***

## String.fromCharCode

Given a character code, returns a one-character string consisting of the character for that code.
```
String.fromCharCode(code)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`code`   | The code of the character to be stringified  |  Yes

_Example_

```
{!docs/examples/modules/string_from_char_code.juttle!}
```

***

## String.indexOf

Perform a substring search and return the index of the first match, or
-1 if there is no match. See also
[String.search](../modules/string.md#stringsearch)
for regex-based searches.

```
String.indexOf(string, searchstring)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`string`   | The string in which to perform the search  |  Yes
`searchstring`  | The string to search for  |  Yes

_Example: Find the first instance of "voodoo"_

```
{!docs/examples/modules/string_index_of.juttle!}
```

***

## String.length

Return the length of a string.

```
String.length(string)
```

_Example_

```
{!docs/examples/modules/string_length.juttle!}
```

***

## String.match

Given a string and a regular expression, returns an array containing the matching substring and any captured substrings if the string matches the regular expression. Returns `null` if the string does not match the regular expression.
```
String.match(string, regexp)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`string`   | The string to check for a match   |  Yes
`regexp`   | The regular expression to check `string` with |  Yes

_Example_

```
{!docs/examples/modules/string_match.juttle!}
```

***

## String.replace

Replace all or part of a string with another string.

```
String.replace("original_string", "string_to_replace", "replacement_string")
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`original_string`  | The original string to manipulate  |  Yes
`string_to_replace` |  The segment of the string to replace; this can be a regular expression  | Yes
`replacement_string` |  The new string  | Yes

_Example: Transform "hayneedlehay" into "hayFOUNDhay"_

```
{!docs/examples/modules/string_replace_1.juttle!}
```

_Example: Transform "hayneeeeeeedlehay" (or a similar string with one or more "e" characters) into "hayFOUNDhay"_

```
{!docs/examples/modules/string_replace_2.juttle!}
```

***

## String.search

Search for a match between a regular expression and a string. See also
[String.indexOf](../modules/string.md#stringindexof)
for simple substring searches.

```
String.search(string, regexp)
```

If successful, this function returns the index of the first match of the
regular expression inside the string. Otherwise, it returns -1. Regular
expression syntax follows common conventions; see for example the
[JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Constructor).

_Example_

```
{!docs/examples/modules/string_search.juttle!}
```

***

## String.slice

Extract a section of a string and return it as a new string. See also [String.substr](../modules/string.md#stringsubstr) for length-based extraction.

```
String.slice(string, beginSlice[, endSlice])
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`string`   | The string from which to extract the slice  |  Yes
`beginSlice` | The zero-based index at which to begin extraction <p>If this value is negative, it is treated as `(sourceLength+beginSlice)`` where sourceLength is the length of the string. For example, if beginSlice is -3 it is treated as sourceLength-3, or three characters before the end of the string. </p>  |  Yes  
`endSlice`  | The zero-based index at which to end extraction <p>If negative, it is treated as (sourceLength-endSlice) where sourceLength is the length of the string.  </p> |  No; defaults to the end of the string

_Example_

```
{!docs/examples/modules/string_slice.juttle!}
```

***

## String.split

Split a string into an array of strings by separating the string into
substrings.

```
String.split(string, separator)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`string`   | The string to split. String is converted to an array of characters.   |  Yes
`separator` |   One or more characters to use for separating the string. The separator is treated as if it is an empty string.  |   Yes

_Example_

```
{!docs/examples/modules/string_split.juttle!}
```

***

## String.substr

Extract a portion of a string beginning at the `start` location through the specified `length` number of characters. Similar to [String.slice](../modules/string.md#stringslice), except the optional parameter is `length` rather than ending offset.

```
String.substr(string, start[, length])
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`string`   | The string from which to extract the substring  |  Yes
`start` | The character index at which to begin extraction. <br><br>The `start` location of zero (0) maps to the first character of the string; the index of the last character is `String.length - 1` . <br><br>If `start` is positive, it is used as character index counting from the start of the string. If `start` equals or exceeds the length of the string, an empty string will be returned. <br><br>If `start` value is negative, it is used as character index counting from the end of the string. If the absolute value of a negative `start` exceeds the length of the string, zero will be used as the starting index. | Yes
`length`  | The number of characters to extract. <br><br>If `length` extends beyond the end of the string, fewer characters than `length` will be returned. If `length` is zero or negative, an empty string will be returned. |  No; defaults to extracting until the end of the string is reached.

If `start` is zero and `length` is omitted, the whole string will be returned.

_Example: substr parameters_

```
{!docs/examples/modules/string_substr_1.juttle!}
```

_Example: using substr to shorten a name_

```
{!docs/examples/modules/string_substr_2.juttle!}
```

***

## String.toLowerCase

Convert a string to lowercase characters.

```
String.toLowerCase(string)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`string`   | The string to convert to lowercase |  Yes

_Example: Convert a camel-case string to lowercase_

```
{!docs/examples/modules/string_to_lower_case.juttle!}
```

***

## String.toUpperCase

Convert a string to uppercase characters.

```
String.toUpperCase(string)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`string`   | The string to convert to uppercase  | Yes

_Example: Convert a camel-case string to uppercase_

```
{!docs/examples/modules/string_to_upper_case.juttle!}
```

***

## String.trim

Returns the given string, minus any leading or trailing whitespace.
```
String.trim(string)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`string`   | The string to trim | Yes

_Example_

```
{!docs/examples/modules/string_trim.juttle!}
```
