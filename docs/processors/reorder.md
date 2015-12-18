---
title: reorder | Juttle Language Reference
---

reorder 
=======

Buffer and reorder points based on their time fields.

``` 
reorder [-delay milliseconds] [-limit n]
```

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-delay`   | The duration of the buffer, in milliseconds  |  No; the default is 5000ms
`-limit`   | The number of points that are buffered. When the buffer is full, the oldest point (by time stamp) is passed through without delay.  |  No; the default is 100,000 points

If you encounter the following message while using this source, try increasing the value of the -delay parameter:   
    
> reorder dropping 2 point(s) that arrived late   
