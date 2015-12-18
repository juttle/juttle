`Number` constants
==================

All `Number` constants are present
----------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
      | put max_value         = Number.MAX_VALUE
      | put min_value         = Number.MIN_VALUE
      | put nan               = Number.NaN
      | put positive_infinity = Number.POSITIVE_INFINITY
      | put negative_infinity = Number.NEGATIVE_INFINITY
      | view result

### Output

    {
      time: "1970-01-01T00:00:00.000Z",
      max_value: 1.7976931348623157e+308,
      min_value: 5e-324,
      nan: NaN,
      positive_infinity: Infinity,
      negative_infinity: -Infinity
    }
