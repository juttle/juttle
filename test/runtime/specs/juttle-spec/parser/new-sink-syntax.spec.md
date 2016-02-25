# New sink syntax

## Parses new sink sytnax

### Juttle

    emit -from :0: -limit 1 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }

## Parses new sink sytnax (with options)

### Juttle

    emit -from :0: -limit 1 | view result -a 1 -b 2 -c 3

### Output

    { time: "1970-01-01T00:00:00.000Z" }
