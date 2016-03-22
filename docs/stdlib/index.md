---
title: Juttle Standard Library Overview | Juttle Language Reference
---

# Stdlib

Juttle comes with a standard library that contains a few modules which export
useful [reducers](../reducers/index.md), [functions](../concepts/programming_constructs#functions) and
[subgraphs](../concepts/programming_constructs/#subgraphs)
that you can use to enhance your Juttle programs.

   * [Predict](predict.md)
   * [Random](random.md)
   * [Stats](stats.md)
   * [Select](select.md)

To use these modules, place an import statement into the Juttle program (no "stdlib" prefix needed), for example:

```
import "predict" as p;
```

Examples of using stdlib functionality are available [on GitHub](https://github.com/juttle/juttle/tree/master/docs/examples/stdlib).
