---
title: Time | Juttle Language Reference
---

# Time

Time in Juttle is represented by "moment" and "duration" types.

[TOC]

***

## Moments and Durations

Time is central to processing in Juttle. Each point that is output by a
source node has a time value, stored in the field named time, which
represents the date+time of the point. We refer to these date+time
values as *moments*, and the span of time between two moments
as *durations*.

The time field always holds a moment. You can also assign moments and
durations to other fields, do simple arithmetic on moments, and specify
moments as parameters to other
[Functions](../modules/index.md),
[Reducers](../reducers/index.md) and
[Processors](../procs/index.md#processors).

You can specify moments and durations using moment literals like `:2 weeks ago:`, or with date and time functions in [Date](../modules/date.md) and [Duration](../modules/duration.md) modules. You can also create new moments and durations by doing time arithmetic on existing moments and durations.

***

## Time Notation

In Juttle, you specify time using a string between two colons. Absolute
moments are specified as ISO 8601 strings, like `:1999-12-31:`.
Durations and relative moments are specified using a natural-language
notation, like `:this minute:`.

:bulb: `Tip:` It's important to know whether your
data was imported with a valid time field, and whether the time value
included a time zone. Points without a time zone are imported and
queried as UTC, and points without a valid time field receive one that
uses the import time.

A moment or duration is surrounded by colons. Spaces between the colons
and the time are optional. All times are UTC0 unless a time zone is
specified by appending it to an ISO-8601 string.

### Absolute Moments

-  Midnight on a specific date (UTC0):
```
:2014-09-21:
```

-  An [ISO-8601](http://en.wikipedia.org/wiki/ISO_8601) date and time, UTC0:
```
: 2014-09-22T11:39:17.993 :
```

-  The same date and time, as Pacific Standard Time:
```
: 2014-09-22T03:39:17.993-08:00 :
```

### Durations

-  One second, minute, hour, day, week, and so on:
```
:second:
:minute:
:hour:
:day:
:week:
:month:
:year:
```

Note that :month: and :year: are special "calendar" durations that do
not have fixed length but instead advance whole months or years relative
to a fixed moment.

-  Abbreviations for 0 seconds, 1 minute, 2 hours, 3 days, 4 weeks, 5
months, 6 years:
```
:0s:
:1m:
:2h:
:3d:
:4w:
:5M:
:6y:
```

-  Two ways to write one hour and twenty-three minutes:
```
: 1 hour and 23 minutes :
: 01:23:00 :
```

-  Additional examples:
```
: 1 second :
: 20 minutes :
```

### Relative Moments

-  The moment at which the program started running:
```
:now:
```

This moment does not change over the life of a program. If you want the
continuously updated wall clock time, use
[Date.time](../modules/date.md#datetime).

-  Midnight yesterday, today, or tomorrow:
```
:yesterday:
:today:
:tomorrow:
```

-  Seven hours after midnight on the current day:
```
: 07:00:00 after today :
```

-  One minute from the start of the program's execution:
```
: 1 minute from now :
```

-  Shorter way to write `:2 minutes from :now:`:
```
:+2m:
```

-  Shorter way to write `:1 hour and 10 minutes before now:`:
```
:-01:10:00:
```

-  Now minus 72 hours:
```
: 3 days ago :
```

-  Now minus 22 days:
```
: 3 weeks and 1 day ago :
```

-  Midnight of the first day of the current calendar month:
```
:this month:
```

-  Midnight of the first day of the previous calendar month:
```
:last month:
```

-  Midnight of the 20th day of the previous calendar month:
```
:day 20 of last month:
```

-  The minute in which the program began executing:
```
:this minute:
```

-  The next even hour after the start of the program's execution:
```
:next hour:
```

-  The day in which the program began executing:
```
:this day:
:today:
```

-  The day before the day in which the program began executing:
```
:last day:
:yesterday:
```

### Infinite Moments and Durations

-  A historical duration beginning at the first moment for which data is
available, and ending at the moment the program was started:
```
:forever:
```
(valid in -to and -last)

-  Historical data from the first moment for which data exists:
```
:beginning:
```
(valid in -from)

-  Live data until the last moment for which data exists:
```
:end:
```
(valid in -to)

***

## Time Arithmetic

In Juttle, you can do arithmetic directly with moments and durations,
and such arithmetic produces moments, durations, or numbers depending on
the operation you perform.

Time in Juttle is a distinct type (separate from numbers, Booleans,
etc), and arithmetic on time is possible. For example, a duration may be
added to a moment to produce a new moment that is shifted in time. A
moment may be subtracted from a moment to produce a duration equal to
the span of time between the moments. This means you do not need to
convert moments and durations into seconds or milliseconds, then back to
moments or durations in order to operate on them. It also means that
nonsensical time arithmetic (like adding two moments) will be flagged as
an error.

Here are the arithmetic operations you can perform with moments, and
their resulting types:

Operation                 |   Result
------------------------- |  ----------
:moment: +/- :duration:   |   :moment:
:moment: - :moment:       |   :duration:
:duration: +/- :duration: |   :duration:
number \* :duration:      |   :duration:
:duration: / :duration:   |   number
:duration: % :duration:   |   :duration: (the remainder of dividing the durations)

Calendar durations involving :months: or :years: may also be combined
arithmetically. Note that adding a calendar offset to a moment produces
another moment, so "calendarness" is no longer relevant (for example,
`:now: + :6 months:` is the moment 6 calendar months from now, but it is
like any other moment once computed). Mixed calendar/non-calendar
durations (for example, `:2 months: + :1 day:`) are possible, but these
are not generally accepted by Juttle procs wanting durations as their
arguments.

**Examples**

```
:tomorrow: == :yesterday: + :48 hours:

:hour: / :minute: == 60

2 \* :60 seconds: + :hour: / 60 == :3 minutes:

:now: + :hour: / 2 == :0.5 hours from now:

:this hour: - :today: == (:this hour: - Date.new(0)) % :day:
```

_Example: count frequency of points over time_

The following Juttle example counts the number of points over a
specified interval, then reports the average number of points per week.
One way to understand the moment and duration arithmetic involved is to
think of count() / DURATION as being an absolute rate (counts per unit
time), which we multiply by :week: to get the expected number of points
in a week at that rate. Since we cannot write count() / DURATION
directly, we group (DURATION / :w:) to produce a number (durations per
week), and count is then divided by this number to produce counts per
week.

```
{!docs/examples/modules/time_arithmetic.juttle!}   
```

***
