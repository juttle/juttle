# The `[]` operator (in lvalue, nested)

## Assigns correctly result when used in a nested expression

### Juttle

    function f() {
      var v = [ 1, [ 4, [ 7, 8, 9 ], 6 ], 3 ];
      v[1][1][1] = 11;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", result: [ 1, [ 4, [ 7, 11, 9 ], 6 ], 3 ] }

## Produces an error when an element in the middle of the chain is missing

### Juttle

    function f() {
      var v = [ 1, [ 4, [ 7, 8, 9 ], 6 ], 3 ];
      v[1][3][1] = 11;

      return v;
    }

    emit -from :0: -limit 1 | put result = f() | view result

### Warnings

  * Invalid operand types for "[]": null and number (1).
