---
title: Conditionals | Juttle Language Reference
---

Conditionals
============

Conditionals are expressed in two different ways in Juttle, depending on whether they occur in function context, or in flowgraph context. 

Functions and reducers support standard `if`/`else` syntax for branching on condition.

Flowgraphs and subs do not support `if`/`else` and instead can be forked using the [filter](../processors/filter.md) proc to create conditional branch execution. 

Both functions/reducers and flowgraphs/subs support the ternary `?` operator for conditional assignments, and its shortcut `??` version, see [operators](operators.md).

Note that multiple conditions inside functions/reducers can be joined with either `AND`/`OR` or `&&`/`||`, but different logic applies, as the latter are short-circuiting, see examples for [operators](operators.md).

In filter expressions, only `AND`/`OR`/`NOT` syntax can be used to join multiple conditions, see examples for [filter expressions](../concepts/filtering.md).

_Example 1: direct conditional forking of the flowgraph_

```juttle
emit -from :-1m: -limit 10 | put value=count() 
| put highs = value - 5
| (
  filter highs > 0 | reduce count_highs = count();
  filter highs <= 0 | reduce count_lows = count()
)
```

_Example 2: conditional forking of the flowgraph with if/else logic in a function_

```juttle
function is_high(v) {
  if (v > 5) {
    return true;
  }
  else {
    return false;
  }
}

emit -from :-1m: -limit 10 | put value=count() 
| put high = is_high(value)
| (
  filter high = true | reduce count_highs = count();
  filter high = false | reduce count_lows = count()
)
```

_Example 3: use of a ternary operator inside the function_

```juttle
function is_high(v) {
  return (v > 5) ? true : false;
}

emit -from :-1m: -limit 10 
| put value=count() 
| put high = is_high(value)
| (
  filter high = true | reduce count_highs = count();
  filter high = false | reduce count_lows = count()
)
```

_Example 4: use of a ternary operator for conditional assignment in a flowgraph_

```juttle
emit -from :-1m: -limit 10 
| put value=count() 
| put high = (value > 5) ? true : false
| (
  filter high = true | reduce count_highs = count();
  filter high = false | reduce count_lows = count()
)
```

_Example 5: use of a reducer for conditional computation_

```juttle
reducer count_highs(v) {
  var count = 0;
  function update() {
    // field dereferencing to get value *v from field name v
    if (*v > 5) {
      count = count + 1;
    }
  }
  function result() {
    return count;
  }
}

reducer count_lows(v) {
  var count = 0;
  function update() {
    if (*v <= 5) {
      count = count + 1;
    }
  }
  function result() {
    return count;
  }
}

emit -from :-1m: -limit 10 | put value=count() 
| reduce high = count_highs(value), low = count_lows(value);
```

