# The `[]` operator (in lvalue, on values)

## Assigns correctly when used on an `Array` with a `Number` index

### Juttle

    function in1() {
      var v = [1, 2, 3];
      v[0] = 4;

      return v;
    }

    function in2() {
      var v = [1, 2, 3];
      v[1] = 5;

      return v;
    }

    function in3() {
      var v = [1, 2, 3];
      v[2] = 6;

      return v;
    }

    function out1() {
      var v = [1, 2, 3];
      v[3] = 4;

      return v;
    }

    function out2() {
      var v = [1, 2, 3];
      v[4] = 5;

      return v;
    }

    emit -from :0: -limit 1
    | put in1 = in1()
    | put in2 = in2()
    | put in3 = in3()
    | put out1 = out1()
    | put out2 = out2()
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", in1: [ 4, 2, 3 ], in2: [ 1, 5, 3 ], in3: [ 1, 2, 6 ], out1: [1, 2, 3, 4], out2: [1, 2, 3, null, 5] }

## Produces an error when used on an `Array` with a negative index

### Juttle

    function f() {
      var v = [ 1, 2, 3 ];
      v[-1] = 5;
    }

    emit -from :0: -limit 1
    | put result = f()
    | view result

### Warnings

  * Index out of bounds: -1.

## Produces an error when used on an `Array` with an index of invalid type

### Juttle

    function f() {
      var v = [ 1, 2, 3 ];
      v[null] = 5;
    }

    emit -from :0: -limit 1
    | put result = f()
    | view result

### Warnings

  * Invalid operand types for "[]": array ([ 1, 2, 3 ]) and null.

## Assigns correctly when used on an `Object` with a `String` index

### Juttle

    function in1() {
      var v = { a: 1, b: 2, c: 3 };
      v['a'] = 4;

      return v;
    }

    function in2() {
      var v = { a: 1, b: 2, c: 3 };
      v['b'] = 5;

      return v;
    }

    function in3() {
      var v = { a: 1, b: 2, c: 3 };
      v['c'] = 6;

      return v;
    }

    function out() {
      var v = { a: 1, b: 2, c: 3 };
      v['d'] = 4;

      return v;
    }

    emit -from :0: -limit 1
    | put in1 = in1()
    | put in2 = in2()
    | put in3 = in3()
    | put out = out()
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", in1: { a: 4, b: 2, c: 3 }, in2: { a: 1, b: 5, c: 3 }, in3: { a: 1, b: 2, c: 6 }, out: { a: 1, b: 2, c: 3, d: 4 } }

## Produces an error when used on an `Object` with an index of invalid type

### Juttle

    function f() {
      var v = { a: 1, b: 2, c: 3 };
      v[null] = 5;
    }

    emit -from :0: -limit 1
    | put result = f()
    | view result

### Warnings

  * Invalid operand types for "[]": object ({ a: 1, b: 2, c: 3 }) and null.

## Produces an error when used on a value of invalid type

### Juttle

    function f() {
      var v = null;
      v[1] = 5;
    }

    emit -from :0: -limit 1
    | put result = f()
    | view result

### Warnings

  * Invalid operand types for "[]": null and number (1).
