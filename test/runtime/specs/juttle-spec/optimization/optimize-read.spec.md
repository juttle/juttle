Read Optimization
=================

Does not optimize read followed by a sink
-----------------------------------------

### Juttle

    read test -debug 'optimization' | view result

### Output

    { type: "disabled", reason: "not_optimizable" }

Does not optimize if read has multiple outputs
----------------------------------------------

### Juttle

    read test -debug 'optimization' | (pass; filter x=true) | view result

### Output

    { type: "disabled", reason: "read_multiple_outputs" }

Does not optimize if the downstream node has multiple inputs
------------------------------------------------------------

### Juttle

    (emit; read test -debug 'optimization') | head | view result

### Output

    { type: "disabled", reason: "next_node_multiple_inputs" }
