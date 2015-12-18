/*
 * Juttle Points Grammar
 * =====================
 *
 * Grammar describing a sequence of Juttle points (JSON objects), separated by
 * whitespace.
 *
 * Based on PEG.js example JSON grammar [1], with few important changes:
 *
 *   * Objects allow identifiers as keys.
 *
 *   * "Infinity", "-Infinity", "NaN", and "-NaN" are parsed as number literals.
 *
 * This, together with separating points by whitespace, allows easy copy-pasting
 * from text output.
 *
 * Modified/added sections of the JSON grammar are clearly marked.
 *
 * [1] https://github.com/dmajda/pegjs/blob/master/examples/json.pegjs
 */

/* ----- 1. Points (added) ----- */

points
  = first:object
    rest:(point_separator o:object { return o; })*
    { return [first].concat(rest); }
  / ws { return []; }

/* ----- 2. JSON Grammar (modified) ----- */

begin_array     = ws "[" ws
begin_object    = ws "{" ws
end_array       = ws "]" ws
end_object      = ws "}" ws
point_separator = ws
name_separator  = ws ":" ws
value_separator = ws "," ws

ws "whitespace" = [ \t\n\r]*

/* ----- 3. Values ----- */

value
  = false
  / null
  / true
  / object
  / array
  / number
  / string

false = "false" { return false; }
null  = "null"  { return null;  }
true  = "true"  { return true;  }

/* ----- 4. Objects (modified) ----- */

object
  = begin_object
    members:(
      first:member
      rest:(value_separator m:member { return m; })*
      {
        var result = {}, i;

        result[first.name] = first.value;

        for (i = 0; i < rest.length; i++) {
          result[rest[i].name] = rest[i].value;
        }

        return result;
      }
    )?
    end_object
    { return members !== null ? members: {}; }

member
  = name:(string / identifier) name_separator value:value {
      return { name: name, value: value };
    }

/* ----- 5. Arrays ----- */

array
  = begin_array
    values:(
      first:value
      rest:(value_separator v:value { return v; })*
      { return [first].concat(rest); }
    )?
    end_array
    { return values !== null ? values : []; }

/* ----- 6. Numbers (modified) ----- */

number "number"
  = minus?
    (int frac? exp? / infinity / nan)
    { return parseFloat(text()); }

decimal_point = "."
digit1_9      = [1-9]
e             = [eE]
exp           = e (minus / plus)? DIGIT+
frac          = decimal_point DIGIT+
int           = zero / (digit1_9 DIGIT*)
minus         = "-"
plus          = "+"
zero          = "0"
infinity      = "Infinity"
nan           = "NaN"

/* ----- 7. Strings ----- */

string "string"
  = quotation_mark chars:char* quotation_mark { return chars.join(""); }

char
  = unescaped
  / escape
    sequence:(
        '"'
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
    { return sequence; }

escape         = "\\"
quotation_mark = '"'
unescaped      = [\x20-\x21\x23-\x5B\x5D-\u10FFFF]

/* ----- 8. Identifiers (added) ----- */

/*
 * Compared to JavaScript, the identifier syntax is simplified. It follows what
 * I think JSON's author Douglas Crockford would have done had he chosen to add
 * this feature.
 */
identifier "identifier"
  = $((ALPHA / "_") (ALPHA / DIGIT / "_")*)

/* ----- Core ABNF Rules (modified) ----- */

/* See RFC 4234, Appendix B (http://tools.ietf.org/html/rfc4627). */
ALPHA  = [a-z]i
DIGIT  = [0-9]
HEXDIG = [0-9a-f]i
