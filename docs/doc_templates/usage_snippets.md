---
title: Usage snippets | Juttle Language Reference
---

Usage snippets 
==============

Table rows you can copy to usage tables for common Juttle lexical elements


Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-every`   |  The interval at which to emit points, specified as a `:duration:` <p>See [Time notation in Juttle](../reference/time.md) for syntax information. </p>  |  No
`by`       |  One or more fields by which to group <p>See [Grouping fields with by](../concepts/dataflow.md#grouping). </p>  |  No
`-from`    | Stream points whose time stamps are greater than or equal to the specified `moment` <p>See [Time notation in Juttle](../reference/time.md) for syntax information.  </p>  |  Required only if `-to` is present; defaults to `:now:`
`-to`  |  Stream points whose time stamps are less than the specified moment, which is less than or equal to `:now:` <p>See [Time notation in Juttle](../reference/time.md) for syntax information.  </p><p>To stream live data only, omit `-from` and `-to`. To combine historical and live data, specify a `-from` value in the past and omit `-to` |  No; defaults to forever
`-id`  |  An identifier for this sink that serves as a handle for referencing the object in Juttle syntax; conceptually identical to a variable name  |  No
`-title`  |  The title for the user-visible output, if it has one; the value may be any valid Juttle expression that produces a string  |  No; defaults to the name field that is present in all metrics points
`-on`  |  The ID of the sink upon which this sink should be overlaid, if any  |  No
`-markerSize`  |  The pixel size of the circle for each point  |  No; defaults to 0 (circle not shown)
`-duration`  | The span of time to display, either in seconds (>=10) or as a [moment literal](../reference/time.md) <p>This feature is handy for comparing data from multiple intervals, such as this week's Web traffic versus last week's. It behaves like this: <ul><li>When querying historical data or historical plus live data (`-from :past_moment:` in your source node), the data is divided into intervals of -duration length and each one is overlaid onto the same chart. This is how you compare data from different intervals. </li><li>When querying live data only (`-from :now:` or `-to :future_time:`), display a moving time window of the specified interval.   |   No
`-limit`  |  The maximum number of total data points to display  |  No; defaults to the first 1000 to avoid consuming unbounded memory
`-keyField`  |  The field containing the name of the series to which each point belongs  |  Required when series is configured; otherwise Jut looks for unique [streams](../old_juttle/juttle_source_streams.md) and creates a series for each one <p>For simple metrics, the key field usually defaults to the [name](../old_ingest/data_fields.md#required_fields__name) field that is present in all metrics points </p>
`-timeField`  |  The field containing the time stamp  |  No; defaults to the `time` field
`-valueField` | The name of the field to use as the source for the numeric values  | No; defaults to the [value](../old_ingest/data_fields.md#required_fields__valuerow) field that is present in all metrics points.  If no `value` field is present, the first numeric field in the stream is used.
`-yScales.primary.tickFormat`  |  Customize the unit display for the Y axis, using the [d3 number formatting syntax](https://github.com/mbostock/d3/wiki/Formatting)  |  No
`-yScales.primary.minValue`  |  The value at the bottom of the Y scale  |  No; the default is automatically derived from your data
`-yScales.primary.maxValue`  |  The value at the top of the Y scale  |  No; the default is automatically derived from your data
`-yScales.primary.displayOnAxis`  |  Where to display the Y axis; must be exactly one of the following depending on whether your bar chart is oriented vertically or horizontally: <ul><li>left</li><li>right</li></ul> |  No; the default is left
`-series`  |  Configure one or more data series individually, using one or more items in an array with additional parameters, see [table below](#series-parameters)  |  No
`-facet.fields`  |  A comma-separated list of the fields on which facets are based  |  Required to enable faceting; omit this option to disable facets
`-facet.width`  |  The width configuration for facets, which may be a fluid or fixed width: <dl><dt>Fluid width:</dt><dd>A percentage or fraction defining the grid layout of facets, one of the following: '100%', '50%', '25%', '20%', '1/2', '1/3', '1/4', '1/5', '1/6'. For example, '1/2' means facets are displayed in two columns, as does '50%'.  </dd><dt>Fixed width:</dt><dd>A number larger than 150 defining the fixed pixel width of individual facets</dd></dl> |  No; defaults to '1/3'
`-facet.height`  |  A number larger than 80 defining the fixed pixel height of individual facets  |  No; the default height is calculated based on the width
`-label`  |  A short string to label this input  |  No
`-default`  |  The default value for this input  |  No
`-description`  |  A string to describe this input  |  No
`-items`  | An array of items to include in the drop-down list <p>You can display labels in the drop-down list that are different than the values that are ultimately assigned to the target const, by composing an array of label/value pairs, like this: </p><p>`-items [{label: "one", value: 1},{label: "two", value: 2}]` </p>  | No; if `-items` is not present then `-juttle` must be
`-juttle`  | A Juttle historical query that produces values to populate the list <p>When you use `-juttle`, you must also include `-valueField` which specifies the name of the data field that contains the value to be assigned to your const.</p><p>To display a different string than the one in the value field, use `-labelField` which specifies the name of another data field containing the string to display.</p>  | No; if `-juttle` is not present then `-items` must be
`timeunit`  |   A quoted literal string, one of the following: <ul><li>year</li><li>years</li><li>y</li><li>month</li><li>months</li><li>M</li><li>day</li><li>days</li><li>d</li><li>hour</li><li>hours</li><li>h</li><li>minute</li><li>minutes</li><li>m</li><li>second</li><li>seconds</li><li>s</li><li>millisecond</li><li>milliseconds</li><li>ms</li></ul> | No; some moment functions share this parameter  
   
#### Series Parameters
   
```   
   -series [   
   {   
   name : 'seriesname',   
   label : 'string',   
   yScale : 'primary|secondary',   
   color : 'color',   
   geom : 'line|bars'   
   },   
   {   
   name : 'someotherseries',   
   ...   
   }   
   ]
```

Series Parameter  | Description
----------------- | ------------  
`name`  | A series name that can be found in the specified `-keyField`; omit this option to configure all series in the data set
`label`  |  An optional string to override the scale label for this series   
`yScale`  |  The Y scale to use for this series, either "primary" or "secondary"; the default is "primary"   
`color`  |  The color to use for this series, specified with any [CSS3-supported hex or name value](http://www.w3.org/TR/css3-color/); if not specified, a color is selected from the built-in palette   
`geom`  |  Set this to 'bars' to display this series as bars on the time chart; the width of each bar is the interval between the current point and the previous point. The default is 'line'.  

