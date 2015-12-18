Juttle "last" reducer
=====================

complains if missing argument
-----------------------------

### Juttle

    reduce last() | view result

### Errors

   * reducer last expects 1 argument but was called with 0


outputs null on empty stream
----------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | reduce last('foo') |  view result

### Output
    {last: null}


(skip) outputs null on empty batched stream (explicit batch)
-----------------------------------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | batch :s: | reduce last('foo') |  view result

### Output
    {last: null}


(skip) outputs null on empty batched stream  (reduce -every)
-----------------------------------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | reduce -every :s: last('foo') |  view result

### Output
    {last: null}


outputs null on empty batch (explicit batches)
----------------------------------------------

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | batch :0.1s: | reduce last('foo') |  view result

### Output
    {last: null, time: "1970-01-01T00:00:00.100Z"}
    {last: null, time: "1970-01-01T00:00:00.200Z"}


outputs null on empty batch (reduce -every)
-------------------------------------------

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: last('foo') |  view result

### Output
    {last: null, time: "1970-01-01T00:00:00.100Z"}
    {last: null, time: "1970-01-01T00:00:00.200Z"}


outputs null on empty window (reduce -every -over)
--------------------------------------------------

### Juttle

    emit -limit 1 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: -over :0.1s: last('foo') |  view result

### Output
    {last: null, time: "1970-01-01T00:00:00.100Z"}
