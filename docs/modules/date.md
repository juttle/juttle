---
title: Date Module | Juttle Language Reference
---

# Date

Dates are represented in a Juttle flowgraph as Juttle moments. The Date module enables conversion between Unix timestamps, string representation of date/time, and moments.

[TOC]

***

## Date.elapsed

Return floating-point seconds since the moment.

``` 
Date.elapsed(moment)
```

:information_source: `Note:` This is equivalent to
`Duration.seconds(Date.now() - moment)`.

```
{!docs/examples/modules/date_elapsed.juttle!}
```

***

## Date.endOf

Return a new moment, equal to the supplied moment set to the end of its
current time unit.

``` 
Date.endOf(moment, timeunit)
```

:information_source: `Note:` The new moment is the end of the
unit in the time zone in which moment was recorded, not the time zone in
which it is displayed.

_Example: Find the last day of this month_

```
{!docs/examples/modules/date_endof.juttle!}
```

***

## Date.format

Format a moment as a string in the specified format, optionally adding a
time zone. The input is assumed to be in UTC.

``` 
Date.format(moment)
Date.format(moment, format_string, timezone)
```


Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`moment`   | The moment to reformat  |  Yes
`format_string`  | The format configuration, as documented in [momentjs's format() function](http://momentjs.com/docs/#/displaying/)  |  No; if not specified, the function returns the ISO-8601-formatted date.
`timezone` | A time zone to include in the formatted string, as documented in [momentjs's moment-timezone package](http://momentjs.com/timezone/) <br><br>At the link above, you'll find a map you can hover over to get valid values for specific locations. We've also supplemented the built-in values, see list below.  |  No

:bulb: Adjustments for Daylight Savings Time/Standard Time are always applied automatically, so for example you'll still get an accurate result if you specify 'PST' for a date that falls within PDT, or 'PDT' for a date that falls within PST.

Additional timezone values we support:

   -   arizona:"US/Arizona"   
   -   az:"US/Arizona"   
   -   central:"US/Central"   
   -   cdt:"US/Central"   
   -   cst:"US/Central"   
   -   eastern:"US/Eastern"   
   -   edt:"US/Eastern"   
   -   est:"US/Eastern"   
   -   mountain:"US/Mountain"   
   -   mdt:"US/Mountain"   
   -   mst:"US/Mountain"   
   -   pacific:"US/Pacific"   
   -   pst:"US/Pacific"   
   -   pdt:"US/Pacific"    

_Example_

```
{!docs/examples/modules/date_format.juttle!}
```

***

## Date.formatTz

Add a time zone to a UTC moment.

``` 
Date.formatTz(moment, timezone)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`moment`   | The moment to reformat |  Yes
`timezone` |  A time zone to include in the formatted string, as documented in [momentjs's moment-timezone package](http://momentjs.com/timezone/) <br><br>At the link above, you'll find a map you can hover over to get valid values for specific locations. We've also supplemented the built-in values, see list below. |  No   

:bulb: Adjustments for Daylight Savings Time/Standard Time are always applied automatically, so for example you'll still get an accurate result if you specify 'PST' for a date that falls within PDT, or 'PDT' for a date that falls within PST.

Additional timezone values we support:

   -   arizona:"US/Arizona"   
   -   az:"US/Arizona"   
   -   central:"US/Central"   
   -   cdt:"US/Central"   
   -   cst:"US/Central"   
   -   eastern:"US/Eastern"   
   -   edt:"US/Eastern"   
   -   est:"US/Eastern"   
   -   mountain:"US/Mountain"   
   -   mdt:"US/Mountain"   
   -   mst:"US/Mountain"   
   -   pacific:"US/Pacific"   
   -   pst:"US/Pacific"   
   -   pdt:"US/Pacific"   

_Example_

```
{!docs/examples/modules/date_format_tz.juttle!}
```

***

## Date.get

Return the numeric value of the time unit for a moment as an integer.

``` 
Date.get(moment, timeunit)
```

_Example: get the number of current month_

```
{!docs/examples/modules/date_get.juttle!}
```

***

## Date.new

Return a moment.

``` 
Date.new("YYYY-MM-DDTHH:MM:SS.msec+TZ"|seconds)
```

There are two ways to specify a moment:

Value | Description
----- | ------
`"YYYY-MM-DDTHH:MM:SS.msec+TZ"` | An ISO-8601 string. The time zone (TZ) is a numeric offset from UTC0. UTC0 is the default.
`seconds` |   Seconds since the UNIX epoch

_Example: Some valid dates_

```
{!docs/examples/modules/date_new.juttle!}
```

***

## Date.parse

Parse a moment from a string using the specified format.

``` 
Date.parse(moment_string, format_string)
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`moment_string`  | The string to convert to a moment  | Yes
`format_string`  | The format configuration, as documented in [momentjs's String+Format constructor](http://momentjs.com/docs/#/parsing/string-format/)  |  No; if not specified, the function expects ISO-8601-formatted date as input.

_Example: Parse a JavaScript-formatted date_

```
{!docs/examples/modules/date_parse.juttle!}
```

### Format

Whitespace in the format string should match whitespace in the incoming string.

Different separators such as `-` vs `/` for date components, `.` vs `,` before milliseconds, are supported. However, if the timestamp in your data is enclosed in brackets, such as `[2015/10/29 16:46:35]`, Date.parse will only handle the enclosed string and not the brackets.

When Date.parse is called with a single parameter of input string, without a custom format specification, it will parse several variants of ISO-8601 dates.

### Timezone support

Juttle follows momentjs format for timezone specification, namely, as offset from UTC
`+HH:mm` or `-HH:mm`, `+HHmm` or `-HHmm`, or the literal `Z` to stand for UTC (GMT) time zone.

Date.parse does not handle acronyms such as "PDT", or longform such as "GMT-0700 (PDT)".

***

## Date.quantize

Return a new moment, equal to the supplied moment rounded down to an
even number of durations since the epoch.

``` 
Date.quantize(moment, duration)
```

_Example: get year and month when Pluto lost planet status_

```
{!docs/examples/modules/date_quantize.juttle!}
```

***

## Date.startOf

Return a new moment, equal to the supplied moment set to the start of
its current time unit.

``` 
Date.startOf(moment, timeunit)
```

:information_source: `Note:` The new moment is the start of the unit in the time zone in which moment was recorded, not the time zone in which it is displayed.

_Example: beginning of a given day_

```
{!docs/examples/modules/date_startof.juttle!}
```

***

## Date.time

Return the current moment, at millisecond resolution.

``` 
Date.time()
```

_Example: Show the difference between a time stamp and real time_

```
{!docs/examples/modules/date_time.juttle!}
```

***

## Date.toString()

Convert a value of type Date to type String. This is necessary to perform string operations such as concatenation.

``` 
Date.toString(date)
```

The returned String is in ISO-8601 format:

```
YYYY-MM-DDTHH:mm:ss.SSSZ
```

_Example: print current time_

```
{!docs/examples/modules/date_to_string.juttle!}
```

***

## Date.unix

Return the UNIX time stamp for this moment, as seconds since the epoch.

``` 
Date.unix(moment)
```

:information_source: `Note:` This is equivalent to
`Duration.seconds(moment - Date.new(0))`.

_Example: Compute the number of seconds in a minute, the hard way_

```
{!docs/examples/modules/date_unix.juttle!}
```

***

## Date.unixms

Return the UNIX time stamp for this moment, as milliseconds since the
epoch.

``` 
Date.unixms(moment)
```

:information_source: `Note:` This is equivalent to
`Duration.milliseconds(moment - Date.new(0))`.

_Example: Compute the number of milliseconds in a minute, the hard way_

```
{!docs/examples/modules/date_unix_ms.juttle!}
```

***
