---
title: Read Source | Juttle Language Reference
---

read
====

Reads events or metrics from various remote backends via [adapters supported by Juttle](../adapters/index.md) and emits them into the flowgraph. The read source honors standard parameters as well as adapter-specific options.

```
read <adapter> [-from moment] [-to moment] [-last duration]
   [adapter-options] [filter-expression]
| ...
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`adapter`  | Name of the adapter to connect to the backend.  | Yes
`-from`  | Start time, inclusive: stream points whose time stamps are greater than or equal to the specified moment. <br><br>See [Time notation in Juttle](../reference/time.md) for syntax information.  | Depending on the adapter
`-to`  | End time, exclusive: stream points whose time stamps are less than the specified moment, which is less than or equal to :now: <br><br>See [Time notation in Juttle](../reference/time.md) for syntax information. <br><br>:information_source: `Note:` To stream live data only, omit -from and use `-to :end:`. To combine historical and live data, specify a -from value in the past and use `-to :end:`.  | Depending on the adapter
`-last`  |  Shorthand syntax for to `-from (:now: - duration) -to :now:`, this specifies a historical time window of the specified duration that ends at the present moment. |  No
`adapter-options`  | Additional `-<key> <value>` options specific to reading from the chosen backend, handled by the adapter.  |  See adapter documentation
`filter-expression`  |  A filter expression such as full-text search, field comparisons, or a combination, where multiple terms are joined with AND, OR, or NOT <br><br>See [Filtering](../concepts/filtering.md) for a full description. |  No

:information_source: Some adapters require a time range to be specified in the read with either `-from` / `-to` or `-last` and/or may have additional constraints on the valid time ranges for a read operation. See the adapter documentation for details.

_Example_

```
read influxdb -from :1 hour ago: -to :now: -db 'test' name='cpu' AND host~=/www.*/
| reduce max() by host
```
