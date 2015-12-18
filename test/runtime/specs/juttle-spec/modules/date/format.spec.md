The `Date.format` function
==========================

Produces an error when passed argument `date` of invalid type
-------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.format(null, "abcd") | view result

### Warnings

  * Invalid argument type for "Date.format": expected date, received null.

Produces an error when passed argument `format` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.format(:2015-01-01T00:00:00:, 23) | view result

### Warnings

  * Error: Invalid argument type for "Date.format": expected string, received number (23).

Produces an error when passed argument `tzstring` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.format(:2015-01-01T00:00:00:, null,null) | view result

### Warnings

  * Invalid argument type for "Date.format": expected string, received null.

Formats a date in different timezones (and doesnt care about Standard or DST)
----------------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
        | put pacific = Date.format(:2015-01-01T00:00:00:,null,"PDT")
        | put mountain = Date.format(:2015-01-01T00:00:00:,"HH-z","MST")
        | put central = Date.format(:2015-01-01T00:00:00:,"HH Z","CDT")
        | put eastern = Date.format(:2015-01-01T00:00:00:,null,"Eastern")
        | view result

### Output

    {
        "central": "18 -06:00",
        "eastern": "2014-12-31T19:00:00-05:00",
        "mountain": "17-MST",
        "pacific": "2014-12-31T16:00:00-08:00",
        "time": "1970-01-01T00:00:00.000Z"
    }
