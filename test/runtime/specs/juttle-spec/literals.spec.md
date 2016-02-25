# Juttle literals

## Null

### Juttle

    emit -from Date.new(0) -limit 1 | put n = null | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", n: null }

## Booleans

### Juttle

    emit -from Date.new(0) -limit 1 | put t = true, f = false | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", t: true, f: false }
