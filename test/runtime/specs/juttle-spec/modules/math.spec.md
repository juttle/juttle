# The `Math.*` functions from ES5.1.

## All the constants are here

### Juttle

    emit -limit 1
    | put E=Math.E, LN10=Math.LN10, LN2=Math.LN2, LOG2E=Math.LOG2E, LOG10E=Math.LOG10E
    | put PI=Math.PI, SQRT1_2=Math.SQRT1_2, SQRT2=Math.SQRT2
    | remove time | view result

### Output

    {
    "E":2.718281828459045,
    "LN10":2.302585092994046,
    "LN2":0.6931471805599453,
    "LOG2E":1.4426950408889634,
    "LOG10E":0.4342944819032518,
    "PI":3.141592653589793,
    "SQRT1_2":0.7071067811865476,
    "SQRT2":1.4142135623730951
    }

## All the functions are here
Since these are currently implemented as direct JavaScript
Math.* invocations, we merely test for existence,
to catch any accidental language removals.

### Juttle

    emit -limit 1
    | put abs=Math.abs(1), acos=Math.acos(1), asin=Math.asin(1), atan=Math.atan(1), atan2=Math.atan2(1,1)
    | put ceil=Math.ceil(1), cos=Math.cos(1), exp=Math.exp(1), floor=Math.floor(1), log=Math.log(1)
    | put max=Math.max(1, 2), min=Math.min(1, 2), pow=Math.pow(1,2), random=Math.random(), round=Math.round(1)
    | put sin=Math.sin(1), sqrt=Math.sqrt(1), tan=Math.tan(1)
    | remove time,random | view result

### Output

    {
    "abs":1,
    "acos":0,
    "asin":1.5707963267948966,
    "atan":0.7853981633974483,
    "atan2":0.7853981633974483,
    "ceil":1,
    "cos":0.5403023058681398,
    "exp":2.718281828459045,
    "floor":1,
    "log":0,
    "max":2,
    "min":1,
    "pow":1,
    "round":1,
    "sin":0.8414709848078965,
    "sqrt":1,
    "tan":1.5574077246549023
    }
