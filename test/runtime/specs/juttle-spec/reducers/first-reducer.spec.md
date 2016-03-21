# Juttle "first" reducer

## complains if missing argument

### Juttle

    reduce first() | view result

### Errors

   * reducer first expects 1 argument but was called with 0


## outputs null on empty stream

### Juttle

    emit -limit -1 -from Date.new(0) | reduce first('foo') |  view result

### Output
    {first: null}


## (skip) outputs null on empty batched stream (explicit batch)

### Juttle

    emit -limit -1 -from Date.new(0) | batch :s: | reduce first('foo') |  view result

### Output
    {first: null, interval: "00:00:01.000"}


## (skip) outputs null on empty batched stream  (reduce -every)

### Juttle

    emit -limit -1 -from Date.new(0) | reduce -every :s: first('foo') |  view result

### Output
    {first: null, interval: "00:00:01.000"}


## outputs null on empty batch (explicit batches)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | batch :0.1s: | reduce first('foo') |  view result

### Output
    {first: null, time: "1970-01-01T00:00:00.100Z", interval: "00:00:00.100"}
    {first: null, time: "1970-01-01T00:00:00.200Z", interval: "00:00:00.100"}

## outputs null on empty batch (reduce -every)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: first('foo') |  view result

### Output
    {first: null, time: "1970-01-01T00:00:00.100Z", interval: "00:00:00.100"}
    {first: null, time: "1970-01-01T00:00:00.200Z", interval: "00:00:00.100"}


## outputs null on empty window (reduce -every -over)

### Juttle

    emit -limit 1 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: -over :0.1s: first('foo') |  view result

### Output
    {first: null, time: "1970-01-01T00:00:00.100Z", interval: "00:00:00.100"}
