---
title: join | Juttle Language Reference
---

join 
====

Create new points from the points of multiple input streams.

``` 
join
   [-nearest :duration: | -zip (true | :duration:) | -once true]
   [-table inputNumber, inputNumber, ...]
   [-outer inputNumber]
   [fieldName1, fieldName2,...fieldNameN]
```

It should be placed after a merge point in a parallel Juttle expression,
like this:

```
(... ; ...) | join ...
```

In its simplest form, join aligns its input streams by time stamp and
produces new output points by unioning the fields of successive matching
input points.

If used on a single stream, its points are grouped by their time stamp
or batch, and all points in a group are unioned to create an output
point. If optional joinFields are specified for the single stream, they
act like group-by fields, and there is an output point for each distinct
value of the joinFields among the points.

Options to `join` can cause it to
operate like an SQL relational join across multiple input streams, where
batches of points on an input are analogous to SQL tables, and
individual points are analogous to rows in those tables. An optional
list of fieldNames specifies relational join keys between the input
batches. When points with matching key values appear on each input, new
points are produced containing the union of these matching points'
fields.

Streaming joins are computed continually as points or batches of points
arrive at the inputs. When a stream is batched, all points in a batch
are treated as a group for joining (as if they all had the batch's
ending time stamp). For an unbatched stream, all points having the same
time stamp are treated as a batch. It is okay to join a batched stream
with an unbatched stream.

To require exact time stamp matching for batches to be joined, specify
time as a join key along with any other join keys. If time is not listed
as a join key, inexact time matches are allowed. Equivalent time stamps
will always be joined when they are present. A streaming one-to-one join
without exact time stamp matching is specified with -zip true or -zip
:duration:. A streaming many-to-one join with -nearest :duration: (or
simply as join with no options). A one-to-one join matches each
successive input batch with one on its other inputs, matching by nearest
time stamp, and drops any extra input batches that do not have matches.
A many-to-one join performs a similar matching, but will re-use an input
batch if it remains the best match. 
Both `-zip` and `-nearest` accept a duration limiting the
difference in time stamps allowed between matched batches, with :0:
behaving as if time had been specified as a join key. When time stamps
do not match exactly, an output point will be given the maximum time
stamp of its input points. A join without `-zip` or `-nearest` or time as a join key is
implicitly a `-nearest` join with no limiting duration.

A streaming join can treat some of its input batches as passive tables
with no associated time stamp. For example, this is useful for joining a
stream of event points having user IDs against a table of user names,
annotating the event point with its particular user name. 
The `-table` option lists which inputs are to be
treated in this way. A batch on a table input remains there until
updated by a later batch, and joins are always performed against the
most recently received complete batch. Joins are only triggered by the
arrival of new points on a timeful input. Because tables are timeless, a
join is never triggered by an update to a table, and no guarantees can
be made about precisely when (in stream time) an update will displace a
current table batch.

A non-streaming join over all points at once (at the end of the run) can
be specified by the `-once` flag. 
The join is not computed until all points have arrived at the inputs (that
is, it only makes sense for historic queries or bounded live queries).
Time stamps will be ignored unless the time field is specified as a join
field, which forces time stamps to be matched exactly between the input
sets.

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-nearest :duration:`  |   Streaming many-to-one join of each input point or batch with the points or batches on the other inputs having the nearest time stamp. <p>If one stream has fewer points than the others, its points may be joined multiple times as needed so that all points or batches on the other inputs participate in a join. The duration is the maximum acceptable difference in time stamps between matched groups of points, and will cause points to be dropped rather than joined if the gap in time is too large.</p><p>:information_source: `Note:` -nearest, -zip, and -once are mutually exclusive. If none are specified, the behavior is as if -nearest was specified with an unbounded duration.</p> |  No
`-zip true` \| `:duration:`  |   Streaming one-to-one join of each input point or batch with the points or batched on the other inputs having the nearest time stamp. <p>If one stream has more points than the others, extra points are dropped, such that any point is joined at most once. </p><p>If specified, the `duration` is the maximum acceptable difference in time stamps between matched groups of points. If instead `-zip true` is specified, there is no limit to the difference in time stamps. </p><p>:information_source: `Note:` -nearest, -zip, and -once are mutually exclusive. If none are specified, the behavior is as if -nearest was specified with an unbounded duration.  |  No
`-once true`  |  Non-streaming join over the entire set of input points, after all points have been received. <p>The time field may be specified as a join field if desired, giving results similar to a streaming one-to-one join with exactly matching time stamps. There is no analogue to the duration parameter of -zip and -nearest for non-streaming joins. </p><p>:information_source: `Note:`-nearest, -zip, and -once are mutually exclusive. If none are specified, the behavior is as if -nearest was specified with an unbounded duration.</p>  |  No
`-table`   |  Treat the specified input streams as passive tables with no associated time stamp; input streams are numbered top to bottom (or left to right) from 1 in the program. <p>:baby_symbol: `experimental:`  We're still working on this feature. Try it and see what you think, then [chat with us](http://www.jut.io) to provide feedback. </p> |  No
`-outer inputNumber`  |  Perform an outer join preserving the specified input stream. Input streams are numbered top to bottom (or left to right) from 1 in the program (that is, `-outer 1` specifies an outer left join where the first series in the flowgraph is preserved). When a point on the outer input does not have a matching join key on the other inputs, `-outer` forwards it unchanged, or partially joined against any matching inputs. Without `-outer`, an inner join is performed, which only produces a points when all inputs match.  |  No
`fieldnameN`  |   The fields to match when joining points.  |  No

_Example: merging metric points_

One use for join is with a source that provides several different
metrics as name/value pairs on separate points having identical time
stamps. Use join to merge these onto a single point for each time stamp:

```
{!docs/examples/processors/join_time.juttle!}
```

_Example: streaming one-to-one relational join_

In this example, two input streams containing distance and time
measurements are joined so that a rate can be computed:

```
{!docs/examples/processors/join_zip.juttle!}
```

The output is the result of the join: points containing a new metric:
"speed".

_Example: streaming many-to-one relational join_

In this example, two emits create two input streams for the join:

-   A stream of "parts" that include a board-ID
-   A "table" of board-id -&gt; board name mappings. The example strips
   their time stamps away so that they are treated as a group (similar
   results occur if they all have the same time stamp)

Joining the stream of parts against the table of board IDs creates
output points containing both the part name and its board name.

```
{!docs/examples/processors/join_timeless.juttle!}
```

The input to the join is two tables: 3 rows of board\_id-&gt;board
names, and 9 rows of parts (table commands are not included in the
Juttle above).

The output is the result of the join: points containing part names and
board names.

_Example: streaming four-way right outer join_

In this example, a stream of IDs (on points replayed by emit -points) is
simultaneously outer joined against three tables of personal
information.

Joining the stream of parts against the table of board IDs creates
output points containing both the part name and its board name.

```
{!docs/examples/processors/join_outer_right.juttle!}
```

