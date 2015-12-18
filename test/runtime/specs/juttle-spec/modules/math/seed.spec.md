The `Math.seed` function
========================

seed wants a number
-------------------------
### Juttle
    const seed = Math.seed("juttle");
    emit -from Date.new(0) -limit 5
    | put r = Math.random()
    | view result

### Errors

  * Invalid argument type for "Math.seed": expected number, received string (juttle).

Seeded RNG is predictable
-------------------------
### Juttle
    const seed = Math.seed(42);
    emit -from Date.new(0) -limit 5
    | put r = Math.random()
    | view result

### Output
    { time: "1970-01-01T00:00:00.000Z", r: 0.0016341939679719736 }
    { time: "1970-01-01T00:00:01.000Z", r: 0.9364577392619949 }
    { time: "1970-01-01T00:00:02.000Z", r: 0.6594512913361081 }
    { time: "1970-01-01T00:00:03.000Z", r: 0.26366393983479847 }
    { time: "1970-01-01T00:00:04.000Z", r: 0.7841788012846541 }
