Juttle live tick tests
============================================

(skip)PROD-7471 merge forwards ticks
-------------------------
### Juttle
    (emit -every :2s: -limit 2
    | (put slow=true ; filter time < :now:)
    | pass;
    emit -every :1s: -limit 2
    | put fast=true;
    )
    | remove time
    | view result -ticks true

### Output
    {"slow": true}
    {"fast": true}
    {"tick": true}
    {"fast": true}
    {"tick": true}
    {"slow": true}
