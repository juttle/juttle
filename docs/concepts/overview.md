# Juttle Overview

This section walks through a few simple Juttle examples to demonstrate a bit of the language and how it works.

To begin with, here is the canonical hello world example in juttle:

```juttle
emit | put message = "Hello World!" | view table
```

Which outputs:

```
┌────────────────────────────────────┬──────────────────┐
│ time                               │ message          │
├────────────────────────────────────┼──────────────────┤
│ 2015-12-12T00:24:46.222Z           │ Hello World!     │
└────────────────────────────────────┴──────────────────┘
```

This example is the simplest possible Juttle flowgraph with the form:

```
source | processor | sink
```

In Juttle, *the basic unit of data is a point*. A point consists of a number of key/value pairs, where the keys are strings and the values are numbers, strings, times, booleans, etc. Points flow through flowgraphs and can be transformed, aggregated, or joined at each processing step.

In the simple example above, the following steps occurred:

1. The source [emit](../sources/emit.md), generates a single synthetic point with a timestamp of the current time.

1. The point is fed into the processor [put](../processors/put.md), which adds a field called message.

1. The point is then sent to a `table` [view](./views.md) which renders the result as the given table. Note that the specific views are actually not part of the Juttle language -- they are passed through to the calling environment, either the Juttle CLI (shown above) or an application environment like [outrigger](https://github.com/juttle/outrigger).

---

Let's make this example a bit more interesting:

```juttle
emit -from :2015-01-01: -to :2015-02-01: -every :1 day:
| reduce days = count()
| view table -title 'Days in January'
```

Results in:

```
Days in January
┌──────────┐
│ days     │
├──────────┤
│ 31       │
└──────────┘
```

Here we add a few more concepts. First, the `emit` source is configured with time options that will generate a data point for each day of January 2015. Each point is sent to the `reduce` processor using the `count` reducer that produces an aggregate sum of the number of points, and then emits a single value that shows the number of days in the month. Finally the `table` view is parameterized to include a title before displaying the results.

---

Juttle also supports basic programming language constructs like constants and functions:

```juttle
const days = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];

function getDay(i) {
    const offset = 3; // January 1, 2015 was a Thursday
    return days[(i + offset) % Array.length(days)];
}

emit -from :2015-01-01: -to :2015-02-01: -every :1 day:
| put i = count()
| put day = getDay(i)
| reduce count() by day
```

Results in:

```
┌──────────┬──────────┐
│ count    │ day      │
├──────────┼──────────┤
│ 5        │ Thu      │
├──────────┼──────────┤
│ 5        │ Fri      │
├──────────┼──────────┤
│ 5        │ Sat      │
├──────────┼──────────┤
│ 4        │ Sun      │
├──────────┼──────────┤
│ 4        │ Mon      │
├──────────┼──────────┤
│ 4        │ Tue      │
├──────────┼──────────┤
│ 4        │ Wed      │
└──────────┴──────────┘
```

In this case we've defined a constant array listing the days of the week, and a function called `getDay` that returns the weekday corresponding to the the given day of the month. Then we use the `day` field as a grouping field for reduce, and thereby count the number of occurrences of the given day of the week for the month of January. The result is implicitly put into a field named `count`, matching the name of the reducer that we used, and even though there is no explicit sink in the program, the runtime added an implicit `view table` to show the results in a table.

---

Finally, Juttle's dataflow model allows for more complicated flowgraphs than simple pipelines, and various operations can divide time into intervals and operate on batches of points within that interval instead of treating the full stream in its entirety:

```juttle
const fruits = [ 'apple', 'orange', 'banana' ];

emit -from :2015-01-01: -to :2015-02-02: -every :1d:
| put fruit = fruits[Math.floor(Math.random() * Array.length(fruits))]
| (
    reduce total = count() by fruit
    | view table -title 'Fruit popularity';

    batch :7 days:
    | reduce count() by fruit
    | sort count -desc
    | head 1
    | put week = (time - :2015-01-01:) / :7d:
    | keep week, fruit
    | view table -title 'Most popular fruit of the week';

  )
```

Results in something like the following:

```
Most popular fruit of the week
┌──────────┬──────────┐
│ fruit    │ week     │
├──────────┼──────────┤
│ orange   │ 1        │
├──────────┼──────────┤
│ orange   │ 2        │
├──────────┼──────────┤
│ banana   │ 3        │
├──────────┼──────────┤
│ orange   │ 4        │
├──────────┼──────────┤
│ banana   │ 5        │
└──────────┴──────────┘
Fruit popularity
┌──────────┬──────────┐
│ fruit    │ total    │
├──────────┼──────────┤
│ apple    │ 8        │
├──────────┼──────────┤
│ orange   │ 13       │
├──────────┼──────────┤
│ banana   │ 11       │
└──────────┴──────────┘
```

This example pulls together several additional concepts of Juttle.

First, the source emits a point for every day of the week and adds a field with a random name of a fruit. Then the flowgraph is forked using the `a | (b ; c)` syntax, which sends all points coming out of `a` to both `b` and `c`.

The first branch performs a simple count of the number of times each fruit was picked and sorts the output before sending to a table view.

The second branch creates a time window of 7 days, and for each batch, counts the number of occurrences of each fruit within the given batch, uses `sort` to rank by the count, uses `head` to pick first point, uses a `put` statement to add the week number within the month, `keep` to remove all fields but the week number and the fruit, and finally outputs a table which prints which was most popular fruit for the given week.

# Dig Deeper

See the in-depth [Tutorial](./juttle_tutorial.md) to learn more about the juttle language and explore a richer data set.

You can also learn more about the conceptual underpinnings of the [Juttle dataflow language](./dataflow.md) including how to work with time and batching, and how to string together, merge, split, and join flowgraphs for data processing.

The language supports various [programming constructs](./programming_constructs.md) such as variables, constants, functions, subgraphs, and modules to compose flowgraphs with less repetition and more clarity.

Juttle can interact with storage systems and other external data sources using [adapters](../adapters/index.md), some of which are both built into the distribution while others can be installed as external plugins.

Finally, the language contains the declarative framework for specifying client-side [views](./views.md) to control data visualization. The Juttle CLI includes simple terminal-based outputs for viewing data as a table or in raw encoding formats, but Juttle can also be used in conjunction with a visualization library like [juttle-viz](https://github.com/juttle/juttle-viz) for other charting.
