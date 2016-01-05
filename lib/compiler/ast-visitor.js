/* global console */

var _ = require('underscore');
var Base = require('extendable-base');

/*
 * Debug mode flag. Set to "true" if you want to enable AST structure checks in
 * the traversing methods. This is useful when debugging visitor blowups
 * resulting from AST vs. visitor implementation inconsistencies.
 */
var DEBUG = false;

/*
 * Maps AST node types to names of their properties that contain AST nodes or
 * arrays of these ("children"). Properties not containing AST nodes
 * ("non-children") are not listed here.
 *
 * This pretty much defines how the AST is traversed.
 */
var NODE_CHILDREN = {
    /* Literals */
    NullLiteral:              [],
    BooleanLiteral:           [],
    NumericLiteral:           [],
    InfinityLiteral:          [],
    NaNLiteral:               [],
    StringLiteral:            [],
    MultipartStringLiteral:   ['parts'],
    RegularExpressionLiteral: [],
    MomentLiteral:            [],
    DurationLiteral:          [],
    ArrayLiteral:             ['elements'],
    ObjectLiteral:            ['properties'],
    ObjectProperty:           ['key', 'value'],

    /* Expressions */
    Variable:                 [],
    ToString:                 ['expression'],
    PropertyAccess:           ['base', 'name'],
    FunctionCall:             ['name', 'arguments'],
    ReducerCall:              ['name', 'arguments'], // added by semantic pass
    PostfixExpression:        ['expression'],
    UnaryExpression:          ['expression'],
    BinaryExpression:         ['left', 'right'],
    ConditionalExpression:    ['condition', 'trueExpression', 'falseExpression'],
    AssignmentExpression:     ['left', 'right'],

    /* Filter expressions */
    ExpressionFilterTerm:     ['expression'],
    SimpleFilterTerm:         ['expression'],
    FilterLiteral:            ['ast'],

    /* Procs (sorted alphabetically) */
    FieldListArgProc:         ['options', 'columns', 'groupby'],
    FilterProc:               ['filter'],
    FunctionProc:             ['op', 'options'],
    BuiltinProc:              ['options', 'arg'],
    OptionOnlyProc:           ['options'],
    PutProc:                  ['options', 'exprs', 'groupby'],
    ReadProc:                 ['options', 'filter'],
    ReduceProc:               ['options', 'exprs', 'groupby'],
    SingleArgProc:            ['options', 'arg', 'groupby'],
    SequenceProc:             ['filters'],
    SortProc:                 ['options', 'columns', 'groupby'],
    WriteProc:                ['options'],

    /* Graphs */
    ParallelGraph:            ['elements'],
    SequentialGraph:          ['elements'],
    ProcOption:               ['expr'],
    ByList:                   ['elements'],
    SortByList:               ['elements'],
    SortField:                ['expr'],
    Sink:                     ['options'],
    SinkOption:               ['expr'],
    InputOption:              ['expr'],

    /* Statements */
    StatementBlock:           ['elements'],
    EmptyStatement:           [],
    AssignmentStatement:      ['left', 'expr'],
    ConstStatement:           ['declarations'],
    ConstDecl:                ['expr'],
    InputStatement:           ['options'],
    VarStatement:             ['declarations'],
    VarDecl:                  ['expr'],
    ImportStatement:          ['modulename'],
    IfStatement:              ['condition', 'ifStatement', 'elseStatement'],
    ReturnStatement:          ['value'],
    ErrorStatement:           ['message'],

    /* Program Elements */
    FunctionDef:              ['args', 'elements'],
    ReducerDef:               ['args', 'elements'],
    SubDef:                   ['args', 'elements'],
    ModuleDef:                ['elements'],
    MainModuleDef:            ['elements', 'modules'],
    FormalArg:                ['default']
};

/*
 * Base class for implementing AST visitors.
 *
 * To implement a visiter, create a class derived from ASTVisitor and override
 * visit* methods for node types you are interested in. The default
 * implementation of visit* methods just traverses the AST and passes around
 * arguments.
 */
var ASTVisitor = Base.extend({
    visit: function(node) {
        return this['visit' + node.type].apply(this, arguments);
    },
});

// BEGIN DEBUGGING FUNCTIONS

function checkNode(node) {
    checkType(node);
    checkChildren(node);
    checkNonChildren(node);
}

function checkType(node) {
    if (!node.hasOwnProperty('type')) {
        error(node, 'Missing "type" property.');
    }
    if (typeof node.type !== "string" || !NODE_CHILDREN.hasOwnProperty(node.type)) {
        error(node, 'Invalid "type" property.');
    }
}

function checkChildren(node) {
    NODE_CHILDREN[node.type].forEach(function(property) {
        if (!node.hasOwnProperty(property)) {
            error(node, 'Missing "' + property + '" property.');
        }

        var value = node[property];

        if (_.isArray(value)) {
            value.forEach(function(item) {
                if (item !== null && !isNode(item)) {
                    error(node, 'Invalid "' + property + '" property (should be a node).');
                }
            });
        } else {
            if (value !== null && !isNode(value)) {
                error(node, 'Invalid "' + property + '" property (should be a node).');
            }
        }
    });
}

function checkNonChildren(node) {
    var nonChildren = _.difference(Object.keys(node), NODE_CHILDREN[node.type]);

    nonChildren.forEach(function(property) {
        var value = node[property];

        if (_.isArray(value)) {
            value.forEach(function(item) {
                if (isNode(item)) {
                    error(node, 'Invalid "' + property + '" property (shouldn\'t be a node).');
                }
            });
        } else {
            if (isNode(value)) {
                error(node, 'Invalid "' + property + '" property (shouldn\'t be a node).');
            }
        }
    });
}

function isNode(value) {
    return _.isObject(value) && value.hasOwnProperty("type");
}

function error(object, message) {
    console.log(object);
    throw new Error(message);
}

// END DEBUGGING FUNCTIONS

function addVisitFunction(type) {
    ASTVisitor.prototype['visit' + type] = function(node) {
        var self = this;
        var extraArgs = Array.prototype.slice.call(arguments, 1);

        if (DEBUG) {
            checkNode(node);
        }

        NODE_CHILDREN[type].forEach(function(property) {
            var value = node[property];

            if (_.isArray(value)) {
                value.forEach(function(item) {
                    if (item !== null) {
                        self.visit.apply(self, [item].concat(extraArgs));
                    }
                });
            } else if (value !== null && value !== undefined) {
                self.visit.apply(self, [value].concat(extraArgs));
            }
        });
    };
}

for (var type in NODE_CHILDREN) {
    addVisitFunction(type);
}

module.exports = ASTVisitor;
