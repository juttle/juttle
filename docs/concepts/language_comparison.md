# Comparison of Juttle primitives with other languages

If you are coming to Juttle from other data processing languages or libraries, this mapping of concepts and primitives may help. This is not an exhaustive list, and is meant only to assist in translating your prior knowledge; no value judgement is implied.

Terminology differs across languages/libraries, so let's start with that.

| Concept     | Juttle | Spark   |
| ----------- | ------ | ------- |
| Data set    | Data stream in the flowgraph | RDD (resilient distributed dataset) | 
| Element of the data set | Data point | Element |
| Field within the element | Field with name and value | Key/value pair |
| Operations that return a new data set | Processors | Transformations |
| Operations that produce output for the user or external system | Sinks | Actions |

Now let's look at the primitives provided by Juttle and others. For Spark, where necessary, Scala-like syntax is shown.

| Primitive | Juttle | Spark   |
| --------- | ------ | ------- | 
| Load data from file | `read file -file 'path'` | sc.textFile('path') | 
| Load data from other external storage | `read adapter ...` | ? (chapter 6) |
| Select subset of the data matching a filter | `read ... filter-expr`, or `read ... \ filter filter-expr` | rdd.filter(filter-function)
| Count data points | `reduce count()` | rdd.count() |
| Count how many times a given value appears | `reduce count() by field` | rdd.countByValue() | 
| Get a few data points | `(head N; tail N)` | rdd.take(N) |
| Get the top N items by value | `sort -desc field | head N` | rdd.top(N) |
| Get the entire data set | `read ...`  | rdd.collect() |
| Display the raw data | `view table`, or `view text` | rdd...foreach.println() |
| Write data out to file | `write file -file 'path'` | rdd.saveAsTextFile('path') |
| Compute a reduction of the data | `reduce y = reducer(x)` | rdd.reduce(function(x,y)) or rdd.fold(zeroValue)(function(x,y)) or rdd.aggregate |
| Specific reduction: average | `reduce avg(value)` | See [note 3](#note-3) |
| Apply given function to each element | `put y = reducer(x)`, or `reduce z = reducer(x)`, depending on desired outcome: field added to each element, or result returned | rdd.foreach(function) |
| Compute new field for each element of the dataset | `put y = x*x` | rdd.map(y => x*x) |
| Transpose fields of data points into separate data points | `put field = reducer() | split field` (the reverse operation is `pluck`) | rdd.flatMap(function) |
| Sample the dataset | See [note 2](note-2) | rdd.sample(withReplacement, fraction)
| Combine datasets into one | merge via `(flowgraph-1; flowgraph-2) | ...` | rdd.union(other-rdd) |
| Discard duplicates from the dataset | `uniq [what] by [group]` | rdd.distinct() |
| Find elements present in two datasets | `(flowgraph-1; flowgraph-2) | join fieldname` | rdd.intersection(other-rdd) |
| Remove elements from this dataset which are present in the other set | See [note 1](note-1) | rdd.subtract(other-rdd) |
| Make a Cartesian product of two datasets | See [note 1](note-1) | rdd.cartesian(other) |
| Cache the result of computation | Implicitly cached in memory for the duration of Juttle flowgraph | rdd.persist(where) |

###### Note 1
The set operations "subtract" and "cartesian" are not provided as Juttle primitives, but can be implemented as user-defined subroutines.

###### Note 2
Downsampling is provided as a timechart parameter in juttle-viz library. To sample a streaming dataset in the flowgraph, one can filter on modulo count, or modulo time, such as `put s = count()%10 | filter s = 0`.

###### Note 3
The Spark way to code up `reduce avg()` is complex enough to warrant its own section. The Scala code is most concise, Python would be a bit more verbose, and Java a lot more verbose:

```scala
val result = input.aggregate((0, 0))(
               (acc, value) => (acc._1 + value, acc._2 + 1),
               (acc1, acc2) => (acc1._1 + acc2._1, acc1._2 + acc2._2))
val avg = result._1 / result._2.toDouble
```


