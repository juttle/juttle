# Juttle tests

## simple emit

### Juttle

    emit -from Date.new(0) -hz 1000 -limit 10 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z"}
    { time: "1970-01-01T00:00:00.001Z"}
    { time: "1970-01-01T00:00:00.002Z"}
    { time: "1970-01-01T00:00:00.003Z"}
    { time: "1970-01-01T00:00:00.004Z"}
    { time: "1970-01-01T00:00:00.005Z"}
    { time: "1970-01-01T00:00:00.006Z"}
    { time: "1970-01-01T00:00:00.007Z"}
    { time: "1970-01-01T00:00:00.008Z"}
    { time: "1970-01-01T00:00:00.009Z"}

## simple test1

### Juttle

    emit -from Date.new(0) -hz 1000 -limit 1 | put x="$80B" | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", x: "$80B"}

## simple emit2

### Juttle

    emit -from Date.new(0) -hz 1000 -limit 10 | view result

### Output

    { time: "1970-01-01T00:00:00.000Z"}
    { time: "1970-01-01T00:00:00.001Z"}
    { time: "1970-01-01T00:00:00.002Z"}
    { time: "1970-01-01T00:00:00.003Z"}
    { time: "1970-01-01T00:00:00.004Z"}
    { time: "1970-01-01T00:00:00.005Z"}
    { time: "1970-01-01T00:00:00.006Z"}
    { time: "1970-01-01T00:00:00.007Z"}
    { time: "1970-01-01T00:00:00.008Z"}
    { time: "1970-01-01T00:00:00.009Z"}

## simple module test

### Module `M1`

    export const ten = 10;

### Juttle

    import "M1" as mod;
    emit -from Date.new(0) -hz 1000 -limit 1 | put x=mod.ten | view result

### Output

    { time: "1970-01-01T00:00:00.000Z", x:10}

## reduce shortcut with a Module

### Module `utils`

    export reducer adder(fieldname) {
       var s = 0;
       function update() { s = s + *fieldname; }
       function result() { return s; }
    }

### Juttle

    import "utils" as u;
    emit -from Date.new(0) -hz 1000 -limit 10 | put x=1 | reduce u.adder('x') | view result

### Output

    { adder:10 }

## merge is the nondelaying merge
verify that merge does not hang onto points that could be forwarded immediately

### Juttle
    emit -limit 2 | ( put color = 'red' ; put color = 'green' )
    | put t = Date.elapsed(:now:)
    | put -over :1s: dt = last(t) - first(t)
    | put winning = dt < .01 | keep winning
    | view result

### Output
    {"winning":true}
    {"winning":true}
    {"winning":true}
    {"winning":true}
