---
title: thisDocArticleTitle | Juttle Language Reference
---

thisDocArticleTitle
========

Plain text description goes here. Code `-parameters` should be inside backticks. End the line with two spaces to make it into end of paragraph.  

See [juttle template](../doc_templates/juttle_TEMPLATE.md) for a template specifically for juttle reference articles. This template is more extensive.

## About title header

The title header table at the top of this document displays nicely in GitHub as a little box; their own documentation uses that style.

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

## Markdown syntax

If you need a list, it's like this:
  * 1<sup>st</sup> item
  * 2<sup>nd</sup> item
  - Use html tags for little things like superscript/subscript, there's no native markdown for that.
  - both `*` and `-` work as bullet points.

:information_source: Note: if you need to make a note, do it with `:information_source:`.

:bulb: Tip: useful tips are marked with the `:bulb:`.

:baby_symbol: Experimental: this is how we mark up experimental sections. We used to have a beaker symbol in the old docs, the GFM emoji list has nothing like that, but there's that crawling `:baby_symbol:`.

:construction: In the works: this feature is in development or being revised, mark it with `:information_source:`.

To use another emoji from the [list of GFM supported emojis](http://www.emoji-cheat-sheet.com/), add it to `mkdocs.yml` and place a PNG image into `docs/images/emoji` dir.

`[link title](http://link/address)` is how you make a URL in markdown.

Linking to sections inside markdown docs is easy if your sections have headings; for example, I'm linking to ["About title header" section](#about-title-header). Easy. To link to a non-title section, you could put html anchor in there, but why bother.

Syntax of a juttle proc/etc is presented below in a code block, with no section header, just right there. Long form first, then short form after *or* .  

```javascript
function makeFencedCodeBlock() {
  // here is a code sample in a fenced code block
  // don't use four-space-indenting approach, we prefer fencing with triple backticks
  // this uses javascript syntax highlighting
}
```

*or*

```
// and this doesn't have any syntax highlighting.
```

Then we have a table with each parameter explained.  

## Tables

Notice that you're not allowed to put blank lines between table rows, so these tables tend to run dense. The only other option would be to do HTML tables, and we are trying to avoid that, for reasons of rendering difficulties with different markdown engines, and also because GFM tables are a bit more friendly. But dense.  

Parameter  |  Description  |  Required?
---------- | ------------- | ---------:
`-optionOne`  |  What this option does for you  |  No; defaults to `bananas`
`-optionTwo`  |  Has suboptions, use unordered list: <ul><li>aaa</li><li>bbb</li></ul><p>And so much text we had to put it into two paragraphs. </p><o>You have to use HTML tags for lists and paragraphs inside table cells. </o> |  Yes
`-optionThree` | Has suboptions with details, use definition list: <dl><dt>one</dt><dd>The first suboption</dd><dt>two</dt><dd>The second suboption</dd></dl>  | No

_Example: Title of usage example that follows, italicize this line_  

```
run my code!
```

_Example: This example has inputs and outputs_

Given this data point:

> {here: is, my: data, point: 0}  

This code:
```
run_my_code()
```

Yields the following output:

> {new: data, point: one}  
> {new: data, point: two}  

Mind the two trailing spaces so the quoted lines don't get merged together. This style of quoting the inputs/outputs is better displayed in Github than making everything a code block. Let's keep code blocks for actual code.

