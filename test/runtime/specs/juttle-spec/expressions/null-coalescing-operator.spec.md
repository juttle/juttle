The null-coalescing operator
============================

Returns correct result
----------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put m = 5 ?? 6
      | put n = null ?? 6
      | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", m: 5, n: 6 }
