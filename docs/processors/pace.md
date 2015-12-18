---
title: pace | Juttle Language Reference
---

pace 
====

Play back historic points in real time or as a multiple of the input's
natural speed. If the input is batched, thenpace emits one batch of
points at each output time. Otherwise it emits any points sharing the
next time stamp in the input sequence.

``` 
pace [-from :moment:] [-every :duration:] [-x multiple]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-from`  |  Shift the time stamp of the first point to this specified moment, and shift subsequent points by the same amount of time  |  No
`-every`  | The interval at which to emit points, specified as a `:duration:`. See [Time notation in Juttle](../reference/time.md) for syntax information.  |  No
`-x`  |  A multiple of the real-time pace of the input  |  No

The playback speed may be specified in one of two ways:

-   As a real-time interval between output times (`-every`)
-   As a multiple of the input's natural speed (`-x`)

If neither `-every` nor `-x` is specified, then playback occurs at a real-time rate.

If the input stream includes live points, then pace gradually
decelerates its historic playback to arrive smoothly at the real-time
rate for the live data.

_Example: Emit ten synthetic points and play them back in real time_

```
{!docs/examples/processors/pace.juttle!}
```

