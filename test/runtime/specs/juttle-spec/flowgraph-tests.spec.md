# Flowgraph tests

## Modifying a point on one branch does not modify it on another.

### Juttle

    emit -limit 3 | put label="pre" | (put label="branch1"; tail 1) | keep label | sort label | view result

### Output

    {"label":"branch1"}
    {"label":"branch1"}
    {"label":"branch1"}
    {"label":"pre"}

## Points with `time == null` are handled correctly

Regression test for #351.

### Juttle

    emit -from :0: -limit 1
    | batch -every :1s:
    | filter true = false
    | (reduce time = null; reduce time = null)
    | view result

### Output

    { time: null, interval: "00:00:01.000" }
    { time: null, interval: "00:00:01.000" }
