# The `.` operator (in rvalue, on values)

## Returns correct result when used on an `Object`

### Juttle

    emit -from :0: -limit 1
    | put in1 = { a: 1, b: 2, c: 3 }.a
    | put in2 = { a: 1, b: 2, c: 3 }.b
    | put in3 = { a: 1, b: 2, c: 3 }.c
    | put out = { a: 1, b: 2, c: 3 }.d
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", in1: 1, in2: 2, in3: 3, out: null }

## Produces an error when used on a value of invalid type

### Juttle

    emit -from :0: -limit 1
    | put result = null.b
    | view result

### Errors

  * RuntimeError: Invalid operand types for "[]": null and string (b).
