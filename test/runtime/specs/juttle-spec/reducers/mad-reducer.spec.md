# Juttle "mad" reducer

## complains if missing argument

### Juttle

    reduce mad() | view result

### Errors

   * reducer mad expects 1 argument but was called with 0


## outputs null on empty stream

### Juttle

    emit -limit -1 -from Date.new(0) | reduce mad('foo') |  view result

### Output
    {mad: null}


## (skip) outputs null on empty batched stream (explicit batch)

### Juttle

    emit -limit -1 -from Date.new(0) | batch :s: | reduce mad('foo') |  view result

### Output
    {mad: null}


## (skip) outputs null on empty batched stream  (reduce -every)

### Juttle

    emit -limit -1 -from Date.new(0) | reduce -every :s: mad('foo') |  view result

### Output
    {mad: null}


## outputs null on empty batch (explicit batches)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | batch :0.1s: | reduce mad('foo') |  view result

### Output
    {mad: null, time: "1970-01-01T00:00:00.100Z"}
    {mad: null, time: "1970-01-01T00:00:00.200Z"}


## outputs null on empty batch (reduce -every)

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: mad('foo') |  view result

### Output
    {mad: null, time: "1970-01-01T00:00:00.100Z"}
    {mad: null, time: "1970-01-01T00:00:00.200Z"}


## outputs null on empty window (reduce -every -over)

### Juttle

    emit -limit 1 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: -over :0.1s: mad('foo') |  view result

### Output
    {mad: null, time: "1970-01-01T00:00:00.100Z"}


## computes a proper mad

### Juttle

    emit -limit 5 -from Date.new(0)
    | ( put x = 10;
        put x = 12;
        put x = 16;
    ) | reduce madx = mad(x) | view result

### Output
    {madx: 2}
