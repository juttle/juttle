---
title: Duration Module | Juttle Language Reference
---

# Duration

Duration is the representation of a time interval in Juttle, defined as the time span between two Juttle moments; refer to the [Time module](../reference/time.md) for more. The Duration module provides functions for working with durations, including conversion from/to seconds and strings.

[TOC]

***

## Duration.as

Return the value of duration as a floating-point number in units of
timeunit.

``` 
Duration.as(duration, timeunit)
```

If you were to multiply this number by Duration(1, timeunit), you would
get back the original duration.

_Example: output elapsed time as seconds_

```
{!docs/examples/modules/duration_as.juttle!}
```

***

## Duration.format

Format the duration as a string.

``` 
   Duration.format(duration)
   Duration.format(duration, format_string)
   
```

The optional `format_string` is as described in the [npm moment-duration-format package](https://www.npmjs.com/package/moment-duration-format). When no format is given, an approximate format will be built based on the magnitude of the duration.

_Example_

```
{!docs/examples/modules/duration_format.juttle!}
```

***

## Duration.get

Return the value of a given time unit for a duration (such as, "days") as an integer.

``` 
Duration.get(duration, timeunit)
```

_Example: split duration into its time unit components_

```
{!docs/examples/modules/duration_get.juttle!}
```

***

## Duration.milliseconds

Return the value of duration as a floating-point number in milliseconds.

``` 
Duration.milliseconds(duration)
```

:information_source: `Note:` Equivalent to `Duration.as(duration, "ms")`.

_Example: convert duration of Hadron Epoch to milliseconds_

```
{!docs/examples/modules/duration_milliseconds.juttle!}
```

***

## Duration.new

Return a duration.

``` 
Duration.new(seconds)
```

_Example: Some ways to represent a minute_

```
{!docs/examples/modules/duration_new.juttle!}
```

***

## Duration.seconds

Return the value of duration as a floating-point number in units of seconds.

``` 
Duration.seconds(duration)
```

:information_source: `Note:` Equivalent to `Duration.as(duration, "seconds")`.

_Example: how many seconds in a year_

```
{!docs/examples/modules/duration_seconds.juttle!}
```

***

## Duration.toString()

Convert a value of type Duration to type String.

``` 
Duration.toString(duration)
```

_Example: print duration of this day so far_

```
{!docs/examples/modules/duration_to_string.juttle!}
```

