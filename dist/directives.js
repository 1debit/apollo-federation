"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeIncludesDirective = exports.gatherDirectives = exports.otherKnownDirectiveDefinitions = exports.federationDirectives = exports.TagDirective = exports.ProvidesDirective = exports.RequiresDirective = exports.ExternalDirective = exports.ExtendsDirective = exports.KeyDirective = void 0;
const graphql_1 = require("graphql");
exports.KeyDirective = new graphql_1.GraphQLDirective({
    name: 'key',
    locations: [graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE],
    args: {
        fields: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.ExtendsDirective = new graphql_1.GraphQLDirective({
    name: 'extends',
    locations: [graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.INTERFACE],
});
exports.ExternalDirective = new graphql_1.GraphQLDirective({
    name: 'external',
    locations: [graphql_1.DirectiveLocation.OBJECT, graphql_1.DirectiveLocation.FIELD_DEFINITION],
});
exports.RequiresDirective = new graphql_1.GraphQLDirective({
    name: 'requires',
    locations: [graphql_1.DirectiveLocation.FIELD_DEFINITION],
    args: {
        fields: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.ProvidesDirective = new graphql_1.GraphQLDirective({
    name: 'provides',
    locations: [graphql_1.DirectiveLocation.FIELD_DEFINITION],
    args: {
        fields: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.TagDirective = new graphql_1.GraphQLDirective({
    name: 'tag',
    locations: [graphql_1.DirectiveLocation.FIELD_DEFINITION],
    isRepeatable: true,
    args: {
        name: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
        },
    },
});
exports.federationDirectives = [
    exports.KeyDirective,
    exports.ExtendsDirective,
    exports.ExternalDirective,
    exports.RequiresDirective,
    exports.ProvidesDirective,
];
exports.otherKnownDirectiveDefinitions = [exports.TagDirective];
const apolloTypeSystemDirectives = [
    ...exports.federationDirectives,
    ...exports.otherKnownDirectiveDefinitions,
];
exports.default = apolloTypeSystemDirectives;
function hasDirectives(node) {
    return Boolean('directives' in node && node.directives);
}
function gatherDirectives(type) {
    let directives = [];
    if ('extensionASTNodes' in type && type.extensionASTNodes) {
        for (const node of type.extensionASTNodes) {
            if (hasDirectives(node)) {
                directives = directives.concat(node.directives);
            }
        }
    }
    if (type.astNode && hasDirectives(type.astNode))
        directives = directives.concat(type.astNode.directives);
    return directives;
}
exports.gatherDirectives = gatherDirectives;
function typeIncludesDirective(type, directiveName) {
    if (graphql_1.isInputObjectType(type))
        return false;
    const directives = gatherDirectives(type);
    return directives.some(directive => directive.name.value === directiveName);
}
exports.typeIncludesDirective = typeIncludesDirective;
//# sourceMappingURL=directives.js.map