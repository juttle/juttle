# The `Date.parse` function

## Produces an error when passed argument `s` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.parse(:2015-01-01T00:00:00:, "abcd") | view result

### Warnings

  * Invalid argument type for "Date.parse": expected string, received date (2015-01-01T00:00:00.000Z).

## Produces an error when passed argument `format` of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.parse("date string", null) | view result

### Warnings

  * Invalid argument type for "Date.parse": expected string, received null.

## Complains of badly-formed dates

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.parse("bad date") | view result

### Warnings

  * Unable to parse date: "bad date"


## Parses a custom-formatted date

### Juttle

    emit -limit 1
    | put a = :2015-05-06T19:26:07Z:
    | put b = Date.parse("2015-May-6 19:26:07 Z", "YYYY-MMM-D HH:mm:ss Z")
    | put winning = a == b
    | keep winning
    | view result

### Output

    { winning: true }

## Complains of dates not matching a specified format

### Juttle

    emit -from Date.new(0) -limit 1
    | put result = Date.parse("2015-05-06T19:26:07Z", "YYYY-MMM-D HH:mm:ss Z")
    | view result

### Warnings

  * Unable to parse date: "2015-05-06T19:26:07Z"


## Parses Juttle-style date variants

### Juttle

    emit -limit 1
    | put a = :2015-05-06T19:26:07Z:
    | put b = Date.parse("Tue May 6 19:26:07 2015 UTC")
    | put c = Date.parse("May 6 19:26:07 2015 UTC")
    | put winning = a == b && b == c
    | keep winning
    | view result

### Output

    { winning: true }
