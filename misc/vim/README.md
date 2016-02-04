# Vim plugins for Juttle

## Vim syntax highlighting

To install automatic syntax highlighting for Juttle programs:
1. Copy or link the filetype detection script to the ftdetect directory underneath your vim runtime directory (normally $HOME/.vim/ftdetect)
2. Copy or link syntax/juttle.vim to the syntax directory underneath your vim runtime directory (normally $HOME/.vim/syntax).

## Updating the rules

There's a simple bash script in syntax directory that can be called like so
`./update.sh` to simply update the syntax.vim based off the
`lib/parser/parser.pegjs` grammar directly and update the proc rules.
