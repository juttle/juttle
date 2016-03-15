---
title: Juttle Tutorial | Juttle Language Reference
---

# Juttle Tutorial

[TOC]

This tutorial is meant for new users who have a basic understanding of Juttle, having read at a minimum the [Overview](overview.md).

By stepping through the examples, we will practice coding in Juttle, including reading data from files, s3 and Elasticsearch; writing data out; filtering and aggregating data; visualizing data as charts in the browser.

## Setup

This tutorial works best if you install the juttle-engine assembly that provides both the CLI and the browser execution environment. This can be done via `npm install juttle-engine`, or using a docker container we provide. The demo system demo.juttle.io is a public deployment of that container.

### Demo Option

You can follow along by executing the Juttle programs, and viewing their source code, on the demo system at URL:

demo.juttle.io/?path=/examples/github-tutorial/index.html

The [RUN] links throughout this tutorial take you to execute a given program on demo.juttle.io.

This will give you the browser experience via juttle-viewer app, but not a CLI. It works as a quick ride-along option; to get the most out of the tutorial, you'll want to have a local installation of the Juttle Engine.

### Local Option

Install the juttle-engine assembly with:
```
npm install -g juttle-engine
```
If you did a global install with `-g` as above, that makes `juttle` CLI binary available anywhere:
```
$ juttle
juttle>
```

We will be using Elasticsearch as a data store for part 2 of the tutorial; you can run it locally or in a docker container. You will need to configure the elastic adapter section in your `~/.juttle/config.json` file.

The Juttle programs used in this tutorial are available under your `${NODE_MODULES_DIR}/juttle-engine/examples/github-tutorial/juttles/`. Let's copy them to an easily accessible location:

```
mkdir -p /examples/tutorial; cp ${NODE_MODULES_DIR}/juttle-engine/examples/github-tutorial/juttles/* /examples/tutorial/
```

### Dockerized Option

Follow instructions in [juttle-engine tutorial example](https://github.com/juttle/juttle-engine/tree/master/examples/github-tutorial/README.md), tl;dr is

```
git clone https://github.com/juttle/juttle-engine
cd juttle-engine/examples && docker-compose -f dc-juttle-engine.yml -f github-tutorial/dc-elastic.yml up -d
DOCKER_MACHINE_HOST=`docker-machine ip default` && open http://$DOCKER_MACHINE_HOST:8080/?path=/examples/github-tutorial/index.juttle
```

Your browser will open the page linking to juttle programs with visual output (the programs are included in the docker container). You can run all of the examples in this fashion, but if you want to modify code as you try it out, best start with the CLI.

To launch the Juttle CLI in interactive mode, you would do:

```
docker exec -it examples_juttle-engine_1 juttle
```

To run programs via CLI from saved juttle files, you would do:

```
docker exec examples_juttle-engine_1 juttle /opt/juttle-engine/juttles/examples/github-tutorial/filename.juttle
```

## Working with Juttle CLI

Depending on your install option, the Juttle CLI binary will either be globally available on your system as `juttle`, or accessible in the docker container. Let's launch it:

```
$ juttle
juttle>
```

To run a program by copying provided Juttle code, at the CLI prompt, enter `<` for multiline mode, then paste the code followed by `.` on its own line, enter to execute. Let's try that with a "hello world" program:

*00_hello_world.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/00_hello_world.juttle)]

```
juttle> <
emit
| put message = "Hello World!"
| view table
.
```

To run the same program by referencing a file with Juttle code, pass the file path as an argument to the `juttle` command:

```
$ juttle /examples/tutorial/00_hello_world.juttle
```

You should see output along the lines of
```
┌────────────────────────────────────┬──────────────────┐
│ time                               │ message          │
├────────────────────────────────────┼──────────────────┤
│ 2016-03-06T19:59:04.849Z           │ Hello World!     │
└────────────────────────────────────┴──────────────────┘
```

We encourage you to run the provided examples and further experiment by modifying their Juttle code.

## Dataset

This tutorial uses a subset of real data from the
[Github Archive](https://www.githubarchive.org/), saved as files:

   * small subset of data [[view json](https://github.com/juttle/juttle-engine/tree/master/examples/github-tutorial/github_data.json)] [[s3 url](https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_data_sample.json)]
   * full data file, 30MB [[s3 url](https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_data.json)]
   * metadata file [[view csv](https://github.com/juttle/juttle-engine/tree/master/examples/github-tutorial/github_metadata.csv)] [[s3 url](https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_metadata.csv)]

There is no need to download the files now, we will read them directly from s3 using Juttle. Rather than describing the dataset any further, we will use Juttle to explore it.

As we start analyzing the data, you will see that doing certain operations on a large file can get slow. At that point we will reload the data into ElasticSearch and use `read elastic` adapter in the Juttle programs, to take advantage of ES optimizations.

## Reading the data

The `read` source is used to feed the data into the Juttle flowgraph. We will start with `read http` to access the files from s3 bucket. For now, we will be reading the small data file to save on bandwidth.

To see what the data looks like, let's read it in and display only the first few points:

*01_view_data_head.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/01_view_data_head.juttle)]

```juttle
read http -url 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_data_sample.json' -format 'json'
| head 2
| view table
```

The `view table` sink is the default one, and can be omitted. Let's look at the last few points:

*02_view_data_tail.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/02_view_data_tail.juttle)]

```juttle
read http -url 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_data_sample.json' -format 'json'
| tail 2
```

The rest of the examples will only specify the sink if other than table view is desired.

If we wanted to see the first few and the last few points of the dataset, the `head` and `tail` operations can be done on a single read of the data, instead of pulling it down from s3 twice, by splitting up the Juttle flowgraph like this:

*03_view_data_head_tail.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/03_view_data_head_tail.juttle)]

```juttle
read http -url 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_data_sample.json' -format 'json'
|(
  head 1;
  tail 1
)
```

```
┌──────────────────────────┬────────────────┬────────────────────────────────┬─────────────┐
│ time                     │ actor_login    │ repo_name                      │ type        │
├──────────────────────────┼────────────────┼────────────────────────────────┼─────────────┤
│ 2015-01-04T03:03:37.000Z │ smarterclayton │ GoogleCloudPlatform/kubernetes │ IssuesEvent │
└──────────────────────────┴────────────────┴────────────────────────────────┴─────────────┘
┌──────────────────────────┬─────────────┬────────────────────────────────┬───────────────────────────────┐
│ time                     │ actor_login │ repo_name                      │ type                          │
├──────────────────────────┼─────────────┼────────────────────────────────┼───────────────────────────────┤
│ 2015-06-30T21:59:02.000Z │ ixdy        │ GoogleCloudPlatform/kubernetes │ PullRequestReviewCommentEvent │
└──────────────────────────┴─────────────┴────────────────────────────────┴───────────────────────────────┘
```

This illustrates the basic premise of Juttle as a dataflow language: we can split and join data streams at will. The program above does this (with `view table` implicit):

```
      / head | view table
read |
      \ tail | view table
```

We will come back to this later when we learn to use `join`; the next set of programs will have a simple pipeline structure, reading from one source, doing transformations on the data, and ending in a single sink (such as the table view on the CLI).

## Exploring the data

We can do our exploration by reading the data from the s3 bucket every time, but in order to save on network round trips, we will write the data out to a local file first. Juttle has a built-in `file` adapter that supports both read and write operations.

*write_data_from_s3_to_file.juttle*

```juttle
read http -url 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_data_sample.json' -format 'json'
| write file -file '/tmp/data.json'
```

As later on we will enrich our data with metadata from a CSV file, let's read it from s3 and write to a local file as well:

*write_metadata_from_s3_to_file.juttle*

```juttle
read http -url 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_metadata.csv' -format 'csv'
| write file -file '/tmp/metadata.csv' -format 'csv'
```

First, let's look at a few events using the `read file` source. We already used `head` and `tail` processors to limit the data we output, now we will try filtering by timestamp. Juttle defaults to looking for the timestamp in the field `time` unless `-timeField <fieldname>` option is used.

To select only data for February 1st, 2015, we use `-from` / `-to` time options:

*04_view_with_time_filter.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/04_view_with_time_filter.juttle)]

```juttle
read file -file '/tmp/data.json' -from :2015-02-01: -to :2015-02-02:
```

```
┌────────────────────────────────────┬─────────────────┬─────────────────────┬──────────────┐
│ time                               │ actor_login     │ repo_name           │ type         │
├────────────────────────────────────┼─────────────────┼─────────────────────┼──────────────┤
│ 2015-02-01T14:08:59.000Z           │ drlatech        │ saltstack/salt      │ ForkEvent    │
└────────────────────────────────────┴─────────────────┴─────────────────────┴──────────────┘
```

After running this program, we have our data (well, some of it) displayed in
a table. Notice that each GitHub event has a timestamp, an event type, a repository name,
and the login of the "actor" whose action triggered an event.

## How many points? (Our first reduce)

Let's answer a few basic questions about the data we are looking at. As a first
step, we might want to know how many data points there are; the size of the data often informs how one would wish to analyze it. To do this, we'll use the
[`reduce`](../processors/reduce.md) processor that enables aggregations and grouping in Juttle.

Let's look at aggregations first, and start by using the [`count()`](../reducers/count.md) reducer (aggregation functions are called "reducers" in Juttle), which simply counts the number of points that flow through it.

*05_count_points.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/05_count_points.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce total_points = count()
```

```
┌──────────────────┐
│ total_points     │
├──────────────────┤
│ 1503             │
└──────────────────┘
```

Notice that `reduce` trims off the rest of the data, leaving only the newly computed fields (`total_points` above). If we still have need for the original data for further processing, that can be done by splitting the flowgraph into `reduce` on one branch, and other logic on another branch, for example:

*06_count_and_first_point.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/06_count_and_first_point.juttle)]

```juttle
read file -file '/tmp/data.json'
|(
  reduce total_points = count();

  head 1
)
```

Notice that in a program like this, the order of execution of branches is not defined. Even though we wrote `reduce` above `head`, when the program runs, it outputs the point from `head 1` first, and then the total points count.

```
┌──────────────────────────┬────────────────┬────────────────────────────────┬─────────────┐
│ time                     │ actor_login    │ repo_name                      │ type        │
├──────────────────────────┼────────────────┼────────────────────────────────┼─────────────┤
│ 2015-01-04T03:03:37.000Z │ smarterclayton │ GoogleCloudPlatform/kubernetes │ IssuesEvent │
└──────────────────────────┴────────────────┴────────────────────────────────┴─────────────┘
┌──────────────┐
│ total_points │
├──────────────┤
│ 3194         │
└──────────────┘
```

Juttle comes with a number of [built-in reducers](../reducers/index.md) to compute statistics such as counts, cardinality, averages, and derivatives. When in need of a computation that isn't provided, [define your own reducer](http://juttle.github.io/juttle/reducers/juttle_reducers_user-defined/) (this is outside the scope of our tutorial).

## Which fields? Which values? (More reduce magic)

When working with a new dataset, one commonly wants to know how big the data is, and how it's structured in terms of fields and values. We know the total number of points in our data set, and we have an idea of what fields are in the points from doing `read ... | head` to look at a few points. However, those points may not have represented full variety of the data set; there may be other points in the middle of the dataset with additional fields that we didn't catch with `head` and `tail`.

There is a Juttle trick to see which fields are present in the data; the processing will not be optimized, and the entire data stream coming out of `read` will need to [fit in memory](https://github.com/nodejs/node-v0.x-archive/wiki/FAQ#what-is-the-memory-limit-on-a-node-process) so do this only over small data sets (by specifying a narrow time range, for example).

*07_list_fields.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/07_list_fields.juttle)]

```juttle
read file -file '/tmp/data.json' -from :2015-06-01: -to :2015-07-01:
| split
| reduce by name
| reduce fields = pluck(name)
```

The program uses the [`split`](../processors/split.md) to transpose the data points such that each field/value tuple becomes a separate point with `name` set to the field's name, then applies `reduce by name` to output a unique set of field names. The output has field names alone, as an array, thanks to the [`pluck`](../reducers/pluck.md) reducer.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ fields                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ "type", "actor_login", "repo_name", "n_commits" ]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

To see the set of unique values for a given field, use `reduce by` field name, shown here for field `type`. As you may not know in advance how many unique values there will be, it is advisable to first run the program with `reduce count()` tacked on, and once you know that the output is reasonably small, view the values themselves.

*08_count_types.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/08_count_types.juttle)]

```juttle
read file -file '/tmp/data.json' -from :2015-06-01: -to :2015-07-01:
| reduce by type
| reduce count()
```

```
┌──────────┐
│ count    │
├──────────┤
│ 9        │
└──────────┘
```

As there are mere 9 types, it's fine to output them in a table:

*09_list_types.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/09_list_types.juttle)]

```juttle
read file -file '/tmp/data.json' -from :2015-06-01: -to :2015-07-01:
| reduce by type
```

Since we didn't use `pluck` to make an array, the output will be multiple data points, one for each type (only showing a couple here):

```
┌────────────────────────────────────────────┐
│ type                                       │
├────────────────────────────────────────────┤
│ IssuesEvent                                │
├────────────────────────────────────────────┤
│ PushEvent                                  │
├────────────────────────────────────────────┤
│ ...                                        │
└────────────────────────────────────────────┘
```

Now we have a good idea of what individual data points look like in terms of fields and their values, but don't yet grok the size and shape of the data: how many data points there are, what is the distribution of values in a given time interval, and over time. This is where Juttle shines.

## How many repos? (Different reducers)

Recall that there is a field called "repo_name" in the data. It might be useful to know how many unique repository names we have. To do this, we'll
use the [`count_unique(..)`](../reducers/count_unique.md) reducer.

This reducer takes a parameter, which is a _field name_ specifying which field of the incoming points we want to compute the cardinality of.

*10_count_unique_repos.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/10_count_unique_repos.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce repos = count_unique('repo_name')
```

There are only 40 repos in our small data set, but many more in the full data set we will be using later, ingested into Elasticsearch.

```
┌──────────┐
│ repos    │
├──────────┤
│ 40       │
└──────────┘
```

We can also use `reduce` with multiple reduce expressions. For example, we can
count the total number of points, the number of unique repository names, and the
number of unique actors (in the "actor_login" field) like this:

*11_count_multiple.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/11_count_multiple.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce total = count(),
    actors = count_unique('actor_login'),
    repos = count_unique('repo_name')
```

```
┌──────────┬──────────┬──────────┐
│ actors   │ repos    │ total    │
├──────────┼──────────┼──────────┤
│ 709      │ 40       │ 1503     │
└──────────┴──────────┴──────────┘
```

## Enriching the data (Put vs reduce)

Let's say we wanted to know the number of actors participating in an average GitHub repository. The program above gives us the counts of actors and repos, so finding the average is simple math. However, it will not work to add `reduce avg_actors = actors / repos` to the program, since dereferencing of data fields is only possible inside a reducer, and this computation is not a [reducer](../reducers/index.md); and in general, this is not the logic you seek.

If your intention is to add the computed field to each data point, thereby enriching and widening the dataset rather than reducing it, then it's not `reduce` you should be using but the [`put`](../processors/put.md) processor.

Let's compute the average actors per repo with an appended `put`.

*12_put_avg_actors.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/12_put_avg_actors.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce total = count(),
    actors = count_unique('actor_login'),
    repos = count_unique('repo_name')
| put avg_actors = actors / repos
```

```
┌──────────┬───────────────┬──────────┬──────────┐
│ actors   │ avg_actors    │ repos    │ total    │
├──────────┼───────────────┼──────────┼──────────┤
│ 709      │ 17.725        │ 40       │ 1503     │
└──────────┴───────────────┴──────────┴──────────┘
```

In this program, `reduce` already turned our whole data set into a single data point, so `put` appended the new field to that one point. If there were many data points, `put` would have added the field to each one. We will try that out in the next section.

## How many actors per repo? How do they rank? (By-grouping)

Unsurprisingly, our sample data set has many more actors than repositories. Maybe we'd like to know how many unique actors there are _per repository_. Easy! We just need to add a `by` clause to our reduce expression, indicating that we want to group data points by repository and carry out the `count_unique` operation individually for each group:

*13_count_actors_by_repo.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/13_count_actors_by_repo.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
```

```
┌──────────┬─────────────────────────────────────────────┐
│ actors   │ repo_name                                   │
├──────────┼─────────────────────────────────────────────┤
│ 110      │ GoogleCloudPlatform/kubernetes              │
├──────────┼─────────────────────────────────────────────┤
│ 18       │ puppetlabs/puppet                           │
├──────────┼─────────────────────────────────────────────┤
│...       | ...                                         │
└──────────┴─────────────────────────────────────────────┘
```

This program gave us a lot of output, in unsorted order; let's improve it.

To see the top 10 repositories by number of participating actors, let's append the [`sort`](../processors/sort.md) processor with -desc order, then limit to first 10 points with the [`head`](../processors/head.md) processor.

*14_top_ten_repos.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/14_top_ten_repos.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce actors = count_unique('actor_login') by repo_name
| sort actors -desc
| head 10
```

Showing partial output here, not all 10 points:

```
┌──────────┬────────────────────┐
│ actors   │ repo_name          │
├──────────┼────────────────────┤
│ 116      │ docker/docker      │
├──────────┼────────────────────┤
│ 110      │ GoogleCloudPlatfo… │
├──────────┼────────────────────┤
│ ...      │ ...                │
└──────────┴────────────────────┘
```

Now for these most active repositories by participant count, let's see how many events per actor tend to occur.

*15_activity_per_actor.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/15_activity_per_actor.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce events = count(), actors = count_unique('actor_login') by repo_name
| sort actors -desc
| head 10
| put activity_per_actor = Math.round(events/actors) by repo_name
```

```
┌───────────────────────────┬──────────┬──────────┬────────────────────┐
│ activity_per_actor        │ actors   │ events   │ repo_name          │
├───────────────────────────┼──────────┼──────────┼────────────────────┤
│ 2                         │ 116      │ 231      │ docker/docker      │
├───────────────────────────┼──────────┼──────────┼────────────────────┤
│ 3                         │ 110      │ 335      │ GoogleCloudPlatfo… │
├───────────────────────────┼──────────┼──────────┼────────────────────┤
│ ...                       │ ...      │ ...      │ ...                │
└───────────────────────────┴──────────┴──────────┴────────────────────┘
```

Note that we used a rounding function from the [`Math`](../modules/math.md) module; other built-in functions are available for common operations on math, strings, and time.

This example showed us that `put` adds the newly computed field to each data point. Also, here we are using `put` with by-grouping, to compute activity for each repository.

Let's see how by-grouping can be used with [other processors](../concepts/dataflow.md#grouping).

To find out ranking of actors in each repository by the number of events in their name, we will first compute the count of events per actor per repository with the familiar `reduce ... by` approach, and filter out repositories with overall low activity. Then we will sort the event count from highest to lowest within each repository, using `sort by`, and assign ranking to the actors in each repository with `put ... by`. Finally, we will only look at the top 3 actors in each repository, using `head by`.

*16_top_three_actors_per_repo.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/16_top_three_actors_per_repo.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce events = count() by repo_name, actor_login
| filter events > 1
| sort events -desc by repo_name
| put rank = count() by repo_name
| head 3 by repo_name
```

This program gives quite a bit of output since we have 40 repositories and output 3 entries for each repo, showing only the first repo here:

```
┌─────────────────┬──────────┬──────────┬─────────────────────────────────────────────┐
│ actor_login     │ events   │ rank     │ repo_name                                   │
├─────────────────┼──────────┼──────────┼─────────────────────────────────────────────┤
│ bgrant0607      │ 35       │ 1        │ GoogleCloudPlatform/kubernetes              │
├─────────────────┼──────────┼──────────┼─────────────────────────────────────────────┤
│ thockin         │ 29       │ 2        │ GoogleCloudPlatform/kubernetes              │
├─────────────────┼──────────┼──────────┼─────────────────────────────────────────────┤
│ erictune        │ 17       │ 3        │ GoogleCloudPlatform/kubernetes              │
├─────────────────┼──────────┼──────────┼─────────────────────────────────────────────┤
│ ...             │ ...      │ ...      │ ...                                         │
└─────────────────┴──────────┴──────────┴─────────────────────────────────────────────┘
```

One last thing about `reduce ... by` is that it can be used without a reducer expression (like count), as a bare `reduce by fieldname`. We did this earlier to get a list of all GitHub event types that are present in our data set:

*09_list_types.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/09_list_types.juttle)]

```juttle
read file -file '/tmp/data.json'
| reduce by type
```

## Enriching the data with metadata (Juttle join)

Suppose we have an additional data source that contains a lookup table of metadata such as project name, category and subcategory for the GitHub repositories; for this tutorial, it is provided in the file [github_metadata.csv](https://github.com/juttle/juttle-engine/tree/master/examples/github-tutorial/github_metadata.csv), which can also be accessed from our public s3 bucket. It'd be great to enrich our GitHub events data with this additional metadata, widening each data point to include the extra fields.

First, we need to read in the new data stream. The `read http` source we have used before supports CSV format, so we can achieve that easily, and take a look at the data so we understand its format:

*17_view_metadata.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/17_view_metadata.juttle)]

```juttle
read http -url 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial/github_metadata.csv' -format 'csv'
| head 2
```

```
┌──────────┬────────────┬──────────────────────────┬──────────────────────────────────────────────────┐
│ name     │ category   │ repo_name                │ sub_category                                     │
├──────────┼────────────┼──────────────────────────┼──────────────────────────────────────────────────┤
│ Git      │ Dev        │ git/git                  │ Version Control and Collaboration                │
├──────────┼────────────┼──────────────────────────┼──────────────────────────────────────────────────┤
│ GitLab   │ Dev        │ gitlabhq/gitlabhq        │ Version Control and Collaboration                │
└──────────┴────────────┴──────────────────────────┴──────────────────────────────────────────────────┘
```

Seeing that each point contains the field 'repo_name' just like our original data source did, we can join the two data streams on this field, passing it like a SQL foreign key to the `join` processor. To not repeat the s3 bucket/folder name twice, we will put it into a const:

*18_view_joined_data.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/18_view_joined_data.juttle)]

```juttle
const s3 = 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial';
(
  read http -url '${s3}/github_data_sample.json' -format 'json';
  read http -url '${s3}/github_metadata.csv' -format 'csv'
)
| join repo_name
| head 2
```

```
┌────────────────────────────────────┬───────────────┬─────────────────────┬────────────┬─────────────────────────────────────────────┬────────────────────────────────┬─────────────────┐
│ time                               │ name          │ actor_login         │ category   │ repo_name                                   │ sub_category                   │ type            │
├────────────────────────────────────┼───────────────┼─────────────────────┼────────────┼─────────────────────────────────────────────┼────────────────────────────────┼─────────────────┤
│ 2015-01-04T03:03:37.000Z           │ Kubernetes    │ smarterclayton      │ Deploy     │ GoogleCloudPlatform/kubernetes              │ Microservice Platform          │ IssuesEvent     │
├────────────────────────────────────┼───────────────┼─────────────────────┼────────────┼─────────────────────────────────────────────┼────────────────────────────────┼─────────────────┤
│ 2015-01-04T03:18:18.000Z           │ Puppet        │ miksmile            │ Deploy     │ puppetlabs/puppet                           │ Configuration Management       │ ForkEvent       │
└────────────────────────────────────┴───────────────┴─────────────────────┴────────────┴─────────────────────────────────────────────┴────────────────────────────────┴─────────────────┘
```

Notice the syntax of combining the two data sources inside parentheses, then joining them with the join proc, like this:

```
read-1 \
        | join | ...
read-2 /
```

Since one of our data sources (metadata.csv) did not have timestamps, it was considered "timeless" by Juttle, and joined against the "timeful" data points in data.json as a straight up lookup by matching the value of 'repo_name' field. There are other kinds of joining for multiple sources of streaming data that take into account timestamps on all sides of the join. They are not covered in this tutorial but described in the [join](../processors/join.md) documentation.

Now our points include the 'name', 'category' and 'sub_category' fields, which we have not yet made use of. This will allow for interesting aggregations that would work best if we were using the full 30MB data set instead of the small sample we have.

## Bigger data is better! (ElasticSearch backend)

Our examples have been reading from files. That works fine until the data volume gets big enough that reading itself, not to mention processing in the Juttle runtime, slows down and tries the user's patience. Big data requires a big-data backend with optimized processing, and Juttle works with those via [adapters](../adapters/index.md).

In this tutorial, we will use ElasticSearch (ES) as the backend, with [elastic adapter](https://github.com/juttle/juttle-elastic-adapter).

### Configuring elastic adapter

Juttle will use the elastic adapter to read from, and write to, the ES instance that is described in the config file `~/.juttle/config.json`.

If you are running the docker container for this tutorial, it already contains an instance of Elasticsearch (with no GitHub data), and elastic adapter is properly configured.

If you're going the DIY route, make sure your `~/.juttle/config.json` points at the right ES instance. The file contents should look something like this:

```
{
  "adapters": {
      "elastic": [
          {
              "id": "docker",
              "address": "docker-local",
              "port": 9200
          }
      ]
  }
}
```

To validate that Juttle can read from the ES backend, try running:
```juttle
read elastic -from :0: -to :now:
| reduce count()
```
You should see a count of zero, if reading from an empty ES instance, or non-zero count if your ES already has some data in the default index named `juttle`. What you shouldn't see is any error.

### Writing to Elasticsearch

How will the data get into ES? There are many ingest options, from writing directly to ES API, to using Logstash, to using Juttle's `elastic` adapter, which is what we will do here, as it is the easiest path. We will read the data from files as we did above, joining it against metadata, and write out the resulting enriched data points to ES.

We will now switch to using the full 30MB data file instead of the small sample.

:warning: If you are using the provided docker container, skip the rest of this section, as the data is already loaded into ES. If you run this juttle, a duplicate set of records will be loaded.

If you are using your own instance of ES, proceed to execute this juttle to load data.

*write_from_s3_to_elasticsearch.juttle*

```juttle
const s3 = 'https://s3-us-west-2.amazonaws.com/juttle-data/github-tutorial';
(
  read http -url '${s3}/github_data.json' -format 'json';
  read http -url '${s3}/github_metadata.csv' -format 'csv'
)
| join repo_name
| write elastic
```

Take care to execute this program only once, to avoid getting duplicated data in ES.

Without overriding schema options, `write elastic` will put the data in a single ES index named `juttle`. When we use `read elastic` in the next section, it will read data from this default index.

### Reading from Elasticsearch

Let's start with checking how many data points got stored in ES:

*19_count_es_points.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/19_count_es_points.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
| reduce count()
```

```
┌──────────┐
│ count    │
├──────────┤
│ 216158   │
└──────────┘
```

This program is going to be optimized; rather than reading all of the records from ES and sending them over the wire just to count them up in the Juttle runtime, it will execute a properly formed query against ES to ask it to count the points, which ES can do very efficiently, and send back a single record with the resulting count. Many operations against a backend will be optimized in this way by the juttle adapter.

Now if we run any program we have previously executed (programs 01 through 21), replacing `read http ...` or `read file` line with `read elastic -from :2015-01-01: -to :2015-07-01:`, execution will be fast even though we're looking at a much bigger data set.

Specifying the time range is required; to read all stored data, we can do `read elastic -from :0: -to :now:`.

### Aggregating and searching ES

We can now do aggregations on fields like `category` which were not present in the original `github_data.json`, but are present in ES because we joined data and metadata before ingesting. Let's look at the count of events by repo category and subcategory, as a rough measure of popularity:

*20_reduce_by_two_fields_elastic.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/20_reduce_by_two_fields_elastic.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
| reduce count() by category, sub_category
| view table -columnOrder 'category', 'sub_category', 'count'
```

This Juttle program is also executing fast thanks to being optimized by the elastic adapter.

There is another advantage to rehosting the data in ES, besides optimizations: now we can do full text search (FTS), which wasn't supported by the file or http adapters.

FTS capability is of most interest on data that contains lots of free text, such as log messages or commit descriptions, which our dataset does not; but we can still try it out. Let's see which GitHub repos have anything to do with logging:

*21_reduce_from_elastic.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/21_reduce_from_elastic.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01: 'logging'
| reduce by repo_name
```

```
┌──────────────┐
│ repo_name    │
├──────────────┤
│ elastic      │
├──────────────┤
│ logstash     │
├──────────────┤
│ etsy         │
├──────────────┤
│ statsd       │
├──────────────┤
│ collectd     │
└──────────────┘
```

The search term applies to all fields and is treated as a substring (but not a subword, therefore searching for "log" will not match "logging"). The FTS above matches "Logging" category name, and the `reduce` gives us a list of repos that were in the search results.

## Got charts? (Using juttle-viewer to visualize data)

Even better would be to represent our data graphically. A [bar chart](http://juttle.github.io/juttle-viz/charts/barchart/) is a good way to visualize counts of categorical data.

### Juttle-viewer setup

In order to get visualizations in the browser, we will use `juttle-viewer` development environment, which is packaged as part of `juttle-engine`.

If you run the docker container for this tutorial, the `juttle-engine` daemon is already running, and you can execute the programs by clicking their names in the index table rendered in your browser at `http://$DOCKER_MACHINE_HOST:8080/?path=/examples/tutorial/index.juttle`.

If you did the local `npm install juttle-engine`, you will need to start the daemon:
```
juttle-engine -d &
```
We are assuming that you copied the juttle files to the expected location `/examples/github-tutorial`. After that, you will be able to run programs at `http://localhost:8080/?path=/examples/github-tutorial/index.juttle`.

You can navigate the programs in the browser by clicking the "file" icon in upper left corner, and selecting by filename. Programs that don't need any inputs will execute automatically; for programs with inputs, after selecting input values, click the Run button.

If you make changes to the Juttle code under `/examples/github-tutorial`, refresh the browser page to pick up the edits, then click the Run button. Alternatively you can make temporary edits directly in the browser with Edit button (the changes to juttles will not be saved).


### Juttle visualizations

Let's run the following Juttle that renders a barchart. To do so, select the program `22_barchart_repos.juttle` in the Viewer app from file icon.

*22_barchart_repos.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/22_barchart_repos.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
| reduce actors = count_unique('actor_login') by repo_name
| sort actors -desc
| view barchart
```

Try this to remove the long tail of the distribution: limit the bar chart to the top 20 repositories by adding `head 20`, and run the program again.

*23_barchart_top_repos.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/23_barchart_top_repos.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
| reduce actors = count_unique('actor_login') by repo_name
| sort actors -desc
| head 20
| view barchart
```

Juttle-viewer can render other charts from [juttle-viz library](http://juttle.github.io/juttle-viz/). The next section will use timechart as a common visualization for time series data, with optional overlay for event data.

For the rest of this tutorial, it makes sense to keep using juttle-viewer, as many programs will end in visualizations.

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

*24_time_range_of_data.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/24_time_range_of_data.juttle)]

```juttle
read elastic -from :0: -to :now:
|(
  head 1;
  tail 1
)
| keep time
```

:warning: This program currently encounters [bug #115](https://github.com/juttle/juttle-elastic-adapter/issues/115)

Using the above program, we see that our first point is from 2015-01-01 and
our last point is from 2015-07-01. All the other points in our data fall
between these dates.

In the above, we're using [`tail`](../processors/tail.md) and [`head`](../processors/head.md) to keep the first and the last
points of the stream. For convenience, we're also using [`keep`](../processors/keep.md) to strip the
points of all key/value pairs except their time stamp. Recall that the
parentheses and semicolon are the syntax for splitting the data stream into
two streams. The resulting topology looks like this:


```
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

*25_timechart_event_count.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/25_timechart_event_count.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
| reduce -every :day: count=count()
| view timechart
```

Try this to plot one series per GitHub event type: append `by type` at the end of the `reduce` line and run the program again, like this:

*26_timechart_series_by_type.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/26_timechart_series_by_type.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
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

*27_timechart_moving_window.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/27_timechart_moving_window.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
| reduce -over :2 weeks: -every :day: count=count()
| view timechart
```

:warning: This program currently encounters [bug #116](https://github.com/juttle/juttle-elastic-adapter/issues/116)

Things are much clearer now. With this new time chart, we see a clear upward
trend in the number of events over time.

The parameter names make the `reduce` invocation easy to understand: We are
`count`ing data `every` day `over` a two-week interval.

_Note:_ If `reduce` is only given `-every`, the value of `-over` is implicitly
set to be equal to the value of `-every`.

Here is another take on the trends, looking at counts by sub-category in a weekly moving window:

*28_timechart_joined_data_subcategory.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/28_timechart_joined_data_subcategory.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01:
| reduce -from :2015-01-01: -over :w: -every :d: count() by sub_category
| view timechart -keyField 'sub_category'
```

:warning: This program currently encounters [bug #116](https://github.com/juttle/juttle-elastic-adapter/issues/116)

We'll leave it up to you to look at the chart and interpret it. Without
giving anything away, we'll simply say that some categories appear to be growing
faster (at least their GitHub activity is) than others!

Now let's zoom in on the 'Microservice Platform' category
and look at counts for only the repositories in that category. We use a
[filter expression](../concepts/filtering.md) in the `read` source to
specify that we only want data points with `sub_category` field containing
the value "Microservice platform".

*29_timechart_joined_data_filtered.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/29_timechart_joined_data_filtered.juttle)]

```juttle
read elastic -from :2015-01-01: -to :2015-07-01: sub_category = 'Microservice Platform'
| reduce -from :2015-01-01: -over :w: -every :d: count() by 'repo_name'
| view timechart -keyField 'repo_name'

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

*30_input_controls.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/30_input_controls.juttle)]

```juttle
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
is more convenient. Let's change this using a `select` input which will be rendered as a dropdown selector in the browser.

*31_timechart_with_input_subcategory.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/31_timechart_with_input_subcategory.juttle)]

```juttle
input subcat: select -items [
  { value: 'Microservice Platform', label: 'Microservice Platform' },
  { value: 'Provisioning', label: 'Provisioning' },
  { value: 'Logging', label: 'Logging' }
  ]
  -label 'Sub-Category'
  -default 'Microservice Platform';

read elastic -from :2015-01-01: -to :2015-07-01: sub_category = subcat
| reduce -from :2015-01-01: -over :w: -every :d: count() by repo_name
| view timechart -keyField 'repo_name'
```

_Note:_ We used two new options in our input control. `-label` is a purely
cosmetic option that puts a label next to the associated input. This will
help make the input's purpose clearer, especially when sharing your code.
The other new option is `-items` which just lets us specify a list of possible
values for a dropdown input.

:construction: You will notice that we hard-coded three sub-categories while the data has more; once [this feature](https://github.com/juttle/juttle-viewer/issues/30) is implemented, we will be able to populate the dropdown with the output of another Juttle program, removing the need to explicitly list out the items.

## Finale (Analytics dashboard)

Now, let's conclude this tutorial by examining a more general program that
lets us view activity trends in our GitHub data set. The program uses two
inputs, allowing the user to select repo category and event type.

This program also creates a table and a [tile](http://juttle.github.io/juttle-viz/charts/tile/) with summary stats, in addition to the familiar timechart. The chart position is determined by `-row X -col Y` parameters, so the tile and table are in the first row, and the timechart is below them in the second row.

*32_final_dashboard.juttle* [[RUN](http://demo.juttle.io/?path=/examples/github-tutorial/32_final_dashboard.juttle)]

```juttle
input cat_in: select -items [
  { value: 'Dev', label: 'Dev' },
  { value: 'Deploy', label: 'Deploy' },
  { value: 'Monitor', label: 'Monitor' }
  ]
  -label 'Category'
  -default 'Dev';

input type_in: select -items [
  { value: 'IssuesEvent', label: 'Issues' },
  { value: 'ForkEvent', label: 'Forks' },
  { value: 'PushEvent', label: 'Pushes' },
  { value: 'Event', label: 'Any' }
  ]
  -label 'Event Type'
  -default 'Event';

read elastic -from :2015-01-01: -to :2015-07-01:
  category = cat_in AND type ~ '*${type_in}*'
|(
  reduce count()
  | view tile -title 'GitHub events count (${cat_in}, ${type_in})' -row 0 -col 0;

  reduce count() by repo_name
  | sort count -desc
  | head 10
  | view table -title 'GitHub events for top 10 repos (${cat_in}, ${type_in})' -row 0 -col 1;

  reduce -from :2015-01-01: -over :w: -every :d: count() by repo_name
  | view timechart -keyField 'repo_name' -title 'Rolling count of GitHub events (${cat_in}, ${type_in})' -row 1 -col 0;
)
```

_Note:_ This program uses
[string interpolation](../modules/string/#string-interpolation),
a handy feature when building strings that contain variables.

If you run Juttle Engine on an accessible server, other users can do analytics on your GitHub data set using this dashboard, without having to learn Juttle first.

## What next?

This concludes our tutorial, but we did not cover a number of Juttle features. Read about them in our documentation:

   * [functions](http://juttle.github.io/juttle/concepts/programming_constructs/#functions)
   * [subgraphs](http://juttle.github.io/juttle/concepts/programming_constructs/#subgraphs)
   * [modules](http://juttle.github.io/juttle/concepts/programming_constructs/#modules)
   * [defining your own reducers](http://juttle.github.io/juttle/reducers/juttle_reducers_user-defined/)

This tutorial used only two data sources: `file` and `elastic`, but there are many more supported [adapters](http://juttle.github.io/juttle/adapters/) to read from and write to various other backends.

The library of [visualizations](http://juttle.github.io/juttle-viz/) also has more to offer.

Make your data fluent in Juttle!
