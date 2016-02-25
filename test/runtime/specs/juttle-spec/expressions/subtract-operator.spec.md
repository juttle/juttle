# The `-` operator

## Returns correct result when used on two `Number`s

### Juttle

    emit -from Date.new(0) -limit 1 | put result = 6 - 5 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 1 }

## Returns correct result when used on two `Date`s

### Juttle

    emit -from Date.new(0) -limit 1 | put result = :2015-01-01T00:00:06: - :2015-01-01T00:00:05: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "00:00:01.000" }

## Returns correct result when used on a `Date` and a `Duration`

### Juttle

    emit -from Date.new(0) -limit 1 | put result = :2015-01-01T00:00:06: - :5 seconds: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "2015-01-01T00:00:01.000Z" }

## Returns correct result when used on two `Duration`s

### Juttle

    emit -from Date.new(0) -limit 1 | put result = :6 seconds: - :5 seconds: | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "00:00:01.000" }

## Produces an error when used on invalid operand type combinations

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null - null | view result

### Errors

  * Invalid operand types for "-": null and null.

The following testcases should really be in parser tests, but we don't have
these.

## Parses a `-` right before an identifier inside a subexpression

### Juttle

    const a = 1;
    const b = 2;

    emit -from Date.new(0) -limit 1 | put result = (a -b) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }

## Parses a `-` right before a non-identifier

### Juttle

    emit -from Date.new(0) -limit 1 | put result = 1 -2 | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }
