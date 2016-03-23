---
title: Select Module | Juttle Language Reference
---

# Select

Select points from a stream satisfying particular properties.

The functionality provided by this module is similar to built-in reducers such as `max(fieldA)`, `min(fieldB)`; the difference is that reducers would place a single specified field into the resulting data point, while subgraphs in the select module would forward the entire data point with all its fields.

Since all select methods are subgraphs, they can be used only in stream context.

## max - sub

```
... | select.max -field fieldname | ...
```

Options    |         Description        | Required?
---------- | -------------------------- | --------- :
`field`    | the field name to check    | Yes
`by`       | list of fields to group by | No, default: `[]`

Only the point with the largest value for the `field` name provided will be
forwarded.

## min - sub

```
... | select.min -field fieldname | ...
```

Options    |         Description        | Required?
---------- | -------------------------- | --------- :
`field`    | the field name to check    | Yes
`by`       | list of fields to group by | No, default: `[]`

Only the point with the smallest value for the `field` name provided will be
forwarded.

## percentile - sub

```
... | select.percentile -field fieldname -p percentile | ...
```

Options      |         Description           | Required?
------------ | ----------------------------- | --------- :
`field`      | the field name to check       | Yes
`percentile` | the expected percentile value | Yes
`by`         | list of fields to group by    | No, default: `[]`

Only the point with the expected percentile value for the `field` name
provided will be forwarded.

## median - sub

```
... | select.median -field fieldname  | ...
```

Options      |         Description           | Required?
------------ | ----------------------------- | --------- :
`field`      | the field name to check       | Yes
`by`         | list of fields to group by    | No, default: `[]`

Only the point with the exact median value for the `field` name
provided will be forwarded.

## top - sub

```
... | select.top -n number -by field | ...
```

Options  |                              Description                              | Required?
-------- | --------------------------------------------------------------------- | --------- :
`n`      | how many of the points with the highest values of `by` to keep        | Yes
`by`     | name of the field to sort by before figuring out the top `n` to keep  | Yes
`limit`  | the limit value to pass to sort if you happen to exceed the default limit | No, default: see [sort](../processors/sort.md) documentation

Sort the inbound stream by the `by` field and return the `n` points that have
highest value of the `by` field.

**Note** Since `top` uses `sort` to sort by the `by` field we drop the `time` field
from the individual points.

## bottom - sub

```
... | select.bottom -n number -by field | ...
```

Options  |                                Description                                | Required?
-------- | ------------------------------------------------------------------------- | --------- :
`n`      | how many of the points with the lowest values of `by` to keep             | Yes
`by`     | name of the field to sort by before figuring out the bottom `n` to keep   | Yes
`limit`  | the limit value to pass to sort if you happen to exceed the default limit | No, default: see [sort](../processors/sort.md) documentation

Sort the inbound stream by the `by` field and return the `n` points that have
lowest value of the `by` field.

**Note** Since `top` uses `sort` to sort by the `by` field we drop the `time` field
from the individual points.
