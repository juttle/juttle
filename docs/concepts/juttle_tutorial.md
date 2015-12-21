---
title: Juttle Tutorial | Juttle Language Reference
---

# Juttle Tutorial

[TOC]

:warning: XXX/dmehra this is unfinished

Juttle examples here assume that you have the `juttle` binary available, having done

```
npm install -g juttle
```

and that you have placed the dataset in `/tmp/data.json` location.

For examples that generate visualizations in the browser, you need to have the outrigger package installed:

```
npm install -g outrigger
```

and the outriggerd daemon running.

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

XXX/dmehra this is currently unsupported:

```
read file -file '/tmp/data.json' -from :2015-07-01: -to :2015-07-02:
```

what works now is:

```juttle
read file -file '/tmp/data.json'
| filter time >= :2015-07-01:
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

You will have noticed that `reduce` trims off the rest of the data, leaving only the newly computed fields (`total_points` above). If you still have need for the original data for further processing, that can be done by splitting the flowgraph into `reduce` on one branch, and other logic on another branch; that is outside the scope of this tutorial. 

Juttle comes with a number of built-in reducers to compute statistics such as
counts, cardinality, averages, and derivatives. If you need a computation that isn't provided, you can define your own reducer.

## Which fields? Which values? (More reduce magic)

When working with a new dataset, one commonly wants to know how big the data is, and how it's structured in terms of fields and values. We know the total number of points in our data set, and we have an idea of what fields are in the points from doing `read ... | head` to look at a few points. However, those points may not have represented full variety of the data set; there may be other points in the middle of the dataset with additional fields that we didn't catch with `head` and `tail`.

There is a Juttle trick to see which fields are present in the data; the processing will not be optimized, so do this only over small data sets (by specifying a narrow time range, for example).

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

Let's say we wanted to know the number of actors participating in an average GitHub repository. The program above gives us the counts of actors and repos, so finding the average is simple math. However, it will not work to add "avg_actors = actors / repos" to the `reduce` expression, since this computation is not a reducer; and in general, this is not the logic you seek.

If your intention is to add the computed field to each data point, thereby enriching and widening the dataset rather than reducing it, then it's not `reduce` you should be using but [`put`](../processors/put.md) processor.

Let's compute the average actors per repo with an appended `put`.

```
read file -file '/tmp/data.json'
| reduce total = count(), 
    actors = count_unique('actor_login'), 
    repos = count_unique('repo_name')
| put avg_actors = actors / repos
```

In this program, `reduce` already turned our whole data set into a single data point, so `put` appended the new field to that one point. If there were many data points, `put` would have added the field to each one. We will try that out in the next section.

## How many actors per repo? (Reduce with by-grouping)

Unsurprisingly, our sample data set has many more actors than repositories. Maybe we'd like to know how many unique actors there are _per repository_. Easy! We just need to add a `by` clause to our reduce expression, indicating that we want to group data points by repository and carry out the `count_unique` operation individually for each group:

```
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
```

If you want to see the top 10 repositories by number of participating actors, append the [`sort`](../processors/sort.md) processor with -desc order, then limit to first 10 points with the [`head`](../processors/head.md) processor. 

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

This example clearly shows that `put` adds the newly computed field to each data point. Also, here we are using `put` with by-grouping (to be fair, the program above would run identically even with plain `put`, but it helps express the intention of the code).

We used a rounding function from the [`Math`](../modules/math.md) module; other built-in functions are available for common operations on math, strings, and time.

One last thing about `reduce ... by` is that you don't have to provide a
reducer expression (like count) when you use it. We did this earlier to get a list of all GitHub event types that are present in our data set:

```
read file -file '/tmp/data.json'
| reduce by type
```

## Got charts? (Using outrigger to visualize data)

Even better would be to represent this table graphically. A [bar chart](http://juttle.github.io/juttle-viz/charts/barchart/) is a good way to visualize counts of categorical data. 

In order to get visualizations in the browser, you will need to use `outrigger` client instead of the CLI to execute the programs, and the `outriggerd` daemon needs to be running. Install and get it running following the [README](https://github.com/juttle/outrigger).

As the outrigger client, unlike the CLI, doesn't have a multiline input mode for Juttle code, you will need to save the Juttle to a file, then run it like this:

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

Try this to limit the bar chart to the top 20 repositories: insert 
`| head 20` between the `sort` and `@barchart` lines and run the program again.

```
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
| sort actors -desc
| head 20
| view barchart
```

Outrigger can render other charts from [juttle-viz library](http://juttle.github.io/juttle-viz/). The next section will use timechart as a common visualization for time series data, with optional overlay for event data. 

## How are things changing over time? (Reducing over time batches)

In the first example, we applied `reduce` to the entire set of
points coming back from the `read` source. We got a single point as a
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
read |        | keep | @table
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
Try this to plot one series per GitHub event type: append `by type` at the end of the `reduce` line and run the program again.

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

## Looking at categories

Our points include the 'category' and 'sub_category' fields, which we have not
yet made use of. Let's start by charting counts by sub-category:

```
read file -file '/tmp/data.json'
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
read file -file '/tmp/data.json'
| filter sub_category = 'Microservice Platform'
| reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
| @timechart -keyField 'repo_name'

```

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
sub-category. We might edit the program to look at another sub-category.
For example you might replace 'Microservice Platform' with 'Provisioning',
following the old 'run/edit/run' workflow described above.

If we find ourselves doing that frequently, then using an input control
is more convenient. Let's change this using a dropdown input.

XXX/dmehra this is not yet supported in outrigger, ignore the rest of this section.

XXX/dmehra also there is no filtering in the file adapter, so this should be done with ES

```
input subcat: dropdown
  -label 'Sub-Category'
  -default 'Microservice Platform'
  -items ['Microservice Platform', 'Provisioning', 'Logging'];

read file -file '/tmp/data.json'
| filter sub_category = subcat
| reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
| @timechart -keyField 'repo_name'
```

_Note:_ We used two new options in our input control. `-label` is a purely
cosmetic option that puts a label next to the associated input. This will 
help make the input's purpose clearer, especially when sharing your code.
The other new option is `-items` which just lets us specify a list of possible
values for a dropdown input.

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

XXX/dmehra this needs row/col layout

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
  | @tile -title 'Total number of GitHub events (${subcat})';
 
  reduce count() by repo_name 
  | @table -title 'Total number of GitHub events per repo (${subcat})';
 
  reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
  | @timechart -keyField 'repo_name' -title 'Rolling count of GitHub events (${subcat})'
)
```

_Note:_ This program uses
[string interpolation](../modules/string/#string-interpolation),
a handy feature when building strings that contain variables.

If you run `outriggerd` on an accessible server, other users can do analytics on your GitHub data set using this dashboard, without having to learn Juttle first. 