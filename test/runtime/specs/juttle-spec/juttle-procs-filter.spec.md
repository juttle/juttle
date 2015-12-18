Juttle "filter" processor
=========================

Warns and drops points on a runtime error
-----------------------------------------

### Juttle

    emit -from Date.new(0) -limit 5
      | put x = count() % 2 == 1 ? count() : null
      | filter x > 0
      | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", x: 1 }
    { time: "1970-01-01T00:00:02.000Z", x: 2 }
    { time: "1970-01-01T00:00:04.000Z", x: 3 }

### Warnings

  * Invalid operand types for ">": null and number (0).
