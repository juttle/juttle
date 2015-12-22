# Juttle

[![Build Status](https://travis-ci.org/juttle/juttle.svg)](https://travis-ci.org/juttle/juttle)
[![Join the chat at https://gitter.im/juttle/juttle](https://badges.gitter.im/juttle/juttle.svg)](https://gitter.im/juttle/juttle?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Juttle is an analytics system for developers built upon
a stream-processing core and a
[dataflow language](http://juttle.github.io/juttle/concepts/dataflow)
that tightly integrates with
[streaming visualizations](http://github.com/juttle/juttle-viz).
The Juttle language lets you query,
analyze, and visualize live and historical data from many different
big data backends or other web services.
You read data from a backend service, analyze it using
*dataflow processors*, and send output to visualizations in the browser, write to a big-data store, post to http endpoints (e.g. alert to slack, pagerduty), etc.

See the [docs](http://juttle.github.io/juttle/) to learn more about [why juttle exists](http://juttle.github.io/juttle/),
get an [overview](http://juttle.github.io/juttle/concepts/overview) of the language, learn about the
[dataflow features](http://juttle.github.io/juttle/concepts/dataflow) and how to [program in juttle](http://juttle.github.io/juttle/concepts/programming_constructs), and more.

## Installation

Juttle requires [node.js](https://nodejs.org/) version 4.2 or later.

To use Juttle as a command-line tool, the simplest approach is to install the juttle package globally:

```
$ npm install -g juttle
```

You should now have a `juttle` executable in your path which you can use as follows:

```
$ juttle -e "emit -limit 2 | put message='hello'"
```

This produces:

```
┌────────────────────────────────────┬───────────┐
│ time                               │ message   │
├────────────────────────────────────┼───────────┤
│ 2015-12-18T21:04:52.322Z           │ hello     │
├────────────────────────────────────┼───────────┤
│ 2015-12-18T21:04:53.322Z           │ hello     │
└────────────────────────────────────┴───────────┘
```

To use Juttle as a JavaScript library, install the juttle package locally as part of your project:

```
$ npm install juttle
```

See the [command line reference](http://juttle.github.io/juttle/reference/cli) for more information about how to configure use the Juttle CLI and how to configure.

## Examples

Here are some more examples of what you can do with Juttle.

Note that most of these examples use Juttle in conjunction with external systems
using [adapters](#adapters) and/or depend on visualizations from an environment
like [outrigger](#outrigger) so they are meant to be
illustrative and not necessarily functional out of the box.

### Hello world

Hello world in Juttle:

```juttle
emit -every :1 second: -limit 10 | put message='hello world' | view table
```

### Error events on a timeseries graph

This example prompts a user to input a time range to query, pulls a timeseries
metric of counts of user signups from graphite, searches for 100 logs from
Elasticsearch in which the app field is 'login' and the string 'error' occurs,
and then plots the metric along with overlaid events on the same timechart along
with a table showing the errors themselves.

```javascript
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

### Real-time slack alerting from twitter events

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

<a name="adapters"></a>
## Adapters

Juttle includes support for a few basic [adapters](http://juttle.github.io/juttle/adapters)
out of the box to interact with files and some external systems. In addition,
through the external adapter API, Juttle can be easily extended to interact with
other storage systems or services.

#### Builtin

These adapters can be used in Juttle programs directly without special
configuration.

* [file](http://juttle.github.io/juttle/adapters/file)
* [http](http://juttle.github.io/juttle/adapters/http)
* [stochastic](http://juttle.github.io/juttle/adapters/stochastic)

#### External

This is a partial list of adapters that can be installed separately. Make sure to install them in the same location as you install juttle itself.

* [Elasticsearch](https://github.com/juttle/juttle-elastic-adapter/)
* [Graphite](https://github.com/juttle/juttle-graphite-adapter/)
* [InfluxDB](https://github.com/juttle/juttle-influx-adapter/)
* [SQLite](https://github.com/juttle/juttle-sqlite-adapter/)
* [PostgreSQL](https://github.com/juttle/juttle-postgres-adapter/)
* [MySQL](https://github.com/juttle/juttle-mysql-adapter/)
* [Twitter](https://github.com/juttle/juttle-twitter-adapter/)
* [Gmail](https://github.com/juttle/juttle-gmail-adapter/)

Connections to external adapters are configured in the "adapters" section of the runtime configuration. See the [CLI reference](http://juttle.github.io/juttle/reference/cli) for specific instructions.

<a name="outrigger"></a>
## Visualizations with Outrigger

The Juttle CLI and its backend adapters provide a
programmable foundation for dataflow-oriented analytics, but there is no
visualization at this bottommost layer.  Instead, data visualization is
layered on top of the Juttle core as a separate part of the Juttle stack.

To make it easy to interconnect analytics with visualization,
Juttle promotes a tight coupling between the language and the client-side
visualization library.  Rather than
having to tie together by hand a data processing layer with a separate
visualization layer (though you are free to do so if you have the time
and energy), Juttle integrates these two layers
so you don't have to worry about the details
of wiring Juttle dataflow computation to your browser-based views.

We haven't yet worked out all of the details of this separation, but
we've put together the components in a prototype test and development utility
called [outrigger](https://github.com/juttle/outrigger).
Outrigger pulls in the Juttle core from this repo along with
the [juttle-viz](https://github.com/juttle/juttle-viz) visualization library and corresponding glue
to implement Juttle's visualization capabilities.
Outrigger lets you run Juttle programs from your local file system
and present the results in a browser for experimentation, development,
and debugging of juttles.

## Contributing

Contributions are welcome! Please file an issue or open a pull request.

To check code style and run unit tests:
```
npm test
```

Both are run automatically by Travis.

When developing you may run into failures during linting where jscs complains
about your coding style and an easy way to fix those files is to simply run
`jscs --fix test` or `jscs --fix lib` from the root directory of the project.
After jscs fixes things you should proceed to check that those changes are
reasonable as auto-fixing may not produce the nicest of looking code.
