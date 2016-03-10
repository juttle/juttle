# The Juttle Ecosystem

![Juttle Ecosystem](../docs/images/JuttleEcosystemDiagram.png)

The Juttle Ecosystem consists of the following projects:

* [juttle](https://github.com/juttle/juttle) contains the core Juttle compiler, the JavaScript runtime, a set of basic adapters to connect to files or http sources, and a command line interface with text-based and tabular views.

* [juttle-engine](https://github.com/juttle/juttle-engine) is an execution environment for Juttle, which packages together the following components into a complete development and visualization environment.

* [juttle-service](https://github.com/juttle/juttle-service) is a remote execution engine built on node.js for running Juttle programs in response to REST API requests.

* [juttle-viz](https://github.com/juttle/juttle-viz) is a visualization library based on D3 that can render the results of Juttle programs as streaming charts.

* [juttle-client-library](https://github.com/juttle/juttle-client-library) is a client-side JavaScript application that interacts with juttle-service to execute juttle programs and render the results in the browser, including support for programmable input controls.

* [juttle-viewer](https://github.com/juttle/juttle-client-viewer) is a development and presentation application for juttle programs that packages juttle-client-library, juttle-viz, and application logic to select and run juttle programs using a remote juttle engine (either packaged within juttle-engine or standalone).

* Adapters are the interface between the Juttle runtime and back end data sources. These adapters allow Juttle programs to both read and write data from various sources, including ElasticSearch, InfluxDB, Postgres, MySQL, S3, CloudWatch, AWS, and we're adding more all the time.
