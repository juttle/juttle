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
`-progressive`  | Whether the table should display data gradually. If set to `true` or a positive duration, then the table starts displaying data after the specified amount of time (`:1s:` by default). If `false` then the table does not display anything until the program is done. | No; default is `true` if the program contains one view, `false` if there is more than one
`-columnOrder`  |  An array of field names specifying the order of the table columns from left to right. If the data stream includes unspecified fields, these are displayed to the right of the specified ones, in alphabetical order.  |  No; default is 'time','name','value' followed by the remaining columns in alphabetical order

_Example: Table with ordered columns_

```
{!docs/examples/sinks/table_column_order.juttle!}
```
