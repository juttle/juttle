var Base = require('extendable-base');

module.exports = Base.extend({
    initialize: function(options) {
        this.limit = (options && options.limit) ? options.limit : 1024;
    }
});
