---
title: table | Juttle Language Reference
---

table
=====

Display the output as text in rows and columns.  
*This is the default output if no other is specified.*

```
view table -o {
   title: 'string',
   limit: n,
   columnOrder: 'col1',...'colN'
}

```

*or*
```
view table -title 'string' -limit n -columnOrder 'col1',...'colN'
```

See [Defining view parameters](../sinks/view.md#defining-view-parameters)
for an explanation of how sink parameters can be expressed as object literals.

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-title`  |  The title of the table  |  No; defaults to no title
`-limit`  |  The maximum number of total data points to display  |  No; defaults to the first 1000 to avoid consuming unbounded memory
`-progressive`  |  A boolean specifying whether the table should be displayed gradually as data arrives or all at once when the data stream ends  | No; defaults to `true`
`-columnOrder`  |  An array of field names specifying the order of the table columns from left to right. If the data stream includes unspecified fields, these are displayed to the right of the specified ones, in alphabetical order.  |  No; default is 'time','name','value' followed by the remaining columns in alphabetical order

_Example: Table with ordered columns_

```
{!docs/examples/sinks/table_column_order.juttle!}
```
