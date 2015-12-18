Sequence tests
======================================================

matching sequence of numbers
----------------------------
### Juttle
    emit -limit 10 -from Date.new(0)
    | put c = count()
    | sequence c = 1, c > 5, c < 10 | view result

### Output
    { time: "1970-01-01T00:00:00.000Z", c: 1, _seqno: 0}
    { time: "1970-01-01T00:00:05.000Z", c: 6, _seqno: 0}
    { time: "1970-01-01T00:00:06.000Z", c: 7, _seqno: 0}



matching sequence of numbers (with by grouping)
-----------------------------------------------
### Juttle
    emit -limit 10 -from Date.new(0)
    | put c = count()
    | (put host="bar"; put host="foo")
    | sequence -groupby "host" c = 1, c > 5, c < 10
    | sort host, c
    | view result

### Output
    { host: "bar", c: 1, _seqno: 0}
    { host: "bar", c: 6, _seqno: 0}
    { host: "bar", c: 7, _seqno: 0}
    { host: "foo", c: 1, _seqno: 1}
    { host: "foo", c: 6, _seqno: 1}
    { host: "foo", c: 7, _seqno: 1}


matching sequence of numbers and hosts
--------------------------------------
### Juttle
    emit -limit 10 -from Date.new(0)
    | put c = count()
    | (put host="bar"; put host="foo")
    | sequence  c = 1 AND host="foo", c > 5 AND host="bar", c > 6 AND host="foo"
    | view result

### Output
    { time: "1970-01-01T00:00:00.000Z", host: "foo", c: 1, _seqno: 0}
    { time: "1970-01-01T00:00:05.000Z", host: "bar", c: 6, _seqno: 0}
    { time: "1970-01-01T00:00:06.000Z", host: "foo", c: 7, _seqno: 0}


matching _interleaved_ sequences of numbers (with by grouping)
--------------------------------------------------------------

### Juttle
    // The goal is to verify that points are output in time-order, even though the
    // sequences are interleaved
    const epoch = Date.new(0);
    const points = [{time: epoch,        host: "bar", c: 1},
                    {time: epoch + :1s:, host: "foo", c: 1},
                    {time: epoch + :2s:, host: "bar", c: 3},
                    {time: epoch + :3s:, host: "foo", c: 3}];

    emit -points points | sequence -groupby "host" c=1, c=3 | view result

### Output
    {"time":"1970-01-01T00:00:00.000Z","host":"bar","c":1,"_seqno":0}
    {"time":"1970-01-01T00:00:01.000Z","host":"foo","c":1,"_seqno":1}
    {"time":"1970-01-01T00:00:02.000Z","host":"bar","c":3,"_seqno":0}
    {"time":"1970-01-01T00:00:03.000Z","host":"foo","c":3,"_seqno":1}



non-matching sequence of numbers
--------------------------------
### Juttle
    emit -limit 10 -from Date.new(0)
    | put c = count()
    | sequence c = 1, c > 5, c < 6 | view result

### Output

```

```


non-matching sequence of numbers and hosts (with by grouping)
------------------------------------------------------------
### Juttle
    emit -limit 10 -from Date.new(0)
    | put c = count()
    | (put host="bar"; put host="foo")
    | sequence -groupby "host" c = 1 AND host="foo", c > 5 AND host="bar", c > 6 AND host="foo"
    | view result

### Output

```

```
