The `Date.formatTz` function
==========================

Produces an error when passed argument `date` of invalid type
-------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.formatTz(null, "abcd") | view result

### Warnings

  * Invalid argument type for "Date.formatTz": expected date, received null.

Produces an error when passed argument `tzstring` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.formatTz(:2015-01-01T00:00:00:, 23) | view result

### Warnings

  * Invalid argument type for "Date.formatTz": expected string, received number (23).

Formats a date in different timezones (and doesnt care about Standard or DST)
----------------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
        | put pacific = Date.formatTz(:2015-01-01T00:00:00:,"PDT")
        | put mountain = Date.formatTz(:2015-01-01T00:00:00:,"MST")
        | put central = Date.formatTz(:2015-01-01T00:00:00:,"CDT")
        | put eastern = Date.formatTz(:2015-01-01T00:00:00:,"Eastern")
        | view result

### Output

    {
        "central": "2014-12-31T18:00:00-06:00",
        "eastern": "2014-12-31T19:00:00-05:00",
        "mountain": "2014-12-31T17:00:00-07:00",
        "pacific": "2014-12-31T16:00:00-08:00",
        "time": "1970-01-01T00:00:00.000Z"
    }
