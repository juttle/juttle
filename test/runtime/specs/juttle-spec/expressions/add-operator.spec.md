# The `+` operator

## Returns correct result when used on two `Number`s

### Juttle

    emit -from Date.new(0) -limit 1 | put result = 5 + 6 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 11 }

## Returns correct result when used on two `String`s

### Juttle

    emit -from Date.new(0) -limit 1 | put result = "abcd" + "efgh" | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "abcdefgh" }

## Returns correct result when used on a `Date` and a `Duration`

### Juttle

    emit -from Date.new(0) -limit 1 | put result = :2015-01-01T00:00:05: + :6 seconds: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "2015-01-01T00:00:11.000Z" }

## Returns correct result when used on a `Duration` and a `Date`

### Juttle

    emit -from Date.new(0) -limit 1 | put result = :5 seconds: + :2015-01-01T00:00:06: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "2015-01-01T00:00:11.000Z" }

## Returns correct result when used on two `Duration`s

### Juttle

    emit -from Date.new(0) -limit 1 | put result = :5 seconds: + :6 seconds: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "00:00:11.000" }

## Produces an error when used on invalid operand type combinations

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null + null | view result

### Errors

  * Invalid operand types for "+": null and null.
