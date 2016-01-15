---
title: Read Source | Juttle Language Reference
---

read
====

Reads events or metrics from various remote backends via [adapters supported by Juttle](../adapters/index.md) and emits them into the flowgraph. The read source honors standard parameters as well as adapter-specific options.

```
read <adapter> -from moment -to moment [-last duration]
  [filter-expression] [adapter-options]
| ...
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`adapter`  | Name of the adapter to connect to the backend.  | Yes
`-from`  | Start time, inclusive: tream points whose time stamps are greater than or equal to the specified moment. <br><br>See [Time notation in Juttle](../reference/time.md) for syntax information.  | Required only if -to is present; defaults to :now:
`-to`  | End time, exclusive: stream points whose time stamps are less than the specified moment, which is less than or equal to :now: <br><br>See [Time notation in Juttle](../reference/time.md) for syntax information. <br><br>:information_source: `Note:` To stream live data only, omit -from and -to. To combine historical and live data, specify a -from value in the past and omit -to.  | No; defaults to forever
`-last`  |  An alternative to -from moment -to :now:, this specifies a historical time window that ends at the present moment.  |  No
`filter-expression`  |  A full-text search expression, a field comparison, or a combination of both, where multiple terms are joined with AND, OR, or NOT <br><br>See [Filtering](../concepts/filtering.md) for additional details. |  No
`adapter-options`  | Options specific to reading from the chosen backend, handled by the adapter.  |  See adapter documentation

_Example_

```
read influxdb -db "test" -measurements "cpu" -from :1 hour ago: -to :now:
| reduce max() by host
```

:bulb: `Tip:` In certain cases, the source might supply time in a different
field than `time` or in different units than seconds. The following example
shows how to extract and convert the time information, and then remove the
field which was previously storing it:

```
{!docs/examples/sources/set_time.juttle!}
```
