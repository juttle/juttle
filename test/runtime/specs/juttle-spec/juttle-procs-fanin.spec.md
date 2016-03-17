# Juttle fanin proc

## on a single stream marks preserve calendarness

### Juttle

    emit -from :0: -every :1M: -limit 4
    | batch :2M:
    | view result -times true -marks true

### Output

    { "mark": true, "interval": "2M", "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-02-01T00:00:00.000Z" }
    { "mark": true, "interval": "2M", "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-04-01T00:00:00.000Z" }
    { "mark": true, "interval": "2M", "time": "1970-05-01T00:00:00.000Z" }

## on aligned parallel streams marks preserve calendarness

### Juttle

    (
        emit -from :0: -every :1M: -limit 4 | batch :2M:;
        emit -from :0: -every :1M: -limit 4 | batch :2M:;
    )
    | view result -times true -marks true

### Output

    { "mark": true, "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-02-01T00:00:00.000Z" }
    { "time": "1970-02-01T00:00:00.000Z" }
    { "mark": true, "interval": "2M", "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-04-01T00:00:00.000Z" }
    { "time": "1970-04-01T00:00:00.000Z" }
    { "mark": true, "interval": "2M", "time": "1970-05-01T00:00:00.000Z" }

## on aligned parallel streams marks keep shorter interval

### Juttle

    (
        emit -from :0: -every :1M: -limit 4 | batch :1M:;
        emit -from :0: -every :1M: -limit 4 | batch :2M:;
    )
    | view result -times true -marks true

### Output

    { "mark": true, "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "mark": true, "interval": "1M", "time": "1970-02-01T00:00:00.000Z" }
    { "time": "1970-02-01T00:00:00.000Z" }
    { "time": "1970-02-01T00:00:00.000Z" }
    { "mark": true, "interval": "1M", "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-03-01T00:00:00.000Z" }
    { "mark": true, "interval": "1M", "time": "1970-04-01T00:00:00.000Z" }
    { "time": "1970-04-01T00:00:00.000Z" }
    { "time": "1970-04-01T00:00:00.000Z" }
    { "mark": true, "interval": "1M", "time": "1970-05-01T00:00:00.000Z" }

## on unaligned streams marks fragment original intervals

### Juttle

    (
        emit -from :0: -every :1M: -limit 4 | batch :2M:;
        emit -from :0: -every :1M: -limit 4 | batch -every :2M: -on :day 15:;
    )
    | view result -times true -marks true

### Output

    { "mark": true, "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "time": "1970-01-01T00:00:00.000Z" }
    { "mark": true, "interval": "14d", "time": "1970-01-15T00:00:00.000Z" }
    { "time": "1970-02-01T00:00:00.000Z" }
    { "time": "1970-02-01T00:00:00.000Z" }
    { "mark": true, "interval": "45.00:00:00.000", "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-03-01T00:00:00.000Z" }
    { "time": "1970-03-01T00:00:00.000Z" }
    { "mark": true, "interval": "14d", "time": "1970-03-15T00:00:00.000Z" }
    { "time": "1970-04-01T00:00:00.000Z" }
    { "time": "1970-04-01T00:00:00.000Z" }
    { "mark": true, "interval": "47.00:00:00.000", "time": "1970-05-01T00:00:00.000Z" }
    { "mark": true, "interval": "14d", "time": "1970-05-15T00:00:00.000Z" }
