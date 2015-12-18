---
title: Sources Overview | Juttle Language Reference
---

# Sources

Source procs appear at the beginning of a flowgraph to feed data points into it. 

```text
(source; source) | processor | (processor; processor) | processor | (sink; sink)
```

**[emit](../sources/emit.md)**

Use `emit` source to synthetically generate points that contain only a timestamp, to compose test/example Juttle programs.

**[read](../sources/read.md)**

Read data via adapters such as the built-in `read file`, `read stochastic`, `read http`, or plug in external [adapters](../adapters/index.md) to read from remote backends.