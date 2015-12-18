The `!=` operator
=================

Returns correct result when used on two `Null`s
-----------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put eq = null != null | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: false }

Returns correct result when used on two `Boolean`s
--------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = true != true
      | put ne = true != false
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: false, ne: true }

Returns correct result when used on two `Number`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = 5 != 5
      | put ne = 5 != 6
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: false, ne: true }

Returns correct result when used on two `String`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = "abcd" != "abcd"
      | put ne = "abcd" != "efgh"
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: false, ne: true }

Returns correct result when used on two `RegExp`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = /abcd/ != /abcd/
      | put ne = /abcd/ != /efgh/
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: false, ne: true }

Returns correct result when used on two `Date`s
-----------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = :2015-01-01T00:00:05: != :2015-01-01T00:00:05:
      | put ne = :2015-01-01T00:00:05: != :2015-01-01T00:00:06:
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: false, ne: true }

Returns correct result when used on two `Duration`s
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = :00:00:05: != :00:00:05:
      | put ne = :00:00:05: != :00:00:06:
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: false, ne: true }

Returns correct result when used on two `Array`s
------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq1 = [1, 2, 3] != [1, 2, 3]
      | put eq2 = [{ a: [1] }] != [{ a: [1] }]
      | put ne1 = [1, 2, 3] != [4, 5, 6]
      | put ne2 = [{ a: [1] }] != [{ a: [2] }]
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq1: false, eq2: false, ne1: true, ne2: true }

Returns correct result when used on two `Object`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq1 = { a: 1, b: 2, c: 3 } != { a: 1, b: 2, c: 3 }
      | put eq2 = { a: [{ b: 1 }] } != { a: [{ b: 1 }] }
      | put ne1 = { a: 1, b: 2, c: 3 } != { d: 4, e: 5, f: 6 }
      | put ne2 = { a: [{ b: 1 }] } != { a: [{ b: 2 }] }
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq1: false, eq2: false, ne1: true, ne2: true }

Returns `true` when used on two values of a different type
----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = 5 != "abcd" | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: true }
