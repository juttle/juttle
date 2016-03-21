# The `.` operator (in lvalue, nested)

## Assigns correctly when used in a nested expression

### Juttle

    function f() {
      var v = { a: 1, b: { d: 4, e: { g: 7, h: 8, i: 9 }, f: 6, }, c: 3 };
      v.b.e.h = 11;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: { a: 1, b: { d: 4, e: { g: 7, h: 11, i: 9 }, f: 6 }, c: 3 } }

## Produces an error when an element in the middle of the chain is missing

### Juttle

    function f() {
      var v = { a: 1, b: { d: 4, e: { g: 7, h: 8, i: 9 }, f: 6, }, c: 3 };
      v.b.g.h = 11;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Warnings

  * Invalid operand types for "[]": null and string (h).
