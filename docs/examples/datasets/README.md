# Sample Datasets

A lot of juttle examples in this documentation use `emit` as the data source.

Examples that call for more complex data sets rely on `read file` source with `-file 'filename.json` option, that allows to read data points from a local file in JSON array format, like this:

```juttle
read file -file 'docs/examples/datasets/input1.json'
| reduce count() by hostname
| view table
```

The dataset files are presented below. 

### Dataset 1

Tiny fake data set:
```
{!docs/examples/datasets/input1.json!}
```

### Dataset 2

Log messages, generated from the synthetic data source
```
stochastic -source 'logs'
```
See file [stochastic_logs.json](stochastic_logs.json) with points like this:
```
  {
    "time": "2015-11-23T01:25:16.000Z",
    "host": "sea.0",
    "pop": "sea",
    "source_type": "event",
    "name": "syslog",
    "message": "[ 62875 ] cfg80211: World regulatory domain updated:"
  }
```

### Dataset 3

Host metrics, generated from the synthetic data source
```
stochastic -source 'cdn' -nhosts 3 -dos 0.5 -last :5 minutes: -source_type 'metrics' name = 'requests' OR name = 'response_ms' OR name = 'responses'
```
See file [stochastic_cdn_nhosts3_dos05_pts100.json](stochastic_cdn_nhosts3_dos05_pts100.json) with points like this:
```
  {
    "host": "sea.0",
    "pop": "sea",
    "service": "search",
    "source_type": "metric",
    "name": "requests",
    "time": "2015-11-23T01:47:10.000Z",
    "value": 28.096945568298626
  }
```
