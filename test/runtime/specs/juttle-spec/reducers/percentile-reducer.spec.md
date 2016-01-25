Juttle "percentile" reducer
=====================

complains if missing argument
-----------------------------

### Juttle

    reduce percentile() | view result

### Errors

   * reducer percentile expects 1 to 2 arguments but was called with 0


outputs null on empty stream
----------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | reduce percentile('foo') |  view result

### Output
    {percentile: null}


(skip) outputs null on empty batched stream (explicit batch)
------------------------------------------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | batch :s: | reduce percentile('foo') |  view result

### Output
    {percentile: null}


(skip) outputs null on empty batched stream  (reduce -every)
------------------------------------------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | reduce -every :s: percentile('foo') |  view result

### Output
    {percentile: null}


outputs null on empty batch (explicit batches)
----------------------------------------------

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | batch :0.1s: | reduce percentile('foo') |  view result

### Output
    {percentile: null, time: "1970-01-01T00:00:00.100Z"}
    {percentile: null, time: "1970-01-01T00:00:00.200Z"}


outputs null on empty batch (reduce -every)
-------------------------------------------

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: percentile('foo') |  view result

### Output
    {percentile: null, time: "1970-01-01T00:00:00.100Z"}
    {percentile: null, time: "1970-01-01T00:00:00.200Z"}


outputs null on empty window (reduce -every -over)
--------------------------------------------------

### Juttle

    emit -limit 1 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: -over :0.1s: percentile('foo') |  view result

### Output
    {percentile: null, time: "1970-01-01T00:00:00.100Z"}


complains about nonnumeric input
-------------------------------------------------------
### Juttle

    emit -limit 1 -from Date.new(0) | put foo="bar" | reduce percentile('foo') |  view result

### Errors

   * percentile expects numeric fields, but received: bar


keeps discrete values and returns data values for percentiles
------------------------------------------------------------------------
### Juttle
    emit -limit 1000 -every :.001s: -from Date.new(0)
        | put x = Math.floor(count()/100)
        | reduce median = percentile(x, 0.5), medplus = percentile(x, 0.6)
        | remove time
        | view result

### Output
    { median: 5, medplus: 6 }

discrete case: median of an even number of points
-----------------------------------------------------------------------
### Juttle
    emit -limit 10 -from Date.new(0)
    | put x = count()
    | reduce p = percentile(x, 0.5)
    | view result

### Output
    { p: 5 }

discrete case: median of an odd number of points
-----------------------------------------------------------------------
### Juttle
    emit -limit 11 -from Date.new(0)
    | put x = count()
    | reduce p = percentile(x, 0.5)
    | view result

### Output
    { p: 6 }

discrete case: median of a run of duplicates
-----------------------------------------------------------------------
### Juttle
    emit -limit 11 -from Date.new(0)
    | put x = (count() % 3 == 0) ? count() : 0
    | reduce p = percentile(x, 0.5)
    | view result

### Output
    { p: 0 }

switches to approximation for continuous values (interpolates percentiles)
------------------------------------------------------------------------
### Juttle
    emit -limit 1000 -every :.001s: -from Date.new(0)
        | (put x=Math.random() ; put x=Math.random() + 10)
        | reduce median = percentile(x, 0.5)
        | put winning = (1 < median && median < 10)
        | keep winning
        | view result

### Output
    { winning: true }
