# Juttle Documentation README

This explains how the docs are produced. 

The documentation articles are written in GitHub flavored markdown. 

We use [mkdocs](http://mkdocs.org) for static site generation, that is, to produce html files out of markdown articles. 

The theme is ReadTheDocs theme supplied by mkdocs package, with a small [custom theme override](https://github.com/juttle/juttle/tree/master/docs/custom_theme) for the left sidebar, to have larger fonts, and to hide some articles from the sidebar menu. If further theme changes are desired, make them under `custom_theme`, our `mkdocs.yml` uses it.

:bulb: Support for GFM emoji is handled in a hackish way with `unimoji` Python markdown extension and custom images, see `mkdocs.yml`. 

The left sidebar layout, along with other configuration, is encoded in [mkdocs.yml](https://github.com/juttle/juttle/blob/master/mkdocs.yml). Hidden articles have names starting with underscore, such as `'____ Not For Left Sidebar Menu'`. This allows us to have a reasonable sized left menu, as collapsible menu sections are not yet supported by mkdocs.

:baby_symbol: We intend to publish the docs to [Read The Docs](https://readthedocs.org/) site, using their [mkdocs integration](https://read-the-docs.readthedocs.org/en/latest/builds.html#mkdocs) and a [GitHub webhook](https://read-the-docs.readthedocs.org/en/latest/webhooks.html#github) to auto-rebuild docs when updates are pushed. 

:warning: While the juttle repo is private, instead of Read The Docs we are publishing to [GitHub Pages](http://juttle.github.io/juttle/). There is no auto-updating right now, changes are published via a manual process with

```
mkdocs gh-deploy -c
```

To edit the docs, follow "Edit on GitHub" links from the published site, or clone the juttle repo and edit the markdown files. Feel free to edit inline on master for small changes, put up a PR on a branch for larger changes that need discussion.

If you add a new docs article, be sure to add it to `mkdocs.yml` to not break the build. Every referenced article must be listed under `pages:` ('____ Hidden' if you wish). Refer to the [docs template](doc_templates/template.md) for our doc standard on using emoji, section headers etc.

To test out the site locally, run:
```
mkdocs serve
```
Then access the docs site at `127.0.0.1:8000`. 

You need to have mkdocs, markdown-include and unimoji installed. We are currently on a fork with [PR pending](https://github.com/mkdocs/mkdocs/pull/752), in order to run with our fix to have proper "Edit on GitHub links", install mkdocs like this:
```
pip install markdown-include
pip install --upgrade git+git://github.com/kernc/mdx_unimoji.git
git clone https://github.com/dmehra/mkdocs.git
cd mkdocs
python setup.py install
```

:warning: The client-side search feature in mkdocs (powered by lunr.js) appears to be broken on master, so it will not work when you do `mkdocs serve` from our fork. Waiting to hear on this [issue](https://groups.google.com/forum/#!msg/mkdocs/AmwN77dwcsE/oqxJ9YlyCSUJ).
