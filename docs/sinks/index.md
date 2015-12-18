---
title: Sinks Overview | Juttle Language Reference
---

# Sinks

Final nodes of Juttle flowgraphs are referred to as sinks.

```text
(source; source) | processor | (processor; processor) | processor | (sink; sink)
```

**[view](../sinks/view.md)** 

Visualize data using the view sink with built-in views `view table`, `view text`, or charts available via juttle-viz library.

**[write](../sinks/write.md)**

Send data out using the write sink with built-in adapters `write file`, `write http`, or plug in external [adapters](../adapters/index.md) to write to remote backends.
