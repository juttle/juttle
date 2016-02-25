# The `NOT` operator

## Returns correct result

### Juttle

    emit -from Date.new(0) -limit 2
      | put value = count() == 2   // false, true
      | filter NOT value == true
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", value: false }
