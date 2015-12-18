Topology tests
===============

Proc after a sink
-----------------

### Juttle

    emit -limit 1 | view text | keep a

### Errors

   * keep may not come after a sink

Proc before a source
--------------------

### Juttle

    emit -limit 1 | keep a | emit

### Errors

   * keep may not come before a source

Source inside a parellel graph in the middle of a flowgraph
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 5
    | (emit -from Date.new(10) -limit 5; pass)
    | view result

### Output

    { time: "1970-01-01T00:00:00.000Z" }
    { time: "1970-01-01T00:00:01.000Z" }
    { time: "1970-01-01T00:00:02.000Z" }
    { time: "1970-01-01T00:00:03.000Z" }
    { time: "1970-01-01T00:00:04.000Z" }
    { time: "1970-01-01T00:00:10.000Z" }
    { time: "1970-01-01T00:00:11.000Z" }
    { time: "1970-01-01T00:00:12.000Z" }
    { time: "1970-01-01T00:00:13.000Z" }
    { time: "1970-01-01T00:00:14.000Z" }
