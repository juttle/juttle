---
title: Juttle Tutorial | Juttle Language Reference
---

# Juttle Tutorial

[TOC]

This tutorial is meant for new users who have a basic understanding of Juttle, having read at a minimum the [Overview](overview.md).

## Setup

Juttle examples here assume that you have the `juttle` binary available, having done [installation](https://github.com/juttle/juttle/#installation):

```
npm install -g juttle
```

and that you have placed the [dataset](#dataset) in `/tmp/data.json` location.

For examples that generate visualizations in the browser, you need to have the [outrigger](https://github.com/juttle/outrigger) package installed:

```
npm install -g outrigger
```

and the outriggerd daemon running:

```
outriggerd &
```

To run a given example via outrigger client, save the Juttle code to a file, then execute:

```
outrigger-client browser --path '/tmp/example.juttle'
```

To run a given example via Juttle CLI (this only works for examples that don't attempt to output to charts), you can reference the saved file:

```
juttle '/tmp/example.juttle'
```

or simply launch the `juttle` shell, enter `<` for multiline mode, then paste the code followed by `.` on its own line, enter to execute.

We encourage you to run the provided examples and further experiment by modifying their Juttle code, but also provide screenshots of the expected output for cheaters.

## Dataset

This tutorial uses a subset of real data from the
[Github Archive](https://www.githubarchive.org/). A small dataset of the same format is provided [here](../examples/datasets/github_data.json) and all Juttle programs in this tutorial will work with it, but for more interesting data, download the 30MB version from [here](XXX where to host). Rather than describing the dataset any further, we will use Juttle to explore it.

## Reading the data

The `read` source is used to feed the data into the Juttle flowgraph. We will start with `read file` (where "file" is an adapter to the local filesystem); another option would be to `read http` to access the file remotely via http-accessible endpoint, but we recommend against that for the 30MB dataset to save time and bandwidth.

To see what the data looks like, let's read it in and display only the first few points:

```juttle
read file -file '/tmp/data.json'
| head 5
| view table
```

The `view table` sink is the default one, and can be omitted. Let's look at the last few points:

```juttle
read file -file '/tmp/data.json'
| tail 5
```

The rest of the examples will only specify the sink if other than table view is desired.

As we start analyzing the data, you will see that doing certain operations on a large file can get slow. At that point we will reload the data into ElasticSearch and use `read elastic` adapter in the Juttle programs, to take advantage of ES optimizations.

We will also try enriching the data with metadata from a CSV [file](../examples/datasets/github_metadata.csv), but not right away.

## Exploring the data

First, let's look at a few events using the `read file` source. We already used `head` and `tail` processors to limit the data we output, now we will try filtering by timestamp. Juttle defaults to looking for the timestamp in the field `time` unless `-timeField <fieldname>` option is used.

To select only data for July 1st, 2015, we use `-from` / `-to` time options:

```
read file -file '/tmp/data.json' -from :2015-07-01: -to :2015-07-02:
```

After running this program, we have our data (well, some of it) displayed in
a table. Notice that each GitHub event has a timestamp, an event type, a repository name,
and the login of the "actor" whose action triggered an event.

## How many points? (Our first reduce)

Let's answer a few basic questions about the data we are looking at. As a first
step, we might want to know how many data points there are; the size of the data often informs how one would wish to analyze it. To do this, we'll use the 
[`reduce`](../processors/reduce.md) processor that enables aggregations and grouping in Juttle.

Let's look at aggregations first, and start by using the [`count()`](../reducers/count.md) reducer (aggregation functions are called "reducers" in Juttle), which simply counts the number of points that flow through it.

```
read file -file '/tmp/data.json'
| reduce total_points = count()
```

You will have noticed that `reduce` trims off the rest of the data, leaving only the newly computed fields (`total_points` above). If you still have need for the original data for further processing, that can be done by splitting the flowgraph into `reduce` on one branch, and other logic on another branch; that is outside the scope of this tutorial (XXX if i add dual-sink example, reference from here)

Juttle comes with a number of built-in reducers to compute statistics such as
counts, cardinality, averages, and derivatives. If you need a computation that isn't provided, you can define your own reducer.

## Which fields? Which values? (More reduce magic)

When working with a new dataset, one commonly wants to know how big the data is, and how it's structured in terms of fields and values. We know the total number of points in our data set, and we have an idea of what fields are in the points from doing `read ... | head` to look at a few points. However, those points may not have represented full variety of the data set; there may be other points in the middle of the dataset with additional fields that we didn't catch with `head` and `tail`.

There is a Juttle trick to see which fields are present in the data; the processing will not be optimized, and the entire data stream coming out of `read` will need to [fit in memory](https://github.com/nodejs/node-v0.x-archive/wiki/FAQ#what-is-the-memory-limit-on-a-node-process) so do this only over small data sets (by specifying a narrow time range, for example).

```
read file -file '/tmp/data.json' -from :2015-07-01: -to :2015-07-02:
| split
| reduce by name
| reduce fields = pluck(name)
```

The program uses the [`split`](../processors/split.md) to transpose the data points such that each field/value tuple becomes a separate point with `name` set to the field's name, then applies `reduce by name` to output a unique set of field names. The output has field names alone, as an array, thanks to the [`pluck`](../reducers/pluck.md) reducer.

```raw
┌──────────────────────────────────────────────────────┐
│ fields                                               │
├──────────────────────────────────────────────────────┤
│ type,actor_login,repo_name,n_commits                 │
└──────────────────────────────────────────────────────┘
```

To see the set of unique values for a given field, use `reduce by` field name, shown here for field `type`. As you may not know in advance how many unique values there will be, it is advisable to first run the program with `reduce count()` tacked on, and once you know that the output is reasonably small, view the values themselves.

```
read file -file '/tmp/data.json' -from :2015-07-01: -to :2015-07-02:
| reduce by type
| reduce count()
```

As there are mere 10 types, it's fine to output them in a table:

```
read file -file '/tmp/data.json' -from :2015-07-01: -to :2015-07-02:
| reduce by type
```

Since we didn't use `pluck` to make an array, the output will be multiple data points, one for each type (only showing a couple here):

```
┌─────────────────┐
│ type            │
├─────────────────┤
│ ForkEvent       │
├─────────────────┤
...
├─────────────────┤
│ CreateEvent     │
└─────────────────┘
```

Now we have a good idea of what individual data points look like in terms of fields and their values, but don't yet grok the size and shape of the data: how many data points there are, what is the distribution of values in a given time interval, and over time. This is where Juttle shines.

## How many repos? (Different reducers)

Recall that there is a field called "repo_name" in the data. It might be useful to know how many unique repository names we have. To do this, we'll
use the [`count_unique(..)`](../reducers/count_unique.md) reducer.

```
read file -file '/tmp/data.json'
| reduce repos = count_unique('repo_name')
```

This reducer takes a parameter, which is a _field name_ specifying which field of the incoming points we want to compute the cardinality of.

We can also use `reduce` with multiple reduce expressions. For example, we can
count the total number of points, the number of unique repository names, and the
number of unique actors (in the "actor_login" field) like this:

```
read file -file '/tmp/data.json'
| reduce total = count(), 
    actors = count_unique('actor_login'), 
    repos = count_unique('repo_name')
```

## Enriching the data (Put vs reduce)

Let's say we wanted to know the number of actors participating in an average GitHub repository. The program above gives us the counts of actors and repos, so finding the average is simple math. However, it will not work to add `reduce avg_actors = actors / repos` to the program, since dereferencing of data fields is only possible inside a reducer, and this computation is not a [reducer](../reducers/index.md); and in general, this is not the logic you seek.

If your intention is to add the computed field to each data point, thereby enriching and widening the dataset rather than reducing it, then it's not `reduce` you should be using but the [`put`](../processors/put.md) processor.

Let's compute the average actors per repo with an appended `put`.

```
read file -file '/tmp/data.json'
| reduce total = count(), 
    actors = count_unique('actor_login'), 
    repos = count_unique('repo_name')
| put avg_actors = actors / repos
```

In this program, `reduce` already turned our whole data set into a single data point, so `put` appended the new field to that one point. If there were many data points, `put` would have added the field to each one. We will try that out in the next section.

## How many actors per repo? How do they rank? (By-grouping)

Unsurprisingly, our sample data set has many more actors than repositories. Maybe we'd like to know how many unique actors there are _per repository_. Easy! We just need to add a `by` clause to our reduce expression, indicating that we want to group data points by repository and carry out the `count_unique` operation individually for each group:

```
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
```

To see the top 10 repositories by number of participating actors, let's append the [`sort`](../processors/sort.md) processor with -desc order, then limit to first 10 points with the [`head`](../processors/head.md) processor. 

```
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
| sort actors -desc
| head 10
```

Now for these most active repositories by participant count, let's see how many events per actor tend to occur. 

```
read file -file '/tmp/data.json'
| reduce events = count(), actors = count_unique('actor_login') by repo_name
| sort actors -desc
| head 10
| put activity_per_actor = Math.round(events/actors) by repo_name
```

Note that we used a rounding function from the [`Math`](../modules/math.md) module; other built-in functions are available for common operations on math, strings, and time.

This example clearly shows that `put` adds the newly computed field to each data point. Also, here we are using `put` with by-grouping, to compute activity for each repository.

Let's see how by-grouping can be used with [other processors](../concepts/dataflow.md#grouping). 

To find out ranking of actors in each repository by the number of events in their name, we will first compute the count of events per actor per repository with the familiar `reduce ... by` approach, and filter out repositories with overall low activity. Then we will sort the event count from highest to lowest within each repository, using `sort by`, and assign ranking to the actors in each repository with `put ... by`. Finally, we will only look at the top 3 actors in each repository, using `head by`.

```
read file -file '/tmp/data.json'
| reduce events = count() by repo_name, actor_login
| filter events > 1
| sort events -desc by repo_name
| put rank = count() by repo_name
| head 3 by repo_name
```

One last thing about `reduce ... by` is that it can be used without a reducer expression (like count), as a bare `reduce by fieldname`. We did this earlier to get a list of all GitHub event types that are present in our data set:

```
read file -file '/tmp/data.json'
| reduce by type
```

## Got charts? (Using outrigger to visualize data)

Even better would be to represent this table graphically. A [bar chart](http://juttle.github.io/juttle-viz/charts/barchart/) is a good way to visualize counts of categorical data. 

In order to get visualizations in the browser, we will use the `outrigger-client` instead of the CLI to execute programs, and the `outriggerd` daemon needs to be running. Install and get it running following the [README](https://github.com/juttle/outrigger).

As the outrigger client, unlike the CLI, doesn't have a multiline input mode for Juttle code, let's first save the Juttle to a file, then run it like this:

```
$ outrigger-client browser --path my_juttle_file.juttle
```

Try it by saving the following Juttle that renders a barchart, then run it in outrigger:

```
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
| sort actors -desc
| view barchart
```

Try this to remove the long tail of the distribution: limit the bar chart to the top 20 repositories by adding `head 20`, and run the program again.

```
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
| sort actors -desc
| head 20
| view barchart
```

Outrigger can render other charts from [juttle-viz library](http://juttle.github.io/juttle-viz/). The next section will use timechart as a common visualization for time series data, with optional overlay for event data.

For the rest of this tutorial, it makes sense to keep using outrigger, as many programs will end in visualizations. It is not necessary to re-run `outrigger-client` for each new program, changing the file name in the browser URL is the quicker way.

## How are things changing over time? (Reducing over time batches)

In the first example of counting up points in the dataset, we applied `reduce` to the entire set of points coming back from the `read` source. We got a single point as a
result.

Then we used `by` to group points as subsets of the input and to apply
reducers individually to those subsets. We got one output point per
unique value of the field being grouped over.

Groupings allow us to split computations along a dimension of the data.
Similarly, we might want to group data points by time, separating them into
successive 'batches' based on their time stamps. For example, we might want to
know how many events we have per day rather than the total count of all
points which we calculated earlier.

First, let's quickly figure out what time range our data actually covers by running
this program:

```
read file -file '/tmp/data.json'
|(
  tail 1;
  head 1
)
| keep time
```

Using the above program, we see that our first point is from 2015-01-01 and
our last point is from 2015-07-01. All the other points in our data fall
between these dates.

In the above, we're using [`tail`](../processors/tail.md) and [`head`](../processors/head.md) to keep the first and the last
points of the stream. For convenience, we're also using [`keep`](../processors/keep.md) to strip the
points of all key/value pairs except their time stamp. Recall that the
parentheses and semicolon are the syntax for splitting the data stream into
two streams. The resulting topology looks like this:


```json
      / tail \
read |        | keep | view table
      \ head /
```

Let's count how many of our data points occurred on every individual day.
To do this, we'll use `reduce count()` like before. This time we'll run
`reduce` over batches that each contain one day's worth of points, rather
than over the entire set of points. We use the `-every` parameter to specify
the use of batches with reduce. This takes a _duration_ specifying the width
of the time intervals (buckets) that we want to batch over. The program is very
similar to the one we used before:

```
read file -file '/tmp/data.json'
| reduce -every :day: count=count()
| view timechart
```

Try this to plot one series per GitHub event type: append `by type` at the end of the `reduce` line and run the program again, like this:

```
read file -file '/tmp/data.json'
| reduce -every :day: count=count() by type
| view timechart
```

The first thing that jumps out from the above time chart is that the time
series has a strong periodic component, with a period that appears to be one
week long. We can zoom in on the graph to get a better view of this pattern.
Notice the mini-graph just below the text _Mon Jan 26 2015 — Mon Apr 20 2015_.
We call this a _context chart_. Click and drag horizontally on the context chart
to zoom in on a time slice. 

## How are things changing over time? (Reducing over rolling windows)

It appears that open source projects take a breather over the weekend. Good
for them! But let's try to understand some of the longer-scale effects
here. Is the GitHub event rate growing over this period? It might be, but it's
a little hard to see a clear trend line in the weekly fluctuations. One way
to do that is to count over larger intervals, for example two weeks. This can
be done simply by replacing `:day:` with `:2 weeks:` in the program above (try
it!). However that gives us an overly coarse line and a loss of
the day-to-day resolution of event activity. A better approach might be to
compute a count that is updated every day (to keep a high resolution) but over
a larger rolling window interval. To do that, we just need to add an `-over`
parameter to `reduce`. This approach retains one data point per day, and that
point is the sum of all activity in the two weeks preceding it. 

```
read file -file '/tmp/data.json'
| reduce -over :2 weeks: -every :day: count=count()
| view timechart
```

Things are much clearer now. With this new time chart, we see a clear upward
trend in the number of events over time.

The parameter names make the `reduce` invocation easy to understand: We are
`count`ing data `every` day `over` a two-week interval.

_Note:_ If `reduce` is only given `-every`, the value of `-over` is implicitly
set to be equal to the value of `-every`.

## Enriching the data with metadata (Juttle join)

Suppose we have an additional data source that contains a lookup table of metadata such as project name, category and subcategory for the GitHub repositories; for this tutorial, it is provided in the file 'github_metadata.csv'. It'd be great to enrich our GitHub events data with this additional metadata, widening each data point to include the extra fields. 

First, we need to read in the new data stream. The `read file` source we have used before supports CSV format, so we can achieve that easily, and take a look at the data so we understand its format:

```
read file -file '/tmp/metadata.csv' -format 'csv'
| head 5
```

Seeing that each point contains the field 'repo_name' just like our original data source did, we can join the two data streams on this field, passing it like a SQL foreign key to the `join` processor:

```
(
  read file -file '/tmp/data.json';
  read file -file '/tmp/metadata.csv' -format 'csv'
)
| join repo_name
| head 5
```

Notice the syntax of combining the two data sources inside parentheses, then joining them with the join proc, like this:

```
read-1 \
        | join | ...
read-2 /
```

Since one of our data sources (metadata.csv) did not have timestamps, it was considered "timeless" by Juttle, and joined against the "timeful" data points in data.json as a straight up lookup by matching the value of 'repo_name' field. There are other kinds of joining for multiple sources of streaming data that take into account timestamps on all sides of the join. They are not covered in this tutorial but described in the [join](../processors/join.md) documentation.

Now our points include the 'name', 'category' and 'sub_category' fields, which we have not yet made use of. Let's start by charting counts by sub-category:

```
(
  read file -file '/tmp/data.json';
  read file -file '/tmp/metadata.csv' -format 'csv'
)
| join repo_name
| reduce -from :2015-01-01: -over :w: -every :d: count() by 'sub_category'
| view timechart -keyField 'sub_category'
```

We'll leave it up to you to look at the chart and interpret it. Without
giving anything away, we'll simply say that some categories appear to be growing
faster (at least their GitHub activity is) than others!

Now let's zoom in on the 'Microservice Platform' category
and look at counts for only the repositories in that category. We use a
[filter expression](../concepts/filtering.md) in the `read` source to
specify that we only want data points with `sub_category` field containing
the value "Microservice platform".

```
(
  read file -file '/tmp/data.json';
  read file -file '/tmp/metadata.csv' -format 'csv'
)
| join repo_name
| filter sub_category = 'Microservice Platform'
| reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
| view timechart -keyField 'repo_name'

```

## Bigger data is better! (ElasticSearch backend)

Our examples have been reading from files. That works fine until the data volume gets big enough that reading itself, not to mention processing in the Juttle runtime, slows down and tries the user's patience. Big data requires a big-data backend with optimized processing, and Juttle works with those via [adapters](../adapters/index.md). 

In this tutorial, we will use ElasticSearch (ES) as the backend, with [elastic adapter](https://github.com/juttle/juttle-elastic-adapter). The `~/.juttle/config.json` should point at the right address/port to access the running instance of ES, be it local, remote or inside a docker container.

How will the data get into ES? There are many ingest options, from writing directly to ES API, to using Logstash, to using Juttle's `elastic` adapter, which is what we will do here, as it is the easiest path. We will read the data from files as we did above, joining it against metadata, and write out the resulting enriched data points to ES.

```
(
  read file -file '/tmp/data.json';
  read file -file '/tmp/metadata.csv' -format 'csv'
)
| join repo_name
| write elastic
```

XXX/dmehra Caveat: with our standard logstash schema, ES creates an index for each day, meaning 180 indices here for the 6-month data set. Doing that in quick succession overloads ES, and inserts time out. Until we get support for a single-index ES schema in the elastic adapter, data must be loaded in 1-week chunks to prevent overtaxing ES. This takes a few minutes:

```
for i in {1..26}; do echo -n "$i..."; juttle --input n=$i /tmp/load.juttle; done; echo "DONE"
```

`/tmp/load.juttle`

```
input n: number -default 1; // read data for the nth week
const weeks = Duration.new(7*24*60*60);
const start = :2015-01-01: + (n - 1) * weeks;
const end = :2015-01-01: + n * weeks;

(
  read file -file '/tmp/data_sorted_lines.json' -from start -to end -format 'jsonl' -timeField 'created_at';
  read file -file '/tmp/github_metadata.csv' -format 'csv';
)
| join repo_name
| write elastic
```

The [next section](#input-controls) explains how the inputs work in Juttle. Above, we use the input control to run ingest for a given week number, so we can step through the dataset week by week. 

With data in ES, we can run any program we have previously executed, replacing `read file ...` line with `read elastic -from :2015-01-01: -to :2015-07-02:`. Specifying the time range is required; to read all stored data, we can do `read elastic -from :0: -to :now:`. 

For example, this is the elastic-fed version of the program that plotted daily event counts by event type on a timechart:

```
read elastic -from :2015-01-01: -to :2015-07-02:
| reduce -every :day: count=count() by type
| view timechart
```

Some of the programs will now execute a bit faster (try the ones that joined data with metadata), although our 30MB dataset is still not in the true "big data" category where the speedup from an optimized backend would be very noticeable. There is another advantage to rehosting the data in ES, though: now we can do full text search (FTS), which wasn't supported by the file adapter.

FTS capability is of most interest on data that contains lots of free text, such as log messages or commit descriptions, which our dataset does not; but we can still try it out. Let's see which GitHub repos have anything to do with logging:

```
read elastic -from :2015-01-01: -to :2015-07-02: 'logging'
| reduce by repo_name
```

The search term applies to all fields and is treated as a substring (but not a subword, therefore searching for "log" will not match "logging"). The FTS above matches "Logging" category name, and the `reduce` gives us a list of repos that were in the search results.

## Input Controls

When exploring data with Juttle, it is common to change one value in a program
and then rerun it to see slightly different results. The value being edited
might be the date used with `-from`, or a term used with `filter`, or a field
name used with `by`.

While this run/edit/run loop is easy for those writing a Juttle program, it is
less so for those who are not used to writing programs. That's where
[input controls](../concepts/inputs.md) come in:
they enable you, the Juttle writer, to build flexible programs that can be used
by users who are less technical than you.

Input controls let you create UI inputs to parametrize your
programs. Using these controls, you and the people you share your Juttle with can
make simple yet powerful changes to your queries.

Let's start with a simple example using two input controls. In this example,
one takes a text string and the other takes a date:

```
input t: text -default "Hello world";
input d: date -default :3 days ago:;

emit -limit 1 -from d 
| put msg = t;
```

Try modifying the input values and rerunning the program!

_Note:_ the `-default` field initializes the input control with a value
which will be used if the user does not change the input.

Each input has a declaration consisting of the input type (`text` and
`date` in the example) followed by options. The value of the input is
stored in the corresponding input name (`t` and `d` in the example above),
which can be used as a variable elsewhere in the program.

Now let's return to our GitHub data. In the previous example, we used a
filter to display only repositories in the 'microservice platform'
sub-category. We might edit the program to look at another sub-category, replacing 'Microservice Platform' with 'Provisioning' or 'Logging',
following the old 'run/edit/run' workflow described above.

If we find ourselves doing that frequently, then using an input control
is more convenient. Let's change this using a dropdown input.

XXX/dmehra there is no 'dropdown' input, using lame 'text' instead. 

```
input subcat: text
  -label 'Sub-Category'
  -default 'Microservice Platform';

read file -file '/tmp/data.json'
| filter sub_category = subcat
| reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
| view timechart -keyField 'repo_name'
```

XXX/dmehra also there is no filtering in the file adapter, so this should be done with `read elastic`, but we currently have a bug with `read elastic | view timechart`.

Once we get the dropdown input, it would be much nicer:

```
input subcat: dropdown
  -label 'Sub-Category'
  -default 'Microservice Platform'
  -items ['Microservice Platform', 'Provisioning', 'Logging'];

read file -file '/tmp/data.json'
| filter sub_category = subcat
| reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
| view timechart -keyField 'repo_name'
```

_Note:_ We used two new options in our input control. `-label` is a purely
cosmetic option that puts a label next to the associated input. This will 
help make the input's purpose clearer, especially when sharing your code.
The other new option is `-items` which just lets us specify a list of possible
values for a dropdown input.

XXX/dmehra this is not yet supported in outrigger, ignore the rest of this section.

Much better! The only snag is that we list three sub-categories when there
are more than that in the data. (You can see this by running `read -from :2015-01-01: -to :now: | reduce by
sub_category`).

How do we get them all into our input dropdown? We could list them
explicitly in the `-items` option, but this is tedious, error-prone,
and could become outdated. It would be better if this list were automatically
inferred from the data. This is easily done with Juttle! The dropdown input has
a `-juttle` option, which takes a Juttle program that is run by the input control
to populate the list of dropdown items. Let's use it! Try replacing the definition
of the dropdown input in the previous program with the following:

```
input cat: dropdown -default 'Dev'
  -label 'Category'
  -juttle "read -from :2015-01-01: -to :now: -space 'tutorial' | reduce by category"
  -valueField 'category';
```

## Finale (Analytics dashboard)

Now, let's conclude this tutorial by examining a more general program that
lets us view activity trends in our GitHub data set. The program uses two
inputs, allowing the user to select both category and sub-category. The
sub-category input has its values populated based on what is selected from
the category input. This program also creates a table and a [tile](http://juttle.github.io/juttle-viz/charts/tile/) with summary stats.

XXX/dmehra this needs row/col layout and rethink to use supported inputs (the cool two-level juttle-powered input won't work today)

```
input cat: dropdown -label 'Category'
  -default 'Dev'
  -juttle "read elastic -from :2015-01-01: -to :now: | reduce by category"
  -valueField 'category';

input subcat: dropdown -label 'Sub-Category'
  -default 'Version Control and Collaboration'
  -juttle "read elastic -from :2015-01-01: -to :now: category = '${cat}' | reduce by sub_category"
  -valueField 'sub_category';

read -space 'tutorial' -from :2015-01-01: -to :now: sub_category = subcat
|(
  reduce count() 
  | view tile -title 'Total number of GitHub events (${subcat})';
 
  reduce count() by repo_name 
  | view table -title 'Total number of GitHub events per repo (${subcat})';
 
  reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
  | view timechart -keyField 'repo_name' -title 'Rolling count of GitHub events (${subcat})'
)
```

_Note:_ This program uses
[string interpolation](../modules/string/#string-interpolation),
a handy feature when building strings that contain variables.

If you run `outriggerd` on an accessible server, other users can do analytics on your GitHub data set using this dashboard, without having to learn Juttle first. 