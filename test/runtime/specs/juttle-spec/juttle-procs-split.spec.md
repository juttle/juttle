# Juttle "split" processor

## splits a named field
### Juttle
    emit -from :2000-01-01: -limit 1
    | put foo="bar", bleat="blort", peek="frean"
    | split foo, bleat
    | view result

### Output
    {time: "2000-01-01T00:00:00.000Z", name:"foo",   value:"bar",   peek:"frean"}
    {time: "2000-01-01T00:00:00.000Z", name:"bleat", value:"blort", peek:"frean"}

## splits with no named fields
### Juttle
    emit -from :2000-01-01: -limit 1
    | put foo="bar", bleat="blort", peek="frean"
    | split
    | view result

### Output
    {time: "2000-01-01T00:00:00.000Z", name:"foo",   value:"bar"}
    {time: "2000-01-01T00:00:00.000Z", name:"bleat", value:"blort"}
    {time: "2000-01-01T00:00:00.000Z", name:"peek", value:"frean"}

## splits an array
### Juttle
    emit -from :2000-01-01: -limit 1
    | put a=String.split("we will rock you"," "), bleat="blort", peek="frean"
    | split a, bleat
    | view result

### Output
    {time: "2000-01-01T00:00:00.000Z", name:"a",   value:"we",   peek:"frean"}
    {time: "2000-01-01T00:00:00.000Z", name:"a",   value:"will",   peek:"frean"}
    {time: "2000-01-01T00:00:00.000Z", name:"a",   value:"rock",   peek:"frean"}
    {time: "2000-01-01T00:00:00.000Z", name:"a",   value:"you",   peek:"frean"}
    {time: "2000-01-01T00:00:00.000Z", name:"bleat", value:"blort", peek:"frean"}

## doesnt split an array
### Juttle
    emit -from :2000-01-01: -limit 1
    | put a=String.split("we will rock you"," "), bleat="blort", peek="frean"
    | split -arrays 0 a, bleat
    | view result

### Output
    {time: "2000-01-01T00:00:00.000Z", name:"a",   value:["we", "will", "rock", "you"],  peek:"frean"}
    {time: "2000-01-01T00:00:00.000Z", name:"bleat", value:"blort", peek:"frean"}

## doesn't split an object
### Juttle
    emit -from :2000-01-01: -limit 1
    | put a={"we":"will","rock":"you"}, bleat="blort", peek="frean"
    | split a, bleat
    | view result

### Output
    {time: "2000-01-01T00:00:00.000Z", name:"a",   value:{"we":"will","rock":"you"}, peek:"frean"}
    {time: "2000-01-01T00:00:00.000Z", name:"bleat", value:"blort", peek:"frean"}

## splits points without time
### Juttle
    emit -from :2000-01-01: -limit 1
    | put foo="bar", bleat="blort", peek="frean", cookie="serious"
    | remove time
    | split foo, bleat
    | view result

### Output
    {name:"foo",   value:"bar",   peek:"frean", cookie:"serious"}
    {name:"bleat", value:"blort", peek:"frean", cookie:"serious"}


## complains about unknown options
### Juttle
    emit -limit 1 | split -arrays 0 -failure 1 foo, bar | remove time | view result

### Errors
   * unknown

## complains about missing split fields
### Juttle
    emit -limit 1
    | put foo="bar", bleat="blort", peek="frean", cookie="serious"
    | split foo, bar
    | remove time
    | view result

### Warnings
   * field "bar" does not exist

## complains about the presence of name as split field
### Juttle
    emit -limit 1 -from Date.new(0)
    | split peek, cookie, name
    | view result

### Errors
   * CompileError: Cannot split on name

## is not confused by the presence of name or value fields in points
### Juttle
    emit -limit 1 -from Date.new(0)
    | put foo="bar", bleat="blort", peek="frean", cookie="serious", name="joe", value="bigdata"
    | split peek, cookie
    | view result

### Output
    {
        "name": "peek",
        "value": "frean",
        "bleat": "blort",
        "foo": "bar",
        "time": "1970-01-01T00:00:00.000Z"
    }
    {
        "name": "cookie",
        "value": "serious",
        "bleat": "blort",
        "foo": "bar",
        "time": "1970-01-01T00:00:00.000Z"
    }

## default splits on all fields but name and time
### Juttle
    emit -limit 1 -from Date.new(0)
    | put foo="bar", bleat="blort", peek="frean", cookie="serious", name="joe", value="bigdata"
    | split
    | view result

### Output
    {
      "name": "foo",
      "time": "1970-01-01T00:00:00.000Z",
      "value": "bar"
    }
    {
      "name": "bleat",
      "time": "1970-01-01T00:00:00.000Z",
      "value": "blort"
    }
    {
      "name": "peek",
      "time": "1970-01-01T00:00:00.000Z",
      "value": "frean"
    }
    {
      "name": "cookie",
      "time": "1970-01-01T00:00:00.000Z",
      "value": "serious"
    }
    {
      "name": "value",
      "time": "1970-01-01T00:00:00.000Z",
      "value": "bigdata"
    }
