Flowgraph tests
===============

Modifying a point on one branch does not modify it on another.
--------------------------------------------------------------

### Juttle

    emit -limit 3 | put label="pre" | (put label="branch1"; tail 1) | keep label | sort label | view result

### Output

    {"label":"branch1"}
    {"label":"branch1"}
    {"label":"branch1"}
    {"label":"pre"}
