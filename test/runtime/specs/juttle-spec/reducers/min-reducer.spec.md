Juttle "min" reducer
======================

complains if missing argument
-----------------------------

### Juttle

    reduce min() | view result

### Errors

   * reducer min expects 1 argument but was called with 0

outputs Infinity on empty stream
--------------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | reduce min('foo') |  view result

### Output
    {min: Infinity}


(skip) outputs Infinity on empty batched stream (explicit batch)
---------------------------------------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | batch :s: | reduce min('foo') |  view result

### Output
    {min: Infinity}


(skip) outputs Infinity on empty batched stream  (reduce -every)
---------------------------------------------------------

### Juttle

    emit -limit -1 -from Date.new(0) | reduce -every :s: min('foo') |  view result

### Output
    {min: Infinity}


outputs Infinity on empty batch (explicit batches)
--------------------------------------------------

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | batch :0.1s: | reduce min('foo') |  view result

### Output
    {min: Infinity, time: "1970-01-01T00:00:00.100Z"}
    {min: Infinity, time: "1970-01-01T00:00:00.200Z"}


outputs Infinity on empty batch (reduce -every)
-----------------------------------------------

### Juttle

    emit -limit 2 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: min('foo') |  view result

### Output
    {min: Infinity, time: "1970-01-01T00:00:00.100Z"}
    {min: Infinity, time: "1970-01-01T00:00:00.200Z"}


outputs Infinity on empty window (reduce -every -over)
------------------------------------------------------

### Juttle

    emit -limit 1 -every :0.1s: -from Date.new(0) | reduce -every :0.1s: -over :0.1s: min('foo') |  view result

### Output
    {min: Infinity, time: "1970-01-01T00:00:00.100Z"}
