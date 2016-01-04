# How To Contribute

Thank you for taking the time to contribute to project Juttle!

The aim of this document is to make the process easy. These guidelines apply to new contributors as well as the regular project maintainers.

If you have questions, feel free to ask in our [Gitter chat room](https://gitter.im/juttle/juttle).

[TOC]

## Project Organization

We use GitHub issues to track bugs and enhancement requests. All you need to submit an issue is a GitHub user login. 

We accept GitHub Pull Requests (PRs) with code contributions.

Our project workflow is organized as a public [Waffle dashboard](https://waffle.io/juttle/juttle) that displays both GitHub issues and PRs.

Juttle is composed of multiple repositories. To submit bugs, enhancement requests, and code contributions in the right place, use this logical grouping:

- juttle - core language and CLI
- outrigger - dev environment with visualizations in the browser
- juttle-viz - charting library
- moment-parser - time handling library
- backend adapters:
  - juttle-elastic-adapter
  - juttle-influx-adapter
  - juttle-gmail-adapter
  - juttle-mysql-adapter
  - juttle-postgres-adapter
  - juttle-sqlite-adapter
  - juttle-twitter-adapter
  - etc.

If you are unclear on where to file an issue, ask us on [Gitter](https://gitter.im/juttle/juttle). Cross-repository issues can be filed in the main [juttle repo](https://github.com/juttle/juttle).

## What's Happening

We haven't started a project blog yet.

To know what's going on with project Juttle, you can view our GitHub issues. The ones with "idea" label represent future directions of work, the ones with "ehnancement" labels are outstanding feature requests, and the ones with "bug" label are known defects.

The roadmap will be published [soon](https://github.com/juttle/juttle/issues/63) as a GitHub Wiki.

You can "star" our GitHub repositories to bookmark them and show your interest. You may separately elect to "watch" the repos to be notified of new issues and pull requests (this can get noisy due to all the activity).

To see open issues for a given repository, look under "Issues" in the GitHub UI, for example [open issues in juttle repo](https://github.com/juttle/juttle/issues). To see all issues for project Juttle in a single place, use the [Waffle dashboard](https://waffle.io/juttle/juttle) and set the filter (in upper right corner) to "Issues Only". You can enter search terms in the filter to see issues of interest, for example, enter "time travel" to see if anyone already asked for Juttle to support it.

The Waffle board also gives an idea of what's being worked on ("In Progress" column), what will be worked on imminently ("Assigned") and soon ("Ready"). The "Backlog" column is not in a perfectly sorted order.

We use these GitHub labels for issue types:

Label       | Meaning
----------- | --------
bug         | Code doesn't work as intended
enhancement | Request to support a new feature or behavior
question    | How do I do thing X in Juttle? Why doesn't thing Y work?
idea        | Future work direction, bigger and fuzzier than "enhancement"
test        | Testing task (add tests, fix tests)
docs        | Documentation issue (add docs, fix docs)
task        | Internal task (code cleanup, refactoring) with no user facing impact
performance | Performance issue

We use these GitHub labels for issue transitions:

Label       | Meaning
----------- | --------
triaged     | Reviewed by project maintainers and added to backlog
ready       | Short-listed to be worked on soon (next sprint)
assigned    | Assigned to be worked on now (current sprint)
in progress | Actively being worked on (has a branch, has open PR)

There is no label for "done" issues, they get closed when done.

When searching for issues in the GitHub UI, you can add `label:X` to find a subset of issues, for example "is:issue is:closed label:question" will find answered questions. The Waffle UI also allows searching by label as well as repository, assignee, and free text search on issue names. Note that Waffle only shows the last 7 days of "done" issues; use the GitHub UI to search across older closed issues.

## Filing Bugs

If you ran into a bug when using Juttle, let us know by filing a GitHub issue in the right repository (for example: if the problem is specific to `write elastic`, file it in the juttle-elastic-adapter repo). If you can't tell which component is responsible for the bug, file it in the main [juttle repo](https://github.com/juttle/juttle).

Before filing the bug, please check if it's already known by searching the GitHub issues in the repository, or the [Waffle dashboard](https://waffle.io/juttle/juttle) which covers all repos. If the bug is already filed, please add a note to the issue so we know you also ran into it.

When filing a new bug, use GitHub label "bug" to help us triage the issue.

Include the following information:
- expected behavior, based on documentation or your intuition
- actual behavior, including error output
- juttle program you ran (put it in a code block if the program is short, attach in a text file if long)
- sample data (if your program reads from a storage backend, explain the data format)
- steps to reproduce the problem, if it's more than just running your juttle program
- screenshot of the browser output, if the problem is with juttle-viz or outrigger
- version of the code you used (for example, 'juttle@0.1.0' as reported by `npm list`, or "master as of rev abcd")

We like to attend to newly filed bugs within a business day or two. When we've looked at your submission, it will acquire a "triaged" label. If we have further questions, we will ask them on the GitHub issue, and you will get an email notification. If it's clearly a bug that should be fixed, we will get it assigned for work, and PR will be attached to the issue when work is underway. When the PR merges, the bug will be considered fixed, and the GitHub issue will be automatically closed. At that point, the master branch will have the fix for your bug; publishing the new release to npm will happen a bit later. 

## Asking Questions

If you want to run something by us that's not quite a bug, but not really a feature request either, more of a question (for example, "How to do a right outer join in Juttle?"), file us a GitHub issue with label "question".

We do not currently have an FAQ, but do a search on GitHub issues to see if someone else has already asked your question (be sure to remove the default `is:open` from the search, to cover answered questions).

For a quick response, try the [Gitter](https://gitter.im/juttle/juttle) chat room.

## Updating Docs

If you run into issues with our documentation (missing docs, incorrect docs, broken links), file us a GitHub issue with label "docs".

When viewing our published docs for [juttle](http://juttle.github.io/juttle) and [juttle-viz](http://juttle.github.io/juttle-viz/), you will also have the option to "Edit on GitHub". This is great for fixing typos - no need to go through the trouble of filing a GitHub issue just to tell us to 's/aaa/aba', simply make a pull request to get it fixed. We will gratefully merge it.

## Requesting Enhancements

If you want Juttle to do something it doesn't yet do, let us know by filing a GitHub issue in the right repository (ie: the main juttle repo for core language enhancements, juttle-viz for charts, adapter repos for enhancements to reading and writing to various backends). To request support for new backends, which do not have an juttle-adapter-X repo, submit the issue in the [main juttle repo](https://github.com/juttle/juttle).

Check if your request has already been filed by searching GitHub issues for the right repository, or [Waffle dashboard](https://waffle.io/juttle/juttle) which covers all repos. If there is already an issue for your request, add a note to it so we know you also want this feature. The note can be as simple as "+1" for "me too", or include the details of your use case, which we'd love to know about.

When filing a new request, use GitHub label "enhancement" to help us triage the issue.

Describe the desired new feature or enhancement, and the use case it will enable for you.

We like to respond to enhancement requests within a few business days. We will comment on the issue and mark it with "triaged" label once we understand how to handle the request. We may need to ask you additional questions first, before we are able to triage it. If we are unable to honor the request, we will close the issue with an explanation. The "triaged" requests enter our backlog and eventually get scheduled for work. You can look at our public [Waffle dashboard](https://waffle.io/juttle/juttle) to get an idea of where in the queue your request stands (note that it's not a fully prioritized list).

To get enhancements implemented faster, please help us by contributing code!

## Contributing Code

Pull Requests (PRs) can be opened for existing GitHub issues, or independently. We generally file issues for non-trivial bits of work, while small fixes can start life in a PR without an associated issue.

### Maintainers

Please follow these guidelines for sanity of work tracking in [Waffle](https://waffle.io/juttle/juttle).

If your PR is for a GitHub issue, include the issue number in your branch name (for example, name your branch "add-flux-capacitor-#88" for GitHub issue #88). When you push code on this branch, the issue will move into "in progress" state automatically (done by our Waffle bot).

Include one of [GitHub closing keywords](https://help.github.com/articles/closing-issues-via-commit-messages/) in your PR description (for example, "resolves #88"). If you do this, the Waffle dashboard will show this PR as attached to the issue #88, and not standalone. When the PR is merged, the issue will be automatically closed by the Waffle bot.

If you want Waffle to show the PR attached to the issue, but don't want it to close the issue upon merge (because there are multiple PRs for the same issue), use a special Waffle keyword "connects to" in the PR description (for example, "connects to #88"). This only works if the keyword is in PR description, not in the later comments (you can always edit the description).

If you don't do these things, you will need to manually transition the GitHub issue by adding label "in progress" and closing it when it's done. That's fine, just more work for you.

We also use "ready" and "assigned" labels for issue state transitions. Those are normally auto-assigned by Waffle when issues are moved between columns in the Waffle UI. This should just work, see the [Waffle FAQ](https://github.com/waffleio/waffle.io/wiki/FAQs) for more info.

### Contributors

If you do not have commit privileges on the Juttle project repositories, you will need to fork the repo in order to put up a PR. Then create a topic branch from where you want to base your work (usually, master):

```
git checkout -b support-time-travel-#88 master
```

Work on this branch and make commits of logical units of work, with commit messages describing the work. Run tests and make documentation updates (see [next section](#everyone)). When ready, push the commits and create a Pull Request.

If your PR is for an existing GitHub issue, use "resolves" keyword in the PR description to tie the PR to the issue (for example, "resolves #88"). If this is a standalone PR, not connected to any issue, you don't need to do anything special with keywords. We will add keywords and labels as needed, so you may see new ones showing up on your PR - don't worry about it.

If you know who should review your contribution, @mention them by username on the PR; otherwise we will choose a reviewer from project maintainers.

Once you have created a PR, we will be notified, review the code (along with tests and docs), comment on the PR if there are questions or additional requirements before we can accept it, and once it passes review, merge it from your fork into master.

### Everyone

Run tests on your branch to ensure no regression has occurred:

```
npm test
```

This command in any of the juttle project repositories will check code style and run unit tests.

When you put up a PR, the same tests will be run by Travis, our CI infrastructure, and their pass/fail status will be reported in a badge on your PR. Naturally, tests must pass before the PR can merge. 

When adding new functionality, you should add tests that cover it. Part of the checks run by Travis is to calculate code coverage by unit tests.

When developing you may run into failures during linting where jscs complains about your coding style. An easy way to fix those files is to simply run `jscs --fix test` or `jscs --fix lib` from the root directory of the project. After jscs fixes things you should proceed to check that those changes are reasonable, as auto-fixing may not produce the nicest looking code.

Be sure to update documentation when you make user-facing changes. Small repositories such as the adapters only have the README.md file, where updates should be made. For juttle and juttle-viz, we maintain doc articles in the `docs` directory, and publish them to GitHub Pages. You can preview these docs by running `mkdocs serve` command in the root directory. See the [docs README](docs/README.md) for more info on maintaining docs.

When adding Juttle code, follow the [Juttle Style Guide](docs/references/style_guide.md). If you add *.juttle programs under docs/examples, or embedded anywhere in the docs markdown articles as a code block with `juttle` language marker, they will be automatically syntax-checked when tests are run.


