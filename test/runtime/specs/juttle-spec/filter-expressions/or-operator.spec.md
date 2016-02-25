# The `OR` operator

## Returns correct result

### Juttle

    emit -from Date.new(0) -limit 4
      | put c = count()
      | put left  = c == 3 || c == 4   // false, false, true,  true
      | put right = c == 2 || c == 4   // false, true,  false, true
      | filter left == true OR right == true
      | view result

### Output

    { "time": "1970-01-01T00:00:01.000Z", c: 2, left: false, right: true }
    { "time": "1970-01-01T00:00:02.000Z", c: 3, left: true, right: false }
    { "time": "1970-01-01T00:00:03.000Z", c: 4, left: true, right: true }

## Doesn't short-circuit

### Juttle

    emit -from Date.new(0) -limit 4
      | filter x == null OR x < null
      | view result

### Warnings

  * Invalid operand types for "<": null and null.
