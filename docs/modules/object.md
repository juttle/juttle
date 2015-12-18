---
title: Object Module | Juttle Language Reference
---

# Object


Objects can be declared as constants in a flowgraph or variables in
[user defined functions](../concepts/programming_constructs.md#functions).

The Object module exposes a single function, described here.

[TOC]

## Object.keys 

Scan an object containing key/value pairs and return a list of its keys.

``` 
Object.keys(object)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`object`   | The object from which to pluck keys  |  Yes

_Example_

```
{!docs/examples/modules/object_keys.juttle!}
```
