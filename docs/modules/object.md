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

## Object.toString

Returns a string representation of an object.
```
Object.toString(object)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`object`   | The object to stringify|  Yes

_Example_

```
{!docs/examples/modules/object_to_string.juttle!}
```

## Object.values

Scan an object containing key/value pairs and return a list of its values.

```
Object.values(object)
```

Parameter  | Description   |  Required?
---------- | ------------- | ---------:
`object`   | The object from which to pluck values  |  Yes

_Example_

```
{!docs/examples/modules/object_values.juttle!}
```
