# Number literal

## Simple number

### Juttle

    emit -from Date.new(0) -limit 1 | put n = 5 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", n: 5 }

## Infinity

### Juttle

    emit -from Date.new(0) -limit 1 | put n = Infinity | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", n: Infinity }

## NaN

### Juttle

    emit -from Date.new(0) -limit 1 | put n = NaN | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", n: NaN }
