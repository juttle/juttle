---
title: pass | Juttle Language Reference
---

pass 
====

Pass the output of the preceding flowgraph into the next one.

``` 
pass
```

The pass processor has no options.

_Example: Using pass to debug a flowgraph_

pass is handy for outputting data from the middle of a flowgraph, then
allowing the flowgraph to continue unchanged. This simple example
outputs some raw points as text,
then passes the output unchanged to a [put](../processors/put.md)
statement before ultimately feeding into a timechart:

```
{!docs/examples/processors/pass_debug.juttle!}
```

The (view text ; pass) statement is handy for debugging; just insert it at
any point in your flowgraph to check whether your data is being
processed as expected.

