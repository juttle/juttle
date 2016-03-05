# Juttle "stdev" reducer

## complains if missing argument

### Juttle

    reduce stdev() | view result

### Errors

   * reducer stdev expects 1 argument but was called with 0


## outputs null on empty stream

### Juttle

    emit -limit -1 -from Date.new(0) | reduce stdev('foo') |  view result

### Output
    {stdev: null}


## (skip) outputs null on empty batched stream (explicit batch)

### Juttle

    emit -limit -1 -from Date.new(0) | batch :s: | reduce stdev('foo') |  view result

### Output
    {stdev: null}


## (skip) outputs null on empty batched stream  (reduce -every)

### Juttle

    emit -limit -1 -from Date.new(0) | reduce -every :s: stdev('foo') |  view result

### Output
    {stdev: null}


## outputs null on empty batch (explicit batches)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | batch :0.1s: | reduce stdev('foo') |  view result

### Output
    {stdev: null, time: "1970-01-01T00:00:00.100Z"}
    {stdev: null, time: "1970-01-01T00:00:00.200Z"}


## outputs null on empty batch (reduce -every)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: stdev('foo') |  view result

### Output
    {stdev: null, time: "1970-01-01T00:00:00.100Z"}
    {stdev: null, time: "1970-01-01T00:00:00.200Z"}


## outputs null on empty window (reduce -every -over)

### Juttle

    emit -limit 1 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: -over :0.1s: stdev('foo') |  view result

### Output
    {stdev: null, time: "1970-01-01T00:00:00.100Z"}

## supports sigma as a deprecated alias for stdev

### Juttle

    emit -from :-10s: | put i=1 | reduce sigma(i), stdev(i) | view result

### Output
    {sigma: 0, stdev: 0}
