# The `[]` operator (in rvalue, on values)

## Returns correct result when used on a `String` with a `Number` index

### Juttle

    emit -from :0: -limit 1
    | put in1 = 'abc'[0]
    | put in2 = 'abc'[1]
    | put in3 = 'abc'[2]
    | put out = 'abc'[3]
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", in1: "a", in2: "b", in3: "c", out: null }

## Produces an error when used on a `String` with an index of invalid type

### Juttle

    emit -from :0: -limit 1
    | put result = 'abc'[null]
    | view result

### Errors

  * RuntimeError: Invalid operand types for "[]": string (abc) and null.

## Returns correct result when used on an `Array` with a `Number` index

### Juttle

    emit -from :0: -limit 1
    | put in1 = [ 1, 2, 3 ][0]
    | put in2 = [ 1, 2, 3 ][1]
    | put in3 = [ 1, 2, 3 ][2]
    | put out = [ 1, 2, 3 ][3]
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", in1: 1, in2: 2, in3: 3, out: null }

## Produces an error when used on an `Array` with an index of invalid type

### Juttle

    emit -from :0: -limit 1
    | put result = [ 1, 2, 3 ][null]
    | view result

### Errors

  * RuntimeError: Invalid operand types for "[]": array ([ 1, 2, 3 ]) and null.

## Returns correct result when used on an `Object` with a `String` index

### Juttle

    emit -from :0: -limit 1
    | put in1 = { a: 1, b: 2, c: 3 }['a']
    | put in2 = { a: 1, b: 2, c: 3 }['b']
    | put in3 = { a: 1, b: 2, c: 3 }['c']
    | put out = { a: 1, b: 2, c: 3 }['d']
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", in1: 1, in2: 2, in3: 3, out: null }

## Produces an error when used on an `Object` with an index of invalid type

### Juttle

    emit -from :0: -limit 1
    | put result = { a: 1, b: 2, c: 3 }[null]
    | view result

### Errors

  * RuntimeError: Invalid operand types for "[]": object ({ a: 1, b: 2, c: 3 }) and null.

## Produces an error when used on a value of invalid type

### Juttle

    emit -from :0: -limit 1
    | put result = null[1]
    | view result

### Errors

  * RuntimeError: Invalid operand types for "[]": null and number (1).
