The `<=` operator
=================

Returns correct result when used on two `Number`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = 5 <= 5
      | put lt = 5 <= 6
      | put gt = 6 <= 5
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: true, lt: true, gt: false }

Returns correct result when used on two `String`s
-------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = "abcd" <= "abcd"
      | put lt = "abcd" <= "efgh"
      | put gt = "efgh" <= "abcd"
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: true, lt: true, gt: false }

Returns correct result when used on two `Date`s
-----------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = "2015-01-01T00:00:05" <= "2015-01-01T00:00:05"
      | put lt = "2015-01-01T00:00:05" <= "2015-01-01T00:00:06"
      | put gt = "2015-01-01T00:00:06" <= "2015-01-01T00:00:05"
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: true, lt: true, gt: false }

Returns correct result when used on two `Duration`s
---------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put eq = "00:00:05" <= "00:00:05"
      | put lt = "00:00:05" <= "00:00:06"
      | put gt = "00:00:06" <= "00:00:05"
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", eq: true, lt: true, gt: false }

Produces an error when used on invalid operand type combinations
----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = null <= null | view result

### Errors

  * Invalid operand types for "<=": null and null.
