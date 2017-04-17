# Using Juttle

This section provides examples of what you can do with Juttle. 

Most of these use case examples utilize Juttle in conjunction with external systems
using [adapters](adapters/index.md), and/or depend on visualizations from an environment
like [outrigger](https://github.com/juttle/outrigger). Eventually each will link to a runnable demo (docker container based); meanwhile, these examples are meant to be illustrative.

[TOC]

## Hello world

Hello world in Juttle:

```juttle
emit -every :1 second: -limit 10 | put message='hello world' | view table
```

## Error events on a timeseries graph

This example prompts a user to input a time range to query, pulls a timeseries
metric of counts of user signups from graphite, searches for 100 logs from
Elasticsearch in which the app field is 'login' and the string 'error' occurs,
and then plots the metric along with overlaid events on the same timechart along
with a table showing the errors themselves.

To run this program, you need [outrigger](https://github.com/juttle/outrigger), [elastic-adapter](https://github.com/juttle/juttle-elastic-adapter/), [graphite-adapter](https://github.com/juttle/juttle-graphite-adapter/).

```outrigger
input time_period: duration -label 'Time period to query' -default :5 minutes:;

read graphite -last time_period name~'app.login.*.signup.count'
| view timechart -title 'User Signups' -id 'signup_chart';

read elastic -last time_period app='login' 'errors'
| head 100
| (
    view table -title 'Errors';
    view events -on 'signup_chart'
  )
```

## Real-time slack alerting from twitter events

This example taps into the stream of real-time twitter events searching for 'apple' and printing them to a table. If more than 10 posts occur in a five second window, it posts a message to a slack webhook.

```juttle
read twitter -stream true 'apple'
| (
    view table -title 'Tweets about apple';

    reduce -every :5 seconds: value=count()
    | filter value > 10
    | put message='apple is trending'
    | write http -maxLength 1 -url 'https://hooks.slack.com/services/ABCDEF12345/BB8739872984/BADF00DFEEDDAB'
  )
```

## Sine wave chart

This example uses Juttle math primitives to draw a sine wave on a timechart, with configurable period and amplitude, provided by the user via input controls.

To run this program, you need [outrigger](https://github.com/juttle/outrigger).

```outrigger
input period: number -default 50 -label 'Sine Wave period';
input amplitude: number -default 10 -label 'Sine Wave amplitude';

emit -from :-5m: -limit 10000
| put value =  amplitude * Math.sin(Math.PI * count() / period)
| @timechart -title "Sine Wave";

emit -from :-5m: -limit 10000
| put value=count()
| put value = value * value
| @timechart -title "Geometric Growth";
```

## Coming Soon

More examples with pointers to docker containers with demo data, to allow easy execution. 

### Kitchen duty alerting to slack

### Stock quote data from Yahoo! Finance

### Twitter popularity race

### Accessing memes data in ElasticSearch

### Disk bandwidth data from a SQL database

### Monitoring Docker containers via cAdvisor and InfluxDB

### Plotting GitHub activity

### Apache access logs in ElasticSearch



