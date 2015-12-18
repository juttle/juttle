A paranoid workout of put reducer calling conventions.
====================================================
These are thoroughly unpleasant to read, but they are thorough.  Every
put environment in which a reducer can be invoked is covered here.  This
is for reducer lifecycle testing, not reducer correctness, so all
tests use avg (a reducer with expire()) and first (a reducer without
expire).

The basic set, fed a steady stream.
---------------------------------------------
* we don't test -acc true -over :dur:, or batched -over :dur:,
because -over performs a reset at every point in order to replay
the correct window of points, and its interaction with other resetting
behavior is unspecified.
* 3 is to verify assignment sequencing, and is skipped until PROD-3312
* 6 verifies windowed points are safe from overwriting

### Juttle
    emit -from Date.new(0) -limit 8
    | put ID=null, T = Duration.seconds(time - Date.new(0))
    | (
        put ID=1 | put a = avg(T), f = first(T);
        put ID=2 | put -over :4s: a = avg(T), f = first(T);
    //  put ID=3 | put -over :4s: a = avg(T), f = first(a), l = last(a);
        batch :2s:
        | (
            put ID=4 | put a = avg(T), f = first(T);
            put ID=5 | put -acc true a = avg(T), f = first(T);
        ) | unbatch;
        put ID=6 | put -over :4s: a = avg(T), T = T / 2;
    )
    | remove time
    | sort ID, T, a
    | view result

### Output
    { ID: 1, T: 0, a: 0, f: 0 }
    { ID: 1, T: 1, a: 0.5, f: 0 }
    { ID: 1, T: 2, a: 1, f: 0 }
    { ID: 1, T: 3, a: 1.5, f: 0 }
    { ID: 1, T: 4, a: 2, f: 0 }
    { ID: 1, T: 5, a: 2.5, f: 0 }
    { ID: 1, T: 6, a: 3, f: 0 }
    { ID: 1, T: 7, a: 3.5, f: 0 }
    { ID: 2, T: 0, a: 0, f: 0 }
    { ID: 2, T: 1, a: 0.5, f: 0 }
    { ID: 2, T: 2, a: 1, f: 0 }
    { ID: 2, T: 3, a: 1.5, f: 0 }
    { ID: 2, T: 4, a: 2.5, f: 1 }
    { ID: 2, T: 5, a: 3.5, f: 2 }
    { ID: 2, T: 6, a: 4.5, f: 3 }
    { ID: 2, T: 7, a: 5.5, f: 4 }
    { ID: 4, T: 0, a: 0, f: 0 }
    { ID: 4, T: 1, a: 0.5, f: 0 }
    { ID: 4, T: 2, a: 2, f: 2 }
    { ID: 4, T: 3, a: 2.5, f: 2 }
    { ID: 4, T: 4, a: 4, f: 4 }
    { ID: 4, T: 5, a: 4.5, f: 4 }
    { ID: 4, T: 6, a: 6, f: 6 }
    { ID: 4, T: 7, a: 6.5, f: 6 }
    { ID: 5, T: 0, a: 0, f: 0 }
    { ID: 5, T: 1, a: 0.5, f: 0 }
    { ID: 5, T: 2, a: 1, f: 0 }
    { ID: 5, T: 3, a: 1.5, f: 0 }
    { ID: 5, T: 4, a: 2, f: 0 }
    { ID: 5, T: 5, a: 2.5, f: 0 }
    { ID: 5, T: 6, a: 3, f: 0 }
    { ID: 5, T: 7, a: 3.5, f: 0 }
    { ID: 6, T: 0, a: 0 }
    { ID: 6, T: 0.5, a: 0.5 }
    { ID: 6, T: 1, a: 1 }
    { ID: 6, T: 1.5, a: 1.5 }
    { ID: 6, T: 2, a: 2.5 }
    { ID: 6, T: 2.5, a: 3.5 }
    { ID: 6, T: 3, a: 4.5 }
    { ID: 6, T: 3.5, a: 5.5 }


The basic set, fed a steady stream of two groups
---------------------------------------------
group A results are same as single-group stream, and group B's
results are same as group A's plus 10.
* 3 is to verify assignment sequencing, and is skipped until PROD-3312
* 6 verifies windowed points are safe from overwriting

### Juttle
    emit -from Date.new(0) -limit 8
    | put ID=null, T = Duration.seconds(time - Date.new(0))
    | ( put name = "A" ; put name = "B", T = T + 10)
    | (
        put ID=1 | put a = avg(T), f = first(T) by name;
        put ID=2 | put -over :4s: a = avg(T), f = first(T) by name;
    //  put ID=3 | put -over :4s: a = avg(T), f = first(a), l = last(a) by name;
        batch :2s:
        | (
            put ID=4 | put a = avg(T), f = first(T) by name;
            put ID=5 | put -acc true a = avg(T), f = first(T) by name;
        ) | unbatch;
        put ID=6 | put -over :4s: a = avg(T), T = T / 2 by name;
    )
    | remove time
    | sort ID, T, a
    | view result

### Output
    { ID: 1, T: 0, name: "A", a: 0, f: 0 }
    { ID: 1, T: 1, name: "A", a: 0.5, f: 0 }
    { ID: 1, T: 2, name: "A", a: 1, f: 0 }
    { ID: 1, T: 3, name: "A", a: 1.5, f: 0 }
    { ID: 1, T: 4, name: "A", a: 2, f: 0 }
    { ID: 1, T: 5, name: "A", a: 2.5, f: 0 }
    { ID: 1, T: 6, name: "A", a: 3, f: 0 }
    { ID: 1, T: 7, name: "A", a: 3.5, f: 0 }
    { ID: 1, T: 10, name: "B", a: 10, f: 10 }
    { ID: 1, T: 11, name: "B", a: 10.5, f: 10 }
    { ID: 1, T: 12, name: "B", a: 11, f: 10 }
    { ID: 1, T: 13, name: "B", a: 11.5, f: 10 }
    { ID: 1, T: 14, name: "B", a: 12, f: 10 }
    { ID: 1, T: 15, name: "B", a: 12.5, f: 10 }
    { ID: 1, T: 16, name: "B", a: 13, f: 10 }
    { ID: 1, T: 17, name: "B", a: 13.5, f: 10 }
    { ID: 2, T: 0, name: "A", a: 0, f: 0 }
    { ID: 2, T: 1, name: "A", a: 0.5, f: 0 }
    { ID: 2, T: 2, name: "A", a: 1, f: 0 }
    { ID: 2, T: 3, name: "A", a: 1.5, f: 0 }
    { ID: 2, T: 4, name: "A", a: 2.5, f: 1 }
    { ID: 2, T: 5, name: "A", a: 3.5, f: 2 }
    { ID: 2, T: 6, name: "A", a: 4.5, f: 3 }
    { ID: 2, T: 7, name: "A", a: 5.5, f: 4 }
    { ID: 2, T: 10, name: "B", a: 10, f: 10 }
    { ID: 2, T: 11, name: "B", a: 10.5, f: 10 }
    { ID: 2, T: 12, name: "B", a: 11, f: 10 }
    { ID: 2, T: 13, name: "B", a: 11.5, f: 10 }
    { ID: 2, T: 14, name: "B", a: 12.5, f: 11 }
    { ID: 2, T: 15, name: "B", a: 13.5, f: 12 }
    { ID: 2, T: 16, name: "B", a: 14.5, f: 13 }
    { ID: 2, T: 17, name: "B", a: 15.5, f: 14 }
    { ID: 4, T: 0, name: "A", a: 0, f: 0 }
    { ID: 4, T: 1, name: "A", a: 0.5, f: 0 }
    { ID: 4, T: 2, name: "A", a: 2, f: 2 }
    { ID: 4, T: 3, name: "A", a: 2.5, f: 2 }
    { ID: 4, T: 4, name: "A", a: 4, f: 4 }
    { ID: 4, T: 5, name: "A", a: 4.5, f: 4 }
    { ID: 4, T: 6, name: "A", a: 6, f: 6 }
    { ID: 4, T: 7, name: "A", a: 6.5, f: 6 }
    { ID: 4, T: 10, name: "B", a: 10, f: 10 }
    { ID: 4, T: 11, name: "B", a: 10.5, f: 10 }
    { ID: 4, T: 12, name: "B", a: 12, f: 12 }
    { ID: 4, T: 13, name: "B", a: 12.5, f: 12 }
    { ID: 4, T: 14, name: "B", a: 14, f: 14 }
    { ID: 4, T: 15, name: "B", a: 14.5, f: 14 }
    { ID: 4, T: 16, name: "B", a: 16, f: 16 }
    { ID: 4, T: 17, name: "B", a: 16.5, f: 16 }
    { ID: 5, T: 0, name: "A", a: 0, f: 0 }
    { ID: 5, T: 1, name: "A", a: 0.5, f: 0 }
    { ID: 5, T: 2, name: "A", a: 1, f: 0 }
    { ID: 5, T: 3, name: "A", a: 1.5, f: 0 }
    { ID: 5, T: 4, name: "A", a: 2, f: 0 }
    { ID: 5, T: 5, name: "A", a: 2.5, f: 0 }
    { ID: 5, T: 6, name: "A", a: 3, f: 0 }
    { ID: 5, T: 7, name: "A", a: 3.5, f: 0 }
    { ID: 5, T: 10, name: "B", a: 10, f: 10 }
    { ID: 5, T: 11, name: "B", a: 10.5, f: 10 }
    { ID: 5, T: 12, name: "B", a: 11, f: 10 }
    { ID: 5, T: 13, name: "B", a: 11.5, f: 10 }
    { ID: 5, T: 14, name: "B", a: 12, f: 10 }
    { ID: 5, T: 15, name: "B", a: 12.5, f: 10 }
    { ID: 5, T: 16, name: "B", a: 13, f: 10 }
    { ID: 5, T: 17, name: "B", a: 13.5, f: 10 }
    { ID: 6, T: 0, name: "A", a: 0 }
    { ID: 6, T: 0.5, name: "A", a: 0.5 }
    { ID: 6, T: 1, name: "A", a: 1 }
    { ID: 6, T: 1.5, name: "A", a: 1.5 }
    { ID: 6, T: 2, name: "A", a: 2.5 }
    { ID: 6, T: 2.5, name: "A", a: 3.5 }
    { ID: 6, T: 3, name: "A", a: 4.5 }
    { ID: 6, T: 3.5, name: "A", a: 5.5 }
    { ID: 6, T: 5, name: "B", a: 10 }
    { ID: 6, T: 5.5, name: "B", a: 10.5 }
    { ID: 6, T: 6, name: "B", a: 11 }
    { ID: 6, T: 6.5, name: "B", a: 11.5 }
    { ID: 6, T: 7, name: "B", a: 12.5 }
    { ID: 6, T: 7.5, name: "B", a: 13.5 }
    { ID: 6, T: 8, name: "B", a: 14.5 }
    { ID: 6, T: 8.5, name: "B", a: 15.5 }

The basic set, fed a stream sparser than batch and -over
---------------------------------------------
* 3 is to verify assignment sequencing, and is skipped until PROD-3312
* 6 verifies windowed points are safe from overwriting

### Juttle
    emit -from Date.new(0) -limit 4 -every :8s:
    | put ID=null, T = Duration.seconds(time - Date.new(0))
    | (
        put ID=1 | put a = avg(T), f = first(T);
        put ID=2 | put -over :4s: a = avg(T), f = first(T);
    //  put ID=3 | put -over :4s: a = avg(T), f = first(a), l = last(a);
        batch :2s:
        | (
            put ID=4 | put a = avg(T), f = first(T);
            put ID=5 | put -acc true a = avg(T), f = first(T);
        ) | unbatch;
        put ID=6 | put -over :4s: a = avg(T), T = T / 2;
    )
    | remove time
    | sort ID, T, a
    | view result

### Output
    { ID: 1, T: 0, a: 0, f: 0 }
    { ID: 1, T: 8, a: 4, f: 0 }
    { ID: 1, T: 16, a: 8, f: 0 }
    { ID: 1, T: 24, a: 12, f: 0 }
    { ID: 2, T: 0, a: 0, f: 0 }
    { ID: 2, T: 8, a: 8, f: 8 }
    { ID: 2, T: 16, a: 16, f: 16 }
    { ID: 2, T: 24, a: 24, f: 24 }
    { ID: 4, T: 0, a: 0, f: 0 }
    { ID: 4, T: 8, a: 8, f: 8 }
    { ID: 4, T: 16, a: 16, f: 16 }
    { ID: 4, T: 24, a: 24, f: 24 }
    { ID: 5, T: 0, a: 0, f: 0 }
    { ID: 5, T: 8, a: 4, f: 0 }
    { ID: 5, T: 16, a: 8, f: 0 }
    { ID: 5, T: 24, a: 12, f: 0 }
    { ID: 6, T: 0, a: 0 }
    { ID: 6, T: 4, a: 8 }
    { ID: 6, T: 8, a: 16 }
    { ID: 6, T: 12, a: 24 }

The basic set, fed a stream of two groups sparser than batch and -over.
---------------------------------------------
group A results are same as single-group stream, and group B"s
results are same as group As plus 10.
* 3 is to verify assignment sequencing, and is skipped until PROD-3312
* 6 verifies windowed points are safe from overwriting

### Juttle
    emit -from Date.new(0) -limit 4 -every :8s:
    | put ID=null, T = Duration.seconds(time - Date.new(0))
    | ( put name = "A" ; put name = "B", T = T + 10)
    | (
        put ID=1 | put a = avg(T), f = first(T) by name;
        put ID=2 | put -over :4s: a = avg(T), f = first(T) by name;
    //  put ID=3 | put -over :4s: a = avg(T), f = first(a), l = last(a) by name;
        batch :2s:
        | (
            put ID=4 | put a = avg(T), f = first(T) by name;
            put ID=5 | put -acc true a = avg(T), f = first(T) by name;
        ) | unbatch;
        put ID=6 | put -over :4s: a = avg(T), T = T / 2 by name;
    )
    | remove time
    | sort ID, T, a
    | view result

### Output
    { ID: 1, T: 0, name: "A", a: 0, f: 0 }
    { ID: 1, T: 8, name: "A", a: 4, f: 0 }
    { ID: 1, T: 10, name: "B", a: 10, f: 10 }
    { ID: 1, T: 16, name: "A", a: 8, f: 0 }
    { ID: 1, T: 18, name: "B", a: 14, f: 10 }
    { ID: 1, T: 24, name: "A", a: 12, f: 0 }
    { ID: 1, T: 26, name: "B", a: 18, f: 10 }
    { ID: 1, T: 34, name: "B", a: 22, f: 10 }
    { ID: 2, T: 0, name: "A", a: 0, f: 0 }
    { ID: 2, T: 8, name: "A", a: 8, f: 8 }
    { ID: 2, T: 10, name: "B", a: 10, f: 10 }
    { ID: 2, T: 16, name: "A", a: 16, f: 16 }
    { ID: 2, T: 18, name: "B", a: 18, f: 18 }
    { ID: 2, T: 24, name: "A", a: 24, f: 24 }
    { ID: 2, T: 26, name: "B", a: 26, f: 26 }
    { ID: 2, T: 34, name: "B", a: 34, f: 34 }
    { ID: 4, T: 0, name: "A", a: 0, f: 0 }
    { ID: 4, T: 8, name: "A", a: 8, f: 8 }
    { ID: 4, T: 10, name: "B", a: 10, f: 10 }
    { ID: 4, T: 16, name: "A", a: 16, f: 16 }
    { ID: 4, T: 18, name: "B", a: 18, f: 18 }
    { ID: 4, T: 24, name: "A", a: 24, f: 24 }
    { ID: 4, T: 26, name: "B", a: 26, f: 26 }
    { ID: 4, T: 34, name: "B", a: 34, f: 34 }
    { ID: 5, T: 0, name: "A", a: 0, f: 0 }
    { ID: 5, T: 8, name: "A", a: 4, f: 0 }
    { ID: 5, T: 10, name: "B", a: 10, f: 10 }
    { ID: 5, T: 16, name: "A", a: 8, f: 0 }
    { ID: 5, T: 18, name: "B", a: 14, f: 10 }
    { ID: 5, T: 24, name: "A", a: 12, f: 0 }
    { ID: 5, T: 26, name: "B", a: 18, f: 10 }
    { ID: 5, T: 34, name: "B", a: 22, f: 10 }
    { ID: 6, T: 0, name: "A", a: 0 }
    { ID: 6, T: 4, name: "A", a: 8 }
    { ID: 6, T: 5, name: "B", a: 10 }
    { ID: 6, T: 8, name: "A", a: 16 }
    { ID: 6, T: 9, name: "B", a: 18 }
    { ID: 6, T: 12, name: "A", a: 24 }
    { ID: 6, T: 13, name: "B", a: 26 }
    { ID: 6, T: 17, name: "B", a: 34 }
