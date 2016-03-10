# How To Contribute

Thank you for taking the time to contribute to project Juttle!

The aim of this document is to make the process easy. These guidelines apply to new contributors as well as the regular project maintainers.

If you have questions, feel free to ask in our [Gitter chat room](https://gitter.im/juttle/juttle).

Topics:
- [Submitting Issues](#submitting-issues)
- [Filing Bugs](#filing-bugs)
- [Asking Questions](#asking-questions)
- [Updating Docs](#updating-docs)
- [Requesting Enhancements](#requesting-enhancements)
- [Contributing Code](#contributing-code)

## Submitting Issues

If you run into a bug, have a question, or need an ehnancement, let us know by filing a GitHub issue. All you need to submit an issue is a GitHub user login.

Project Juttle is composed of multiple repositories, and it helps us if you file the issue in the right one (for example: if the issue is specific to `write elastic`, file it in the juttle-elastic-adapter repo). See the list of repos on our [wiki](https://github.com/juttle/juttle/wiki/Project-Organization).

If you can't tell which repo is the right one for your issue, file it in the main [juttle repo](https://github.com/juttle/juttle).

Before filing a new issue, please check if it's already known by searching the GitHub issues in the repository, or the [Waffle dashboard](https://waffle.io/juttle/juttle) which covers all repos. Note that Waffle only shows open issues + recent closed issues. To search closed issues, use the GitHub UI.

## Filing Bugs

If you ran into a bug when using Juttle, let us know by filing a GitHub issue with label "bug".

If you searched existing issues and found that your bug is already filed, please add a note to the issue so we know you also ran into it.

When filing a new bug, include:
- expected behavior, based on documentation or your intuition
- actual behavior, including error output
- juttle program you ran (put it in a code block if the program is short, attach in a text file if long)
- sample data (if your program reads from a storage backend, explain the data format)
- steps to reproduce the problem, if it's more than just running your juttle program
- screenshot of the browser output, if the problem is with juttle-viz or juttle-viewer
- version of the code you used (for example, 'juttle@0.1.0' as reported by `npm list`, or "master as of rev abcd")

What will happen to the bug next? See [wiki](https://github.com/juttle/juttle/wiki/Managing-Issues#bugs).

## Asking Questions

If you want to run something by us that's not quite a bug, but not really a feature request either, more of a question (for example, "How to do a right outer join in Juttle?"), file us a GitHub issue with label "question".

We do not currently have an FAQ, but do a search on GitHub issues to see if someone else has already asked your question (be sure to remove the default `is:open` from the search, to cover answered questions).

For a quick response, try the [Gitter](https://gitter.im/juttle/juttle) chat room.

## Updating Docs

If you run into issues with our documentation (missing docs, incorrect docs, broken links), file us a GitHub issue with label "docs".

When viewing our published docs for [juttle](http://juttle.github.io/juttle) and [juttle-viz](http://juttle.github.io/juttle-viz/), you will also have the option to "Edit on GitHub". This is great for fixing typos - no need to go through the trouble of filing a GitHub issue just to tell us to 's/aaa/aba', simply make a pull request to get it fixed. We will gratefully merge it.

## Requesting Enhancements

If you want Juttle to do something it doesn't yet do, let us know by filing a GitHub issue with the label "ehancement".

To request support for new backends, which do not have an juttle-adapter-X repo, submit the issue in the [main juttle repo](https://github.com/juttle/juttle).

If you searched existing issues and found that your request is already filed, please add a note to it so we know you also want this feature. The note can be as simple as "+1" for "me too", or include the details of your use case, which we'd love to know about.

When filing a new request, describe the desired new feature or enhancement, and the use case it will enable for you.

What will happen to the request next? See [wiki](https://github.com/juttle/juttle/wiki/Managing-Issues#enhancement-requests).

## Contributing Code

To get bugs fixed and enhancements implemented faster, please help us by contributing code!

You can open a Pull Request (PR) for an existing GitHub issue, or independently.

Project maintainers follow the development workflow described on the [wiki](https://github.com/juttle/juttle/wiki/Development-Workflow).

### Branching

If you do not have commit privileges on the Juttle project repositories, you will need to fork the repo in order to put up a PR. Then create a topic branch from where you want to base your work (usually, master):

```
git checkout -b support-time-travel-#88 master
```

Work on this branch and make commits of logical units of work, with commit messages describing the work. Run tests and make documentation updates. When ready, push the commits and create a Pull Request.

### Testing

Run tests on your branch to ensure no regression has occurred:

```
npm test
```

This command in any of the juttle project repositories will check code style and run unit tests.

When you put up a PR, the same tests will be run by Travis, our CI infrastructure, and their pass/fail status will be reported in a badge on your PR. Naturally, tests must pass before the PR can merge. 

When adding new functionality, you should add tests that cover it. Part of the checks run by Travis is to calculate code coverage by unit tests.

### Documentation

Be sure to update documentation when you make user-facing changes. Small repositories such as the adapters only have the README.md file, where updates should be made. For juttle and juttle-viz, we maintain doc articles in the `docs` directory, and publish them to GitHub Pages. You can preview these docs by running `mkdocs serve` command in the root directory. See the [docs README](docs/README.md) for more info on maintaining docs.

### Style

When developing you may run into failures during linting where eslint complains about your JavaScript coding style. An easy way to fix those files is to simply run `eslint --fix test` or `eslint --fix lib` from the root directory of the project. After eslint fixes things you should proceed to check that those changes are reasonable, as auto-fixing may not produce the nicest looking code.

When adding Juttle code, follow the [Juttle Style Guide](docs/references/style_guide.md). If you add *.juttle programs under docs/examples, or embedded anywhere in the docs markdown articles as a code block with `juttle` language marker, they will be automatically syntax-checked when tests are run.

### Pull Requests

Once your code is ready and tests pass, push it on the branch and create a PR.

If your PR is for an existing GitHub issue, use "resolves" keyword in the PR description to tie the PR to the issue (for example, "resolves #88"). If this is a standalone PR, not connected to any issue, you don't need to do anything special with keywords. We will add keywords and labels as needed, so you may see new ones showing up on your PR - don't worry about it.

If you know who should review your contribution, @mention them by username on the PR; otherwise we will choose a reviewer from project maintainers.

Once you have created a PR, we will be notified, review the code (along with tests and docs), comment on the PR if there are questions or additional requirements before we can accept it, and once it passes review, merge it from your fork into master.
