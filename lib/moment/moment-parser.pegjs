start
     = MomentValue

// TODO: Can this be factored out of both parsers and just be included in?

SourceCharacter
  = .

_
  = WhiteSpace*

WhiteSpace "whitespace"
    = [\t\v\f \u00A0\uFEFF]

DecimalLiteral
   = parts:$(DecimalIntegerLiteral "." DecimalDigits?) {
       return parseFloat(parts);
   }
   / parts:$("." DecimalDigits)     { return parseFloat(parts); }
   / parts:$(DecimalIntegerLiteral) { return parseFloat(parts); }

DecimalIntegerLiteral
    = "0"
    / NonZeroDigit DecimalDigits?

Integer
    = $DecimalDigits

Integer2
    = $(DecimalDigit DecimalDigit)

Integer4
    = $(DecimalDigit DecimalDigit DecimalDigit DecimalDigit)

DecimalDigits
    = DecimalDigit+

DecimalDigit
    = [0-9]

NonZeroDigit
    = [1-9]

SignedInteger
    = [-+]? DecimalDigits

// ***************************    //

UnixTimeLiteral
    = s:DecimalLiteral !SourceCharacter {
        return {
            type: "UnixTimeLiteral",
            value: s
        }
    }

ISOTZ
    = "Z"
    / $(("+" / "-") Integer2 ":" Integer2 )
    / $(("+" / "-") Integer4 )

ISODate
    = $(Integer4 "-" Integer2 "-" Integer2)

ISOTime
    = $(Integer2 ":" Integer2 ":" Integer2 ("." DecimalDigits)?)

ISODateLiteral
    = d:ISODate t:$("T" ISOTime)? z:$ISOTZ? {
        return {
            type: "ISODateLiteral",
            value: d + (t? t : "T00:00:00") + (z ? z: "")
        }
    }

NowLiteral
    = "now" {
        return {
            type: "NowLiteral"
        };
    }

BeginningLiteral
    = "beginning" {
        return {
            type: "BeginningLiteral"
        };
    }


EndLiteral
    = "end" {
        return {
            type: "EndLiteral"
        };
    }

MomentString
    = NowLiteral
    / BeginningLiteral
    / EndLiteral
    / ISODateLiteral
    / UnixTimeLiteral

DurationUnit
    = string:DurationString "s" {
        return string;
    }
    / DurationString
    / DurationAbbrev

DurationString
    = "millisecond"
    / "second"
    / "minute"
    / "hour"
    / "day"
    / "week"

DurationAbbrev
    = "ms"
    / "s"
    / "m"
    / "h"
    / "d"
    / "w"

CalendarUnit
    = string:CalendarString "s" {
        return string;
    }
    / CalendarString
    / CalendarAbbrev

CalendarString
    = "day"
    / "week"
    / "month"
    / "year"

CalendarAbbrev
    = "d"
    / "w"
    / "M"
    / "y"

HumanDuration
    = num:Integer? _ unit:CalendarUnit {
        return {
            type: "MomentDuration",
            value: (num === null) ? 1 : num,
            unit: unit
        };
    }
    / num:DecimalLiteral? _ unit: DurationUnit {
        num = (num === null) ? 1 : num;

        return {
            type: "MomentDuration",
            value: num,
            unit: unit
        };
    }

FormattedDuration
    = (SignedInteger "/")? (SignedInteger ".")? SignedInteger ":" Integer ":" Integer ("." Integer)? {
        return {
            type: "MomentDuration",
            value: text(),
            unit: null
        };
    }

CalendarOffset
    = "first" _ unit:CalendarUnit _ "of" _ expr:CalendarExpression {
        return {
            type: "CalendarExpression",
            direction: "down",
            unit: unit,
            expression: expr
        };
    }
    / "final" _ unit:CalendarUnit _ "of" _ expr:CalendarExpression {
        return {
            type: "CalendarExpression",
            direction: "down",
            unit: unit,
            expression: {
                type: "CalendarExpression",
                direction: "up",
                unit: expr.unit,
                expression: expr
            }
        };
    }
    / ord:OrdinalOffset _ "of" _ expr:CalendarExpression {
        return {
            type: "BinaryExpression",
            operator: "+",
            left: expr,
            right: ord
        };
    }

CalendarExpression
    = "today" {
        return {
            type: "TodayLiteral"
        };
    }
    / "yesterday" {
        return {
            type: "YesterdayLiteral"
        };
    }
    / "tomorrow" {
        return {
            type: "TomorrowLiteral"
        };
    }
    / "this" _ unit:( CalendarUnit / DurationUnit ) {
        return {
            type: "CalendarExpression",
            direction: "down",
            unit: unit,
            expression: {
                type: "NowLiteral"
            }
        };
    }
    / ("prior" / "last") _ offset:(Integer _)? unit:( CalendarUnit / DurationUnit ) {
        var num = (offset === null) ? 1 : offset[0];

        return {
            type: "CalendarExpression",
            direction: "down",
            unit: unit,
            expression: {
                type: "BinaryExpression",
                operator: "-",
                left: {
                    type: "NowLiteral"
                },
                right: {
                   type: "MomentDuration",
                   value: num,
                   unit: unit
               }
            }
        };
    }
    / "next" _ offset:(Integer _)? unit:( CalendarUnit / DurationUnit ) {
        var num = (offset === null) ? 1 : offset[0];

        return {
            type: "CalendarExpression",
            direction: "down",
            unit: unit,
            expression: {
                type: "BinaryExpression",
                operator: "+",
                left: {
                    type: "NowLiteral"
                },
                right: {
                   type: "MomentDuration",
                   value: num,
                   unit: unit
               }
            }
        };
    }
    / unit:CalendarUnit _ "of" _ expr:MomentExpression {
        return {
            type: "CalendarExpression",
            direction: "down",
            unit: unit,
            expression: expr
        }
    }
    / CalendarOffset

OrdinalOffset
    = unit:CalendarUnit _ offset:Integer {
        return {
            type: "MomentDuration",
            value: offset - 1,
            unit: unit
        };
    }

OrdinalDuration
    = OrdinalOffset

DurationLiteral
    = "forever" {
        return {
            type: "ForeverLiteral"
        };
    }
    / FormattedDuration
    / HumanDuration

DurationExpression
    = left:DurationLiteral _ "and" _ right:DurationExpression {
        return {
            type: "BinaryExpression",
            operator: "+",
            left: left,
            right: right
        };
    }
    / DurationLiteral

MomentExpression
    = MomentString
    / "-" durationExpression:DurationExpression {
        return {
            type: "BinaryExpression",
            operator: "-",
            left: {
                type: "NowLiteral"
            },
            right: durationExpression
        };
    }
    / "+" durationExpression:DurationExpression {
        return {
            type: "BinaryExpression",
            operator: "+",
            left: {
                type: "NowLiteral"
            },
            right: durationExpression
        };
    }
    / durationExpression:DurationExpression _ "ago" {
        return {
            type: "BinaryExpression",
            operator: "-",
            left: {
                type: "NowLiteral"
            },
            right: durationExpression
        };
    }
    / durationExpression:DurationExpression _ "before" _ subExpression:( MomentExpression / CalendarExpression / MomentValue ) {
        return {
            type: "BinaryExpression",
            operator: "-",
            left: subExpression,
            right: durationExpression
        };
    }
    / durationExpression:DurationExpression _ ("after" / "from") _ subExpression:( MomentExpression / CalendarExpression / MomentValue ) {
        return {
            type: "BinaryExpression",
            operator: "+",
            left: subExpression,
            right: durationExpression
        };
    }

MomentValue
    = CalendarExpression
    / MomentExpression
    / MomentDuration

MomentDuration
    = OrdinalDuration
    / DurationExpression
