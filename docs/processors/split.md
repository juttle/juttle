---
title: split | Juttle Language Reference
---

split 
=====

Split each incoming point, emitting one new point for each of the
specified fields in the original point.

``` 
split splitfield1,splitfield2,...
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`splitfield`  |   One or more fields on which to split the incoming points. <p>On each incoming point, split emits one point for each split field. In other words, if there are N split fields, then split emits N points for each incoming point.  </p>  |  No; the default splits on all fields except the name, value, and time fields.
`-arrays`  | Set this to "0" to prohibit splitting array-valued fields. <p>By default, when split encounters an array-valued split field on a point, it splits the array into individual values and generates a point for each of those values. </p>  |  No; default is 1

The resulting split points are constructed by adding a field called
"name" with the name of the split field and a field called "value" with
the value of the split field. All other fields are copied to the new
points. If you specify only one split field, then the output from each
data point is a single data point with the "name" and "value" fields set
to the specified split field. And if a split field contains an array,
then the output is exploded. See the examples below.

_Example: Split a single point on two fields_

```
{!docs/examples/processors/split_fields.juttle!}
```

Given this data point:

> { A: 5, B: 10, X: 'hello', Y: 'world', Z: 'boo', time: t }  

Yields these two data points as output:

> {"time": t, "X":"hello", "Y":"world", "Z":"boo", "name":"A", "value":5}  
> {"time": t, "X":"hello", "Y":"world", "Z":"boo", "name":"B", "value":10}  

_Split with no options_

```
{!docs/examples/processors/split_simple.juttle!}
```

Yields the following output:

> {"time": t, "name":"value", "value":"VALUE"}  
> {"time": t, "name":"wheels", "value":5}  
> {"time": t, "name":"shape", "value":"BENT"}  

_Explode an array_

```
{!docs/examples/processors/split_array.juttle!}
```

Yields the following output:

> {"time": t, "name":"a", "value":1}  
> {"time": t, "name":"a", "value":2}  
> {"time": t, "name":"a", "value":3}  
> {"time": t, "name":"b", "value":"foo"}  


