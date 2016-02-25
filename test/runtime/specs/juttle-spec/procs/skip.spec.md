# The `skip` processor

## Uses `1` as the default argument value

### Juttle

    emit -from :0: -limit 5 | skip | view result

### Output

    { time: "1970-01-01T00:00:01.000Z" }
    { time: "1970-01-01T00:00:02.000Z" }
    { time: "1970-01-01T00:00:03.000Z" }
    { time: "1970-01-01T00:00:04.000Z" }

## Inverts negative argument values

### Juttle

    emit -from :0: -limit 5 | skip -3 | view result

### Output

    { time: "1970-01-01T00:00:03.000Z" }
    { time: "1970-01-01T00:00:04.000Z" }
