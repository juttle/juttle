# The `head` processor

## Uses `1` as the default argument value

### Juttle

    emit -from :0: -limit 5 | head | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }

## Inverts negative argument values

### Juttle

    emit -from :0: -limit 5 | head -3 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:01.000Z" }
    { time: "1970-01-01T00:00:02.000Z" }
