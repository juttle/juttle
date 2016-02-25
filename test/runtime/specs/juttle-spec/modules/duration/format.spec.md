# The `Duration.format` function

## Produces an error when passed an argument of invalid type

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Duration.format(null) | view result

### Warnings

  * Invalid argument type for "Duration.format": expected duration, received null.

## formats durations with no format string

### Juttle

    emit -from Date.new(0) -limit 1
    | put result = Duration.format(:22:10:00:)
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: "0d 22:10"}

## formats durations with a format string

### Juttle

    emit -from Date.new(0) -limit 1
    | put result = Duration.format(:22:10:00:, "h [hrs]")
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: "22 hrs"}
