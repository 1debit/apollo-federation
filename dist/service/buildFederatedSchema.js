"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFederatedSchema = void 0;
const graphql_1 = require("graphql");
const apollo_graphql_1 = require("apollo-graphql");
const directives_1 = require("../directives");
const types_1 = require("../types");
const printFederatedSchema_1 = require("./printFederatedSchema");
function buildFederatedSchema(modulesOrSDL) {
    let shapedModulesOrSDL;
    if ('typeDefs' in modulesOrSDL) {
        const { typeDefs, resolvers } = modulesOrSDL;
        const augmentedTypeDefs = Array.isArray(typeDefs) ? typeDefs : [typeDefs];
        shapedModulesOrSDL = augmentedTypeDefs.map((typeDefs, i) => {
            const module = { typeDefs };
            if (i === 0 && resolvers)
                module.resolvers = resolvers;
            return module;
        });
    }
    else {
        shapedModulesOrSDL = modulesOrSDL;
    }
    const modules = apollo_graphql_1.modulesFromSDL(shapedModulesOrSDL);
    let schema = apollo_graphql_1.buildSchemaFromSDL(modules, new graphql_1.GraphQLSchema({
        query: undefined,
        directives: [...graphql_1.specifiedDirectives, ...directives_1.federationDirectives],
    }));
    const sdl = printFederatedSchema_1.printSchema(schema);
    if (!schema.getQueryType()) {
        schema = new graphql_1.GraphQLSchema({
            ...schema.toConfig(),
            query: new graphql_1.GraphQLObjectType({
                name: 'Query',
                fields: {},
            }),
        });
    }
    const entityTypes = Object.values(schema.getTypeMap()).filter(type => graphql_1.isObjectType(type) && directives_1.typeIncludesDirective(type, 'key'));
    const hasEntities = entityTypes.length > 0;
    schema = apollo_graphql_1.transformSchema(schema, type => {
        if (graphql_1.isObjectType(type) && type === schema.getQueryType()) {
            const config = type.toConfig();
            return new graphql_1.GraphQLObjectType({
                ...config,
                fields: {
                    ...(hasEntities && { _entities: types_1.entitiesField }),
                    _service: {
                        ...types_1.serviceField,
                        resolve: () => ({ sdl }),
                    },
                    ...config.fields,
                },
            });
        }
        return undefined;
    });
    schema = apollo_graphql_1.transformSchema(schema, type => {
        if (hasEntities && graphql_1.isUnionType(type) && type.name === types_1.EntityType.name) {
            return new graphql_1.GraphQLUnionType({
                ...types_1.EntityType.toConfig(),
                types: entityTypes.filter(graphql_1.isObjectType),
            });
        }
        return undefined;
    });
    for (const module of modules) {
        if (!module.resolvers)
            continue;
        apollo_graphql_1.addResolversToSchema(schema, module.resolvers);
    }
    return schema;
}
exports.buildFederatedSchema = buildFederatedSchema;
//# sourceMappingURL=buildFederatedSchema.js.map