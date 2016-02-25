# Juttle "sigma" reducer

## complains if missing argument

### Juttle

    reduce sigma() | view result

### Errors

   * reducer sigma expects 1 argument but was called with 0


## outputs null on empty stream

### Juttle

    emit -limit -1 -from Date.new(0) | reduce sigma('foo') |  view result

### Output
    {sigma: null}


## (skip) outputs null on empty batched stream (explicit batch)

### Juttle

    emit -limit -1 -from Date.new(0) | batch :s: | reduce sigma('foo') |  view result

### Output
    {sigma: null}


## (skip) outputs null on empty batched stream  (reduce -every)

### Juttle

    emit -limit -1 -from Date.new(0) | reduce -every :s: sigma('foo') |  view result

### Output
    {sigma: null}


## outputs null on empty batch (explicit batches)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | batch :0.1s: | reduce sigma('foo') |  view result

### Output
    {sigma: null, time: "1970-01-01T00:00:00.100Z"}
    {sigma: null, time: "1970-01-01T00:00:00.200Z"}


## outputs null on empty batch (reduce -every)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: sigma('foo') |  view result

### Output
    {sigma: null, time: "1970-01-01T00:00:00.100Z"}
    {sigma: null, time: "1970-01-01T00:00:00.200Z"}


## outputs null on empty window (reduce -every -over)

### Juttle

    emit -limit 1 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: -over :0.1s: sigma('foo') |  view result

### Output
    {sigma: null, time: "1970-01-01T00:00:00.100Z"}
