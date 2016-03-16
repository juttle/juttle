# The `[]` operator (in rvalue, nested)

## Returns correct result when used in a nested expression

### Juttle

    const c = [ 1, [ 4, [ 7, 8, 9 ], 6, ], 3 ];

    emit -from :0: -limit 1 | put result = c[1][1][1] | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 8 }

## Produces an error when an element in the middle of the chain is missing

### Juttle

    const c = [ 1, [ 4, [ 7, 8, 9 ], 6, ], 3 ];

    emit -from :0: -limit 1 | put result = c[1][3][1] | view result

### Errors

  * RuntimeError: Invalid operand types for "[]": null and number (1).
