# The `AND` operator

## Returns correct result

### Juttle

    emit -from Date.new(0) -limit 4
      | put c = count()
      | put left  = c == 3 || c == 4   // false, false, true,  true
      | put right = c == 2 || c == 4   // false, true,  false, true
      | filter left == true AND right == true
      | view result

### Output

    { "time": "1970-01-01T00:00:03.000Z", c: 4, left: true, right: true }

## Doesn't short-circuit

### Juttle

    emit -from Date.new(0) -limit 1
      | filter x != null AND x < null
      | view result

### Warnings

  * Invalid operand types for "<": null and null.
