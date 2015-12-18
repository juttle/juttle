Juttle stochastic adapter
================================================

stochastic with bad type complains
-------------------------
### Juttle
    read stochastic -source "cdn" -type 'bleat' | view result

### Errors

   * -type must be "metric" or "event"

stochastic with FTS complains
-------------------------
### Juttle
    read stochastic -source "cdn" "Never gonna get it" | view result

### Errors

   * CompileError: Error: Free text search is not implemented for stochastic adapter.

historic read
--------------------
### Juttle
    read stochastic -source "cdn" -nhosts 3 -from Date.new(0) -to Date.new(60)
    | reduce count() by host, service
    | view result

### Output
    { "host":"sea.0", "service":null, "count":122 }
    { "host":"sea.0", "service":"search", "count":422 }
    { "host":"sea.0", "service":"index", "count":422 }
    { "host":"sea.0", "service":"authentication", "count":422 }
    { "host":"sjc.1", "service":null, "count":122 }
    { "host":"sjc.1", "service":"search", "count":422 }
    { "host":"sjc.1", "service":"index", "count":422 }
    { "host":"sjc.1", "service":"authentication", "count":422 }
    { "host":"nyc.2", "service":null, "count":122 }
    { "host":"nyc.2", "service":"search", "count":422 }
    { "host":"nyc.2", "service":"index", "count":422 }
    { "host":"nyc.2", "service":"authentication", "count":422 }

historic read with source and a filter
--------------------------------------
### Juttle
    read stochastic -source "cdn" -nhosts 3 -from Date.new(0) -to Date.new(60)
        host="sea.0" AND service != "index"
    | reduce count() by host, service
    | view result

### Output
    { "host":"sea.0", "service":null, "count":122 }
    { "host":"sea.0", "service":"search", "count":422 }
    { "host":"sea.0", "service":"authentication", "count":422 }

historic read with source and a filter containing NOT
-----------------------------------------------------

Regression test for PROD-8651.

### Juttle
    read stochastic -source "cdn" -nhosts 3 -from Date.new(0) -to Date.new(60)
        host="sea.0" AND NOT service = "index"
    | reduce count() by host, service
    | view result

### Output
    { "host":"sea.0", "service":null, "count":122 }
    { "host":"sea.0", "service":"search", "count":422 }
    { "host":"sea.0", "service":"authentication", "count":422 }

historic read with source and -type metric
--------------------
### Juttle
    read stochastic -source "cdn" -nhosts 3 -from Date.new(0) -to Date.new(60) -type 'metric'
    | reduce count()
    | view result

### Output
    { "count":4164 }

historic read with -source and -type event
--------------------
### Juttle
    read stochastic -source "cdn" -nhosts 3 -from Date.new(0) -to Date.new(600) -type 'event'
    | reduce count()
    | view result

### Output
    { "count":6 }

don't choke on missing fields
-------------------------------
### Juttle
    read stochastic -source "cdn" -from Date.new(0) -to Date.new(60) host ~ "sea.0" AND value > 10
    | reduce avg(value) by host, service
    | view result

### Output
    { "host": "sea.0", "service": "search", avg: 73.47964643298138 }
    { "host": "sea.0", "service": "authentication", avg: 77.13041087896356 }
    { "host": "sea.0", "service": "index", avg: 54.38183514813025 }

don't swallow legitimate errors
-------------------------------
### Juttle
    read stochastic -source "cdn" -from Date.new(0) -to Date.new(60) host ~ "sea.0" AND host > 10
    | view result

### Errors

   * Invalid operand types for ">": string (sea.0) and number (10).

source "search_cluster" outputs something
-------------------------------
### Juttle
    read stochastic -source "srch_cluster" -from Date.new(0) -to Date.new(10)
    | reduce count() by host 
    | view result

### Output
    { "host": "sea.0", "count": 238 }
    { "host": "sjc.1", "count": 240 }
    { "host": "nyc.2", "count": 238 }
    { "host": "sea.3", "count": 238 }
    { "host": "sjc.4", "count": 238 }

source "saas" outputs something
-------------------------------
### Juttle
    read stochastic -source "saas" -from Date.new(0) -to Date.new(10)
    | reduce count() by host 
    | view result

### Output
    { "host": "us-east.0", "count": 310 }
    { "host": "us-west.1", "count": 310 }
    { "host": "us-east.2", "count": 310 }
    { "host": "us-west.3", "count": 310 }
    { "host": "us-east.4", "count": 310 }

source "ecommerce" outputs something
-------------------------------
### Juttle
    read stochastic -source "ecommerce" -from Date.new(0) -to Date.new(10)
    | reduce count() by host 
    | view result

### Output
	{ "host": "us-east.0", "count": 310 }
	{ "host": "us-west.1", "count": 310 }
	{ "host": "us-east.2", "count": 310 }
	{ "host": "us-west.3", "count": 310 }
    { "host": "us-east.4", "count": 310 }

source "badone" fails as expected
-------------------------
### Juttle
    read stochastic -source "badone" | view result

### Errors

   * CompileError: Error: Unknown source: badone
