---
title: unbatch | Juttle Language Reference
---

unbatch 
=======

Turn a batched stream into an unbatched stream.

``` 
unbatch
```

This processor has no arguments.

_Example: Emit 20 points, batch every five seconds, count the result, then unbatch and count again_

```
{!docs/examples/processors/unbatch.juttle!}
```

