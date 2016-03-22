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
