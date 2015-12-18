A paranoid workout of reduce reducer calling conventions.
====================================================
These are thoroughly unpleasant to read, but they are thorough.  Every
reduce environment in which a reducer can be invoked is covered here.  This
is for reducer lifecycle testing, not reducer correctness, so all
tests use avg (a reducer with expire()) and first (a reducer without
expire).

The basic set, fed a steady stream.
---------------------------------------------
* we don't test -reset false -over :dur: because -over controls
resetting in order to replay the correct window of points at each epoch.
* we don't test -reset false -over :dur: because -over controls
* 't' in the output is the batch end time as seconds.
* ID=last(ID) is a placeholder so that ID appears first in output, for readability

### Juttle
    emit -from Date.new(0) -limit 8
    | put T = Duration.seconds(time - Date.new(0))
    | (
        reduce ID=last(ID), a = avg(T), f = first(T) | put ID=1;
        reduce -every :2s: ID=last(ID), a = avg(T), f = first(T) | put ID=2;
        reduce -every :2s: -over :4s: ID=last(ID), a = avg(T), f = first(T) | put ID=3;
        reduce -reset false -every :2s: ID=last(ID), a = avg(T), f = first(T) | put ID=4;
        batch :2s:
        | (
            reduce ID=last(ID), a = avg(T), f = first(T) | put ID=5;
            reduce -over :4s: ID=last(ID), a = avg(T), f = first(T) | put ID=6;
            reduce -reset false ID=last(ID), a = avg(T), f = first(T) | put ID=7;
        ) | unbatch
    )
    | put t = (time != null) ? Duration.seconds(time - Date.new(0)) : 0
    | sort ID, t, a
    | view result

### Output
    { ID: 1, a: 3.5, f: 0, t: 0 }
    { ID: 2, a: 0.5, f: 0, t: 2 }
    { ID: 2, a: 2.5, f: 2, t: 4 }
    { ID: 2, a: 4.5, f: 4, t: 6 }
    { ID: 2, a: 6.5, f: 6, t: 8 }
    { ID: 3, a: 0.5, f: 0, t: 2 }
    { ID: 3, a: 1.5, f: 0, t: 4 }
    { ID: 3, a: 3.5, f: 2, t: 6 }
    { ID: 3, a: 5.5, f: 4, t: 8 }
    { ID: 4, a: 0.5, f: 0, t: 2 }
    { ID: 4, a: 1.5, f: 0, t: 4 }
    { ID: 4, a: 2.5, f: 0, t: 6 }
    { ID: 4, a: 3.5, f: 0, t: 8 }
    { ID: 5, a: 0.5, f: 0, t: 2 }
    { ID: 5, a: 2.5, f: 2, t: 4 }
    { ID: 5, a: 4.5, f: 4, t: 6 }
    { ID: 5, a: 6.5, f: 6, t: 8 }
    { ID: 6, a: 0.5, f: 0, t: 2 }
    { ID: 6, a: 1.5, f: 0, t: 4 }
    { ID: 6, a: 3.5, f: 2, t: 6 }
    { ID: 6, a: 5.5, f: 4, t: 8 }
    { ID: 7, a: 0.5, f: 0, t: 2 }
    { ID: 7, a: 1.5, f: 0, t: 4 }
    { ID: 7, a: 2.5, f: 0, t: 6 }
    { ID: 7, a: 3.5, f: 0, t: 8 }

The basic set, fed a steady stream of two groups
-------------------------------------------------
group A results are same as single-group stream, and group B's
results are same as group A's plus 10.

### Juttle
    emit -from Date.new(0) -limit 8
    | put T = Duration.seconds(time - Date.new(0))
    | ( put name = "A" ; put name = "B", T = T + 10)
    | (
        reduce ID=last(ID), a = avg(T), f = first(T) by name | put ID=1;
        reduce -every :2s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=2 ;
        reduce -every :2s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=8 ;
        reduce -every :2s: -over :4s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=3;
        reduce -every :2s: -over :4s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=9;
        reduce -reset false -every :2s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=4;
        batch :2s:
        | (
            reduce ID=last(ID), a = avg(T), f = first(T) by name | put ID=5;
            reduce -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=10;
            reduce -over :4s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=6;
            reduce -over :4s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=11;
            reduce -reset false ID=last(ID), a = avg(T), f = first(T) by name | put ID=7;
        ) | unbatch
    )
    | put t = (time != null) ? Duration.seconds(time - Date.new(0)) : 0
    | sort ID, t, a, name
    | view result

### Output
    { name: "A", ID: 1, a: 3.5, f: 0, t: 0 }
    { name: "B", ID: 1, a: 13.5, f: 10, t: 0 }
    { name: "A", ID: 2, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 2, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 2, a: 2.5, f: 2, t: 4 }
    { name: "B", ID: 2, a: 12.5, f: 12, t: 4 }
    { name: "A", ID: 2, a: 4.5, f: 4, t: 6 }
    { name: "B", ID: 2, a: 14.5, f: 14, t: 6 }
    { name: "A", ID: 2, a: 6.5, f: 6, t: 8 }
    { name: "B", ID: 2, a: 16.5, f: 16, t: 8 }
    { name: "A", ID: 3, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 3, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 3, a: 1.5, f: 0, t: 4 }
    { name: "B", ID: 3, a: 11.5, f: 10, t: 4 }
    { name: "A", ID: 3, a: 3.5, f: 2, t: 6 }
    { name: "B", ID: 3, a: 13.5, f: 12, t: 6 }
    { name: "A", ID: 3, a: 5.5, f: 4, t: 8 }
    { name: "B", ID: 3, a: 15.5, f: 14, t: 8 }
    { name: "A", ID: 4, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 4, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 4, a: 1.5, f: 0, t: 4 }
    { name: "B", ID: 4, a: 11.5, f: 10, t: 4 }
    { name: "A", ID: 4, a: 2.5, f: 0, t: 6 }
    { name: "B", ID: 4, a: 12.5, f: 10, t: 6 }
    { name: "A", ID: 4, a: 3.5, f: 0, t: 8 }
    { name: "B", ID: 4, a: 13.5, f: 10, t: 8 }
    { name: "A", ID: 5, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 5, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 5, a: 2.5, f: 2, t: 4 }
    { name: "B", ID: 5, a: 12.5, f: 12, t: 4 }
    { name: "A", ID: 5, a: 4.5, f: 4, t: 6 }
    { name: "B", ID: 5, a: 14.5, f: 14, t: 6 }
    { name: "A", ID: 5, a: 6.5, f: 6, t: 8 }
    { name: "B", ID: 5, a: 16.5, f: 16, t: 8 }
    { name: "A", ID: 6, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 6, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 6, a: 1.5, f: 0, t: 4 }
    { name: "B", ID: 6, a: 11.5, f: 10, t: 4 }
    { name: "A", ID: 6, a: 3.5, f: 2, t: 6 }
    { name: "B", ID: 6, a: 13.5, f: 12, t: 6 }
    { name: "A", ID: 6, a: 5.5, f: 4, t: 8 }
    { name: "B", ID: 6, a: 15.5, f: 14, t: 8 }
    { name: "A", ID: 7, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 7, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 7, a: 1.5, f: 0, t: 4 }
    { name: "B", ID: 7, a: 11.5, f: 10, t: 4 }
    { name: "A", ID: 7, a: 2.5, f: 0, t: 6 }
    { name: "B", ID: 7, a: 12.5, f: 10, t: 6 }
    { name: "A", ID: 7, a: 3.5, f: 0, t: 8 }
    { name: "B", ID: 7, a: 13.5, f: 10, t: 8 }
    { name: "A", ID: 8, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 8, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 8, a: 2.5, f: 2, t: 4 }
    { name: "B", ID: 8, a: 12.5, f: 12, t: 4 }
    { name: "A", ID: 8, a: 4.5, f: 4, t: 6 }
    { name: "B", ID: 8, a: 14.5, f: 14, t: 6 }
    { name: "A", ID: 8, a: 6.5, f: 6, t: 8 }
    { name: "B", ID: 8, a: 16.5, f: 16, t: 8 }
    { name: "A", ID: 9, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 9, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 9, a: 1.5, f: 0, t: 4 }
    { name: "B", ID: 9, a: 11.5, f: 10, t: 4 }
    { name: "A", ID: 9, a: 3.5, f: 2, t: 6 }
    { name: "B", ID: 9, a: 13.5, f: 12, t: 6 }
    { name: "A", ID: 9, a: 5.5, f: 4, t: 8 }
    { name: "B", ID: 9, a: 15.5, f: 14, t: 8 }
    { name: "A", ID: 10, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 10, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 10, a: 2.5, f: 2, t: 4 }
    { name: "B", ID: 10, a: 12.5, f: 12, t: 4 }
    { name: "A", ID: 10, a: 4.5, f: 4, t: 6 }
    { name: "B", ID: 10, a: 14.5, f: 14, t: 6 }
    { name: "A", ID: 10, a: 6.5, f: 6, t: 8 }
    { name: "B", ID: 10, a: 16.5, f: 16, t: 8 }
    { name: "A", ID: 11, a: 0.5, f: 0, t: 2 }
    { name: "B", ID: 11, a: 10.5, f: 10, t: 2 }
    { name: "A", ID: 11, a: 1.5, f: 0, t: 4 }
    { name: "B", ID: 11, a: 11.5, f: 10, t: 4 }
    { name: "A", ID: 11, a: 3.5, f: 2, t: 6 }
    { name: "B", ID: 11, a: 13.5, f: 12, t: 6 }
    { name: "A", ID: 11, a: 5.5, f: 4, t: 8 }
    { name: "B", ID: 11, a: 15.5, f: 14, t: 8 }

The basic set, fed a stream sparser than -every but not -over
-------------------------------------------------------------
an empty epoch might not be empty when it is windowed over a longer stretch of time.
because these reduces are not groupby, reducers are run every epoch, even for an empty window.
* 't' in the output is the batch end time as seconds.
ID=last(ID) is a placeholder so that ID appears first in output, for readability

### Juttle
    emit -from Date.new(0) -limit 4 -every :4s:
    | put T = Duration.seconds(time - Date.new(0))
    | (
        reduce ID=last(ID), a = avg(T), f = first(T) | put ID=1;
        reduce -every :2s: ID=last(ID), a = avg(T), f = first(T) | put ID=2;
        reduce -every :2s: -over :4s: ID=last(ID), a = avg(T), f = first(T) | put ID=3;
        reduce -reset false -every :2s: ID=last(ID), a = avg(T), f = first(T) | put ID=4;
        batch :2s:
        | (
            reduce ID=last(ID), a = avg(T), f = first(T) | put ID=5;
            reduce -over :4s: ID=last(ID), a = avg(T), f = first(T) | put ID=6;
            reduce -reset false ID=last(ID), a = avg(T), f = first(T) | put ID=7;
        ) | unbatch
    )
    | put t = (time != null) ? Duration.seconds(time - Date.new(0)) : 0
    | sort ID, t, a
    | view result

### Output
    { ID: 1, a: 6, f: 0, t: 0 }
    { ID: 2, a: 0, f: 0, t: 2 }
    { ID: 2, a: null, f: null, t: 4 }
    { ID: 2, a: 4, f: 4, t: 6 }
    { ID: 2, a: null, f: null, t: 8 }
    { ID: 2, a: 8, f: 8, t: 10 }
    { ID: 2, a: null, f: null, t: 12 }
    { ID: 2, a: 12, f: 12, t: 14 }
    { ID: 3, a: 0, f: 0, t: 2 }
    { ID: 3, a: 0, f: 0, t: 4 }
    { ID: 3, a: 4, f: 4, t: 6 }
    { ID: 3, a: 4, f: 4, t: 8 }
    { ID: 3, a: 8, f: 8, t: 10 }
    { ID: 3, a: 8, f: 8, t: 12 }
    { ID: 3, a: 12, f: 12, t: 14 }
    { ID: 4, a: 0, f: 0, t: 2 }
    { ID: 4, a: 0, f: 0, t: 4 }
    { ID: 4, a: 2, f: 0, t: 6 }
    { ID: 4, a: 2, f: 0, t: 8 }
    { ID: 4, a: 4, f: 0, t: 10 }
    { ID: 4, a: 4, f: 0, t: 12 }
    { ID: 4, a: 6, f: 0, t: 14 }
    { ID: 5, a: 0, f: 0, t: 2 }
    { ID: 5, a: null, f: null, t: 4 }
    { ID: 5, a: 4, f: 4, t: 6 }
    { ID: 5, a: null, f: null, t: 8 }
    { ID: 5, a: 8, f: 8, t: 10 }
    { ID: 5, a: null, f: null, t: 12 }
    { ID: 5, a: 12, f: 12, t: 14 }
    { ID: 6, a: 0, f: 0, t: 2 }
    { ID: 6, a: 0, f: 0, t: 4 }
    { ID: 6, a: 4, f: 4, t: 6 }
    { ID: 6, a: 4, f: 4, t: 8 }
    { ID: 6, a: 8, f: 8, t: 10 }
    { ID: 6, a: 8, f: 8, t: 12 }
    { ID: 6, a: 12, f: 12, t: 14 }
    { ID: 7, a: 0, f: 0, t: 2 }
    { ID: 7, a: 0, f: 0, t: 4 }
    { ID: 7, a: 2, f: 0, t: 6 }
    { ID: 7, a: 2, f: 0, t: 8 }
    { ID: 7, a: 4, f: 0, t: 10 }
    { ID: 7, a: 4, f: 0, t: 12 }
    { ID: 7, a: 6, f: 0, t: 14 }

The basic set, fed a stream of two groups sparser than -every but not -over.
--------------------------------------------------------------------------
an empty epoch might not be empty when it is windowed over a longer stretch of time.
for non empty windows, group A results are same as single-group stream, and group B's
results are same as group A's plus 10.
Unlike the single stream case, empty window groups should not be run nor empties reported,
because the group will be forgotten when it no longer has data. The asymmetry is because
a group witness affects reset/teardown, and this is not true in a non-groupby setting

### Juttle
    emit -from Date.new(0) -limit 4 -every :4s:
    | put T = Duration.seconds(time - Date.new(0))
    | ( put name = "A" ; put name = "B", T = T + 10)
    | (
        reduce ID=last(ID), a = avg(T), f = first(T) by name | put ID=1;
        reduce -every :2s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=2;
        reduce -every :2s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=8 ;
        reduce -every :2s: -over :4s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=3;
        reduce -every :2s: -over :4s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=9;
        reduce -reset false -every :2s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=4;
        batch :2s:
        | (
            reduce ID=last(ID), a = avg(T), f = first(T) by name | put ID=5;
            reduce -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=10;
            reduce -over :4s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=6;
            reduce -over :4s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=11;
            reduce -reset false ID=last(ID), a = avg(T), f = first(T) by name | put ID=7;
        ) | unbatch
    )
    | put t = (time != null) ? Duration.seconds(time - Date.new(0)) : 0
    | sort ID, t, a, name
    | view result

### Output
    { name: "A", ID: 1, a: 6, f: 0, t: 0 }
    { name: "B", ID: 1, a: 16, f: 10, t: 0 }
    { name: "A", ID: 2, a: 0, f: 0, t: 2 }
    { name: "B", ID: 2, a: 10, f: 10, t: 2 }
    { name: "A", ID: 2, a: 4, f: 4, t: 6 }
    { name: "B", ID: 2, a: 14, f: 14, t: 6 }
    { name: "A", ID: 2, a: 8, f: 8, t: 10 }
    { name: "B", ID: 2, a: 18, f: 18, t: 10 }
    { name: "A", ID: 2, a: 12, f: 12, t: 14 }
    { name: "B", ID: 2, a: 22, f: 22, t: 14 }
    { name: "A", ID: 3, a: 0, f: 0, t: 2 }
    { name: "B", ID: 3, a: 10, f: 10, t: 2 }
    { name: "A", ID: 3, a: 0, f: 0, t: 4 }
    { name: "B", ID: 3, a: 10, f: 10, t: 4 }
    { name: "A", ID: 3, a: 4, f: 4, t: 6 }
    { name: "B", ID: 3, a: 14, f: 14, t: 6 }
    { name: "A", ID: 3, a: 4, f: 4, t: 8 }
    { name: "B", ID: 3, a: 14, f: 14, t: 8 }
    { name: "A", ID: 3, a: 8, f: 8, t: 10 }
    { name: "B", ID: 3, a: 18, f: 18, t: 10 }
    { name: "A", ID: 3, a: 8, f: 8, t: 12 }
    { name: "B", ID: 3, a: 18, f: 18, t: 12 }
    { name: "A", ID: 3, a: 12, f: 12, t: 14 }
    { name: "B", ID: 3, a: 22, f: 22, t: 14 }
    { name: "A", ID: 4, a: 0, f: 0, t: 2 }
    { name: "B", ID: 4, a: 10, f: 10, t: 2 }
    { name: "A", ID: 4, a: 0, f: 0, t: 4 }
    { name: "B", ID: 4, a: 10, f: 10, t: 4 }
    { name: "A", ID: 4, a: 2, f: 0, t: 6 }
    { name: "B", ID: 4, a: 12, f: 10, t: 6 }
    { name: "A", ID: 4, a: 2, f: 0, t: 8 }
    { name: "B", ID: 4, a: 12, f: 10, t: 8 }
    { name: "A", ID: 4, a: 4, f: 0, t: 10 }
    { name: "B", ID: 4, a: 14, f: 10, t: 10 }
    { name: "A", ID: 4, a: 4, f: 0, t: 12 }
    { name: "B", ID: 4, a: 14, f: 10, t: 12 }
    { name: "A", ID: 4, a: 6, f: 0, t: 14 }
    { name: "B", ID: 4, a: 16, f: 10, t: 14 }
    { name: "A", ID: 5, a: 0, f: 0, t: 2 }
    { name: "B", ID: 5, a: 10, f: 10, t: 2 }
    { name: "A", ID: 5, a: 4, f: 4, t: 6 }
    { name: "B", ID: 5, a: 14, f: 14, t: 6 }
    { name: "A", ID: 5, a: 8, f: 8, t: 10 }
    { name: "B", ID: 5, a: 18, f: 18, t: 10 }
    { name: "A", ID: 5, a: 12, f: 12, t: 14 }
    { name: "B", ID: 5, a: 22, f: 22, t: 14 }
    { name: "A", ID: 6, a: 0, f: 0, t: 2 }
    { name: "B", ID: 6, a: 10, f: 10, t: 2 }
    { name: "A", ID: 6, a: 0, f: 0, t: 4 }
    { name: "B", ID: 6, a: 10, f: 10, t: 4 }
    { name: "A", ID: 6, a: 4, f: 4, t: 6 }
    { name: "B", ID: 6, a: 14, f: 14, t: 6 }
    { name: "A", ID: 6, a: 4, f: 4, t: 8 }
    { name: "B", ID: 6, a: 14, f: 14, t: 8 }
    { name: "A", ID: 6, a: 8, f: 8, t: 10 }
    { name: "B", ID: 6, a: 18, f: 18, t: 10 }
    { name: "A", ID: 6, a: 8, f: 8, t: 12 }
    { name: "B", ID: 6, a: 18, f: 18, t: 12 }
    { name: "A", ID: 6, a: 12, f: 12, t: 14 }
    { name: "B", ID: 6, a: 22, f: 22, t: 14 }
    { name: "A", ID: 7, a: 0, f: 0, t: 2 }
    { name: "B", ID: 7, a: 10, f: 10, t: 2 }
    { name: "A", ID: 7, a: 0, f: 0, t: 4 }
    { name: "B", ID: 7, a: 10, f: 10, t: 4 }
    { name: "A", ID: 7, a: 2, f: 0, t: 6 }
    { name: "B", ID: 7, a: 12, f: 10, t: 6 }
    { name: "A", ID: 7, a: 2, f: 0, t: 8 }
    { name: "B", ID: 7, a: 12, f: 10, t: 8 }
    { name: "A", ID: 7, a: 4, f: 0, t: 10 }
    { name: "B", ID: 7, a: 14, f: 10, t: 10 }
    { name: "A", ID: 7, a: 4, f: 0, t: 12 }
    { name: "B", ID: 7, a: 14, f: 10, t: 12 }
    { name: "A", ID: 7, a: 6, f: 0, t: 14 }
    { name: "B", ID: 7, a: 16, f: 10, t: 14 }
    { name: "A", ID: 8, a: 0, f: 0, t: 2 }
    { name: "B", ID: 8, a: 10, f: 10, t: 2 }
    { name: "A", ID: 8, a: null, f: null, t: 4 }
    { name: "B", ID: 8, a: null, f: null, t: 4 }
    { name: "A", ID: 8, a: 4, f: 4, t: 6 }
    { name: "B", ID: 8, a: 14, f: 14, t: 6 }
    { name: "A", ID: 8, a: null, f: null, t: 8 }
    { name: "B", ID: 8, a: null, f: null, t: 8 }
    { name: "A", ID: 8, a: 8, f: 8, t: 10 }
    { name: "B", ID: 8, a: 18, f: 18, t: 10 }
    { name: "A", ID: 8, a: null, f: null, t: 12 }
    { name: "B", ID: 8, a: null, f: null, t: 12 }
    { name: "A", ID: 8, a: 12, f: 12, t: 14 }
    { name: "B", ID: 8, a: 22, f: 22, t: 14 }
    { name: "A", ID: 9, a: 0, f: 0, t: 2 }
    { name: "B", ID: 9, a: 10, f: 10, t: 2 }
    { name: "A", ID: 9, a: 0, f: 0, t: 4 }
    { name: "B", ID: 9, a: 10, f: 10, t: 4 }
    { name: "A", ID: 9, a: 4, f: 4, t: 6 }
    { name: "B", ID: 9, a: 14, f: 14, t: 6 }
    { name: "A", ID: 9, a: 4, f: 4, t: 8 }
    { name: "B", ID: 9, a: 14, f: 14, t: 8 }
    { name: "A", ID: 9, a: 8, f: 8, t: 10 }
    { name: "B", ID: 9, a: 18, f: 18, t: 10 }
    { name: "A", ID: 9, a: 8, f: 8, t: 12 }
    { name: "B", ID: 9, a: 18, f: 18, t: 12 }
    { name: "A", ID: 9, a: 12, f: 12, t: 14 }
    { name: "B", ID: 9, a: 22, f: 22, t: 14 }
    { name: "A", ID: 10, a: 0, f: 0, t: 2 }
    { name: "B", ID: 10, a: 10, f: 10, t: 2 }
    { name: "A", ID: 10, a: null, f: null, t: 4 }
    { name: "B", ID: 10, a: null, f: null, t: 4 }
    { name: "A", ID: 10, a: 4, f: 4, t: 6 }
    { name: "B", ID: 10, a: 14, f: 14, t: 6 }
    { name: "A", ID: 10, a: null, f: null, t: 8 }
    { name: "B", ID: 10, a: null, f: null, t: 8 }
    { name: "A", ID: 10, a: 8, f: 8, t: 10 }
    { name: "B", ID: 10, a: 18, f: 18, t: 10 }
    { name: "A", ID: 10, a: null, f: null, t: 12 }
    { name: "B", ID: 10, a: null, f: null, t: 12 }
    { name: "A", ID: 10, a: 12, f: 12, t: 14 }
    { name: "B", ID: 10, a: 22, f: 22, t: 14 }
    { name: "A", ID: 11, a: 0, f: 0, t: 2 }
    { name: "B", ID: 11, a: 10, f: 10, t: 2 }
    { name: "A", ID: 11, a: 0, f: 0, t: 4 }
    { name: "B", ID: 11, a: 10, f: 10, t: 4 }
    { name: "A", ID: 11, a: 4, f: 4, t: 6 }
    { name: "B", ID: 11, a: 14, f: 14, t: 6 }
    { name: "A", ID: 11, a: 4, f: 4, t: 8 }
    { name: "B", ID: 11, a: 14, f: 14, t: 8 }
    { name: "A", ID: 11, a: 8, f: 8, t: 10 }
    { name: "B", ID: 11, a: 18, f: 18, t: 10 }
    { name: "A", ID: 11, a: 8, f: 8, t: 12 }
    { name: "B", ID: 11, a: 18, f: 18, t: 12 }
    { name: "A", ID: 11, a: 12, f: 12, t: 14 }
    { name: "B", ID: 11, a: 22, f: 22, t: 14 }

The basic set, fed a stream sparser than -every and -over
---------------------------------------------
because these reduces are not groupby, reducers are run every epoch, even for an empty window.
* 't' in the output is the batch end time as seconds.
ID=last(ID) is a placeholder so that ID appears first in output, for readability

### Juttle
    emit -from Date.new(0) -limit 4 -every :8s:
    | put T = Duration.seconds(time - Date.new(0))
    | (
        reduce ID=last(ID), a = avg(T), f = first(T) | put ID=1;
        reduce -every :2s: ID=last(ID), a = avg(T), f = first(T) | put ID=2;
        reduce -every :2s: -over :4s: ID=last(ID), a = avg(T), f = first(T) | put ID=3;
        reduce -reset false -every :2s: ID=last(ID), a = avg(T), f = first(T) | put ID=4;
        batch :2s:
        | (
            reduce ID=last(ID), a = avg(T), f = first(T) | put ID=5;
            reduce -over :4s: ID=last(ID), a = avg(T), f = first(T) | put ID=6;
            reduce -reset false ID=last(ID), a = avg(T), f = first(T) | put ID=7;
        ) | unbatch
    )
    | put t = (time != null) ? Duration.seconds(time - Date.new(0)) : 0
    | sort ID, t, a
    | view result

### Output
    { ID: 1, a: 12, f: 0, t: 0 }
    { ID: 2, a: 0, f: 0, t: 2 }
    { ID: 2, a: null, f: null, t: 4 }
    { ID: 2, a: null, f: null, t: 6 }
    { ID: 2, a: null, f: null, t: 8 }
    { ID: 2, a: 8, f: 8, t: 10 }
    { ID: 2, a: null, f: null, t: 12 }
    { ID: 2, a: null, f: null, t: 14 }
    { ID: 2, a: null, f: null, t: 16 }
    { ID: 2, a: 16, f: 16, t: 18 }
    { ID: 2, a: null, f: null, t: 20 }
    { ID: 2, a: null, f: null, t: 22 }
    { ID: 2, a: null, f: null, t: 24 }
    { ID: 2, a: 24, f: 24, t: 26 }
    { ID: 3, a: 0, f: 0, t: 2 }
    { ID: 3, a: 0, f: 0, t: 4 }
    { ID: 3, a: null, f: null, t: 6 }
    { ID: 3, a: null, f: null, t: 8 }
    { ID: 3, a: 8, f: 8, t: 10 }
    { ID: 3, a: 8, f: 8, t: 12 }
    { ID: 3, a: null, f: null, t: 14 }
    { ID: 3, a: null, f: null, t: 16 }
    { ID: 3, a: 16, f: 16, t: 18 }
    { ID: 3, a: 16, f: 16, t: 20 }
    { ID: 3, a: null, f: null, t: 22 }
    { ID: 3, a: null, f: null, t: 24 }
    { ID: 3, a: 24, f: 24, t: 26 }
    { ID: 4, a: 0, f: 0, t: 2 }
    { ID: 4, a: 0, f: 0, t: 4 }
    { ID: 4, a: 0, f: 0, t: 6 }
    { ID: 4, a: 0, f: 0, t: 8 }
    { ID: 4, a: 4, f: 0, t: 10 }
    { ID: 4, a: 4, f: 0, t: 12 }
    { ID: 4, a: 4, f: 0, t: 14 }
    { ID: 4, a: 4, f: 0, t: 16 }
    { ID: 4, a: 8, f: 0, t: 18 }
    { ID: 4, a: 8, f: 0, t: 20 }
    { ID: 4, a: 8, f: 0, t: 22 }
    { ID: 4, a: 8, f: 0, t: 24 }
    { ID: 4, a: 12, f: 0, t: 26 }
    { ID: 5, a: 0, f: 0, t: 2 }
    { ID: 5, a: null, f: null, t: 4 }
    { ID: 5, a: null, f: null, t: 6 }
    { ID: 5, a: null, f: null, t: 8 }
    { ID: 5, a: 8, f: 8, t: 10 }
    { ID: 5, a: null, f: null, t: 12 }
    { ID: 5, a: null, f: null, t: 14 }
    { ID: 5, a: null, f: null, t: 16 }
    { ID: 5, a: 16, f: 16, t: 18 }
    { ID: 5, a: null, f: null, t: 20 }
    { ID: 5, a: null, f: null, t: 22 }
    { ID: 5, a: null, f: null, t: 24 }
    { ID: 5, a: 24, f: 24, t: 26 }
    { ID: 6, a: 0, f: 0, t: 2 }
    { ID: 6, a: 0, f: 0, t: 4 }
    { ID: 6, a: null, f: null, t: 6 }
    { ID: 6, a: null, f: null, t: 8 }
    { ID: 6, a: 8, f: 8, t: 10 }
    { ID: 6, a: 8, f: 8, t: 12 }
    { ID: 6, a: null, f: null, t: 14 }
    { ID: 6, a: null, f: null, t: 16 }
    { ID: 6, a: 16, f: 16, t: 18 }
    { ID: 6, a: 16, f: 16, t: 20 }
    { ID: 6, a: null, f: null, t: 22 }
    { ID: 6, a: null, f: null, t: 24 }
    { ID: 6, a: 24, f: 24, t: 26 }
    { ID: 7, a: 0, f: 0, t: 2 }
    { ID: 7, a: 0, f: 0, t: 4 }
    { ID: 7, a: 0, f: 0, t: 6 }
    { ID: 7, a: 0, f: 0, t: 8 }
    { ID: 7, a: 4, f: 0, t: 10 }
    { ID: 7, a: 4, f: 0, t: 12 }
    { ID: 7, a: 4, f: 0, t: 14 }
    { ID: 7, a: 4, f: 0, t: 16 }
    { ID: 7, a: 8, f: 0, t: 18 }
    { ID: 7, a: 8, f: 0, t: 20 }
    { ID: 7, a: 8, f: 0, t: 22 }
    { ID: 7, a: 8, f: 0, t: 24 }
    { ID: 7, a: 12, f: 0, t: 26 }

The basic set, fed a stream of two groups sparser than -every and -over.
---------------------------------------------
you know the drill. nonempty group A results are same as single-group stream, and group B's
results are same as group A's plus 10.
Unlike the single stream case, empty group window results should not be reported
because the group should be forgotten when it no longer has data, unless -forget false.
The asymmetry is because a group witness affects reset/teardown, and this is not true in
a non-groupby setting.

### Juttle
    emit -from Date.new(0) -limit 4 -every :8s:
    | put T = Duration.seconds(time - Date.new(0))
    | ( put name = "A" ; put name = "B", T = T + 10)
    | (
        reduce ID=last(ID), a = avg(T), f = first(T) by name | put ID=1;
        reduce -every :2s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=2;
        reduce -every :2s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=8 ;
        reduce -every :2s: -over :4s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=3;
        reduce -every :2s: -over :4s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=9;
        reduce -reset false -every :2s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=4;
        batch :2s:
        | (
            reduce ID=last(ID), a = avg(T), f = first(T) by name | put ID=5;
            reduce -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=10;
            reduce -over :4s: ID=last(ID), a = avg(T), f = first(T) by name | put ID=6;
            reduce -over :4s: -forget false ID=last(ID), a = avg(T), f = first(T) by name | put ID=11;
            reduce -reset false ID=last(ID), a = avg(T), f = first(T) by name | put ID=7;
        ) | unbatch
    )
    | put t = (time != null) ? Duration.seconds(time - Date.new(0)) : 0
    | sort ID, t, a, name
    | view result

### Output
    { name: "A", ID: 1, a: 12, f: 0, t: 0 }
    { name: "B", ID: 1, a: 22, f: 10, t: 0 }
    { name: "A", ID: 2, a: 0, f: 0, t: 2 }
    { name: "B", ID: 2, a: 10, f: 10, t: 2 }
    { name: "A", ID: 2, a: 8, f: 8, t: 10 }
    { name: "B", ID: 2, a: 18, f: 18, t: 10 }
    { name: "A", ID: 2, a: 16, f: 16, t: 18 }
    { name: "B", ID: 2, a: 26, f: 26, t: 18 }
    { name: "A", ID: 2, a: 24, f: 24, t: 26 }
    { name: "B", ID: 2, a: 34, f: 34, t: 26 }
    { name: "A", ID: 3, a: 0, f: 0, t: 2 }
    { name: "B", ID: 3, a: 10, f: 10, t: 2 }
    { name: "A", ID: 3, a: 0, f: 0, t: 4 }
    { name: "B", ID: 3, a: 10, f: 10, t: 4 }
    { name: "A", ID: 3, a: 8, f: 8, t: 10 }
    { name: "B", ID: 3, a: 18, f: 18, t: 10 }
    { name: "A", ID: 3, a: 8, f: 8, t: 12 }
    { name: "B", ID: 3, a: 18, f: 18, t: 12 }
    { name: "A", ID: 3, a: 16, f: 16, t: 18 }
    { name: "B", ID: 3, a: 26, f: 26, t: 18 }
    { name: "A", ID: 3, a: 16, f: 16, t: 20 }
    { name: "B", ID: 3, a: 26, f: 26, t: 20 }
    { name: "A", ID: 3, a: 24, f: 24, t: 26 }
    { name: "B", ID: 3, a: 34, f: 34, t: 26 }
    { name: "A", ID: 4, a: 0, f: 0, t: 2 }
    { name: "B", ID: 4, a: 10, f: 10, t: 2 }
    { name: "A", ID: 4, a: 0, f: 0, t: 4 }
    { name: "B", ID: 4, a: 10, f: 10, t: 4 }
    { name: "A", ID: 4, a: 0, f: 0, t: 6 }
    { name: "B", ID: 4, a: 10, f: 10, t: 6 }
    { name: "A", ID: 4, a: 0, f: 0, t: 8 }
    { name: "B", ID: 4, a: 10, f: 10, t: 8 }
    { name: "A", ID: 4, a: 4, f: 0, t: 10 }
    { name: "B", ID: 4, a: 14, f: 10, t: 10 }
    { name: "A", ID: 4, a: 4, f: 0, t: 12 }
    { name: "B", ID: 4, a: 14, f: 10, t: 12 }
    { name: "A", ID: 4, a: 4, f: 0, t: 14 }
    { name: "B", ID: 4, a: 14, f: 10, t: 14 }
    { name: "A", ID: 4, a: 4, f: 0, t: 16 }
    { name: "B", ID: 4, a: 14, f: 10, t: 16 }
    { name: "A", ID: 4, a: 8, f: 0, t: 18 }
    { name: "B", ID: 4, a: 18, f: 10, t: 18 }
    { name: "A", ID: 4, a: 8, f: 0, t: 20 }
    { name: "B", ID: 4, a: 18, f: 10, t: 20 }
    { name: "A", ID: 4, a: 8, f: 0, t: 22 }
    { name: "B", ID: 4, a: 18, f: 10, t: 22 }
    { name: "A", ID: 4, a: 8, f: 0, t: 24 }
    { name: "B", ID: 4, a: 18, f: 10, t: 24 }
    { name: "A", ID: 4, a: 12, f: 0, t: 26 }
    { name: "B", ID: 4, a: 22, f: 10, t: 26 }
    { name: "A", ID: 5, a: 0, f: 0, t: 2 }
    { name: "B", ID: 5, a: 10, f: 10, t: 2 }
    { name: "A", ID: 5, a: 8, f: 8, t: 10 }
    { name: "B", ID: 5, a: 18, f: 18, t: 10 }
    { name: "A", ID: 5, a: 16, f: 16, t: 18 }
    { name: "B", ID: 5, a: 26, f: 26, t: 18 }
    { name: "A", ID: 5, a: 24, f: 24, t: 26 }
    { name: "B", ID: 5, a: 34, f: 34, t: 26 }
    { name: "A", ID: 6, a: 0, f: 0, t: 2 }
    { name: "B", ID: 6, a: 10, f: 10, t: 2 }
    { name: "A", ID: 6, a: 0, f: 0, t: 4 }
    { name: "B", ID: 6, a: 10, f: 10, t: 4 }
    { name: "A", ID: 6, a: 8, f: 8, t: 10 }
    { name: "B", ID: 6, a: 18, f: 18, t: 10 }
    { name: "A", ID: 6, a: 8, f: 8, t: 12 }
    { name: "B", ID: 6, a: 18, f: 18, t: 12 }
    { name: "A", ID: 6, a: 16, f: 16, t: 18 }
    { name: "B", ID: 6, a: 26, f: 26, t: 18 }
    { name: "A", ID: 6, a: 16, f: 16, t: 20 }
    { name: "B", ID: 6, a: 26, f: 26, t: 20 }
    { name: "A", ID: 6, a: 24, f: 24, t: 26 }
    { name: "B", ID: 6, a: 34, f: 34, t: 26 }
    { name: "A", ID: 7, a: 0, f: 0, t: 2 }
    { name: "B", ID: 7, a: 10, f: 10, t: 2 }
    { name: "A", ID: 7, a: 0, f: 0, t: 4 }
    { name: "B", ID: 7, a: 10, f: 10, t: 4 }
    { name: "A", ID: 7, a: 0, f: 0, t: 6 }
    { name: "B", ID: 7, a: 10, f: 10, t: 6 }
    { name: "A", ID: 7, a: 0, f: 0, t: 8 }
    { name: "B", ID: 7, a: 10, f: 10, t: 8 }
    { name: "A", ID: 7, a: 4, f: 0, t: 10 }
    { name: "B", ID: 7, a: 14, f: 10, t: 10 }
    { name: "A", ID: 7, a: 4, f: 0, t: 12 }
    { name: "B", ID: 7, a: 14, f: 10, t: 12 }
    { name: "A", ID: 7, a: 4, f: 0, t: 14 }
    { name: "B", ID: 7, a: 14, f: 10, t: 14 }
    { name: "A", ID: 7, a: 4, f: 0, t: 16 }
    { name: "B", ID: 7, a: 14, f: 10, t: 16 }
    { name: "A", ID: 7, a: 8, f: 0, t: 18 }
    { name: "B", ID: 7, a: 18, f: 10, t: 18 }
    { name: "A", ID: 7, a: 8, f: 0, t: 20 }
    { name: "B", ID: 7, a: 18, f: 10, t: 20 }
    { name: "A", ID: 7, a: 8, f: 0, t: 22 }
    { name: "B", ID: 7, a: 18, f: 10, t: 22 }
    { name: "A", ID: 7, a: 8, f: 0, t: 24 }
    { name: "B", ID: 7, a: 18, f: 10, t: 24 }
    { name: "A", ID: 7, a: 12, f: 0, t: 26 }
    { name: "B", ID: 7, a: 22, f: 10, t: 26 }
    { name: "A", ID: 8, a: 0, f: 0, t: 2 }
    { name: "B", ID: 8, a: 10, f: 10, t: 2 }
    { name: "A", ID: 8, a: null, f: null, t: 4 }
    { name: "B", ID: 8, a: null, f: null, t: 4 }
    { name: "A", ID: 8, a: null, f: null, t: 6 }
    { name: "B", ID: 8, a: null, f: null, t: 6 }
    { name: "A", ID: 8, a: null, f: null, t: 8 }
    { name: "B", ID: 8, a: null, f: null, t: 8 }
    { name: "A", ID: 8, a: 8, f: 8, t: 10 }
    { name: "B", ID: 8, a: 18, f: 18, t: 10 }
    { name: "A", ID: 8, a: null, f: null, t: 12 }
    { name: "B", ID: 8, a: null, f: null, t: 12 }
    { name: "A", ID: 8, a: null, f: null, t: 14 }
    { name: "B", ID: 8, a: null, f: null, t: 14 }
    { name: "A", ID: 8, a: null, f: null, t: 16 }
    { name: "B", ID: 8, a: null, f: null, t: 16 }
    { name: "A", ID: 8, a: 16, f: 16, t: 18 }
    { name: "B", ID: 8, a: 26, f: 26, t: 18 }
    { name: "A", ID: 8, a: null, f: null, t: 20 }
    { name: "B", ID: 8, a: null, f: null, t: 20 }
    { name: "A", ID: 8, a: null, f: null, t: 22 }
    { name: "B", ID: 8, a: null, f: null, t: 22 }
    { name: "A", ID: 8, a: null, f: null, t: 24 }
    { name: "B", ID: 8, a: null, f: null, t: 24 }
    { name: "A", ID: 8, a: 24, f: 24, t: 26 }
    { name: "B", ID: 8, a: 34, f: 34, t: 26 }
    { name: "A", ID: 9, a: 0, f: 0, t: 2 }
    { name: "B", ID: 9, a: 10, f: 10, t: 2 }
    { name: "A", ID: 9, a: 0, f: 0, t: 4 }
    { name: "B", ID: 9, a: 10, f: 10, t: 4 }
    { name: "A", ID: 9, a: null, f: null, t: 6 }
    { name: "B", ID: 9, a: null, f: null, t: 6 }
    { name: "A", ID: 9, a: null, f: null, t: 8 }
    { name: "B", ID: 9, a: null, f: null, t: 8 }
    { name: "A", ID: 9, a: 8, f: 8, t: 10 }
    { name: "B", ID: 9, a: 18, f: 18, t: 10 }
    { name: "A", ID: 9, a: 8, f: 8, t: 12 }
    { name: "B", ID: 9, a: 18, f: 18, t: 12 }
    { name: "A", ID: 9, a: null, f: null, t: 14 }
    { name: "B", ID: 9, a: null, f: null, t: 14 }
    { name: "A", ID: 9, a: null, f: null, t: 16 }
    { name: "B", ID: 9, a: null, f: null, t: 16 }
    { name: "A", ID: 9, a: 16, f: 16, t: 18 }
    { name: "B", ID: 9, a: 26, f: 26, t: 18 }
    { name: "A", ID: 9, a: 16, f: 16, t: 20 }
    { name: "B", ID: 9, a: 26, f: 26, t: 20 }
    { name: "A", ID: 9, a: null, f: null, t: 22 }
    { name: "B", ID: 9, a: null, f: null, t: 22 }
    { name: "A", ID: 9, a: null, f: null, t: 24 }
    { name: "B", ID: 9, a: null, f: null, t: 24 }
    { name: "A", ID: 9, a: 24, f: 24, t: 26 }
    { name: "B", ID: 9, a: 34, f: 34, t: 26 }
    { name: "A", ID: 10, a: 0, f: 0, t: 2 }
    { name: "B", ID: 10, a: 10, f: 10, t: 2 }
    { name: "A", ID: 10, a: null, f: null, t: 4 }
    { name: "B", ID: 10, a: null, f: null, t: 4 }
    { name: "A", ID: 10, a: null, f: null, t: 6 }
    { name: "B", ID: 10, a: null, f: null, t: 6 }
    { name: "A", ID: 10, a: null, f: null, t: 8 }
    { name: "B", ID: 10, a: null, f: null, t: 8 }
    { name: "A", ID: 10, a: 8, f: 8, t: 10 }
    { name: "B", ID: 10, a: 18, f: 18, t: 10 }
    { name: "A", ID: 10, a: null, f: null, t: 12 }
    { name: "B", ID: 10, a: null, f: null, t: 12 }
    { name: "A", ID: 10, a: null, f: null, t: 14 }
    { name: "B", ID: 10, a: null, f: null, t: 14 }
    { name: "A", ID: 10, a: null, f: null, t: 16 }
    { name: "B", ID: 10, a: null, f: null, t: 16 }
    { name: "A", ID: 10, a: 16, f: 16, t: 18 }
    { name: "B", ID: 10, a: 26, f: 26, t: 18 }
    { name: "A", ID: 10, a: null, f: null, t: 20 }
    { name: "B", ID: 10, a: null, f: null, t: 20 }
    { name: "A", ID: 10, a: null, f: null, t: 22 }
    { name: "B", ID: 10, a: null, f: null, t: 22 }
    { name: "A", ID: 10, a: null, f: null, t: 24 }
    { name: "B", ID: 10, a: null, f: null, t: 24 }
    { name: "A", ID: 10, a: 24, f: 24, t: 26 }
    { name: "B", ID: 10, a: 34, f: 34, t: 26 }
    { name: "A", ID: 11, a: 0, f: 0, t: 2 }
    { name: "B", ID: 11, a: 10, f: 10, t: 2 }
    { name: "A", ID: 11, a: 0, f: 0, t: 4 }
    { name: "B", ID: 11, a: 10, f: 10, t: 4 }
    { name: "A", ID: 11, a: null, f: null, t: 6 }
    { name: "B", ID: 11, a: null, f: null, t: 6 }
    { name: "A", ID: 11, a: null, f: null, t: 8 }
    { name: "B", ID: 11, a: null, f: null, t: 8 }
    { name: "A", ID: 11, a: 8, f: 8, t: 10 }
    { name: "B", ID: 11, a: 18, f: 18, t: 10 }
    { name: "A", ID: 11, a: 8, f: 8, t: 12 }
    { name: "B", ID: 11, a: 18, f: 18, t: 12 }
    { name: "A", ID: 11, a: null, f: null, t: 14 }
    { name: "B", ID: 11, a: null, f: null, t: 14 }
    { name: "A", ID: 11, a: null, f: null, t: 16 }
    { name: "B", ID: 11, a: null, f: null, t: 16 }
    { name: "A", ID: 11, a: 16, f: 16, t: 18 }
    { name: "B", ID: 11, a: 26, f: 26, t: 18 }
    { name: "A", ID: 11, a: 16, f: 16, t: 20 }
    { name: "B", ID: 11, a: 26, f: 26, t: 20 }
    { name: "A", ID: 11, a: null, f: null, t: 22 }
    { name: "B", ID: 11, a: null, f: null, t: 22 }
    { name: "A", ID: 11, a: null, f: null, t: 24 }
    { name: "B", ID: 11, a: null, f: null, t: 24 }
    { name: "A", ID: 11, a: 24, f: 24, t: 26 }
    { name: "B", ID: 11, a: 34, f: 34, t: 26 }
