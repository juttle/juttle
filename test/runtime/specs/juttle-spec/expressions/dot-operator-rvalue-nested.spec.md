# The `.` operator (in rvalue, nested)

## Returns correct result when used in a nested expression

### Juttle

    const c = { a: 1, b: { d: 4, e: { g: 7, h: 8, i: 9 }, f: 6, }, c: 3 };

    emit -from :0: -limit 1 | put result = c.b.e.h | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: 8 }

## Produces an error when a property in the middle of the chain is missing

### Juttle

    const c = { a: 1, b: { d: 4, e: { g: 7, h: 8, i: 9 }, f: 6, }, c: 3 };

    emit -from :0: -limit 1 | put result = c.b.g.h | view result

### Errors

  * RuntimeError: Invalid operand types for "[]": null and string (h).
