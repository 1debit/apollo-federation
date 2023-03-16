"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeServices = exports.addFederationMetadataToSchemaNodes = exports.buildSchemaFromDefinitionsAndExtensions = exports.buildMapsFromServiceList = void 0;
const graphql_1 = require("graphql");
const apollo_graphql_1 = require("apollo-graphql");
const directives_1 = __importStar(require("../directives"));
const utils_1 = require("./utils");
const validate_1 = require("graphql/validation/validate");
const rules_1 = require("./rules");
const printSupergraphSdl_1 = require("../service/printSupergraphSdl");
const utilities_1 = require("../utilities");
const EmptyQueryDefinition = {
    kind: graphql_1.Kind.OBJECT_TYPE_DEFINITION,
    name: { kind: graphql_1.Kind.NAME, value: utils_1.defaultRootOperationNameLookup.query },
    fields: [],
    serviceName: null,
};
const EmptyMutationDefinition = {
    kind: graphql_1.Kind.OBJECT_TYPE_DEFINITION,
    name: { kind: graphql_1.Kind.NAME, value: utils_1.defaultRootOperationNameLookup.mutation },
    fields: [],
    serviceName: null,
};
function buildMapsFromServiceList(serviceList) {
    var _a;
    const typeDefinitionsMap = Object.create(null);
    const typeExtensionsMap = Object.create(null);
    const directiveDefinitionsMap = Object.create(null);
    const typeToServiceMap = Object.create(null);
    const externalFields = [];
    const keyDirectivesMap = Object.create(null);
    const valueTypes = new Set();
    const typeNameToFieldDirectivesMap = new Map();
    const otherKnownDirectiveUsages = new Set();
    for (const { typeDefs, name: serviceName } of serviceList) {
        const { typeDefsWithoutExternalFields, strippedFields, } = utils_1.stripExternalFieldsFromTypeDefs(typeDefs, serviceName);
        externalFields.push(...strippedFields);
        const typeDefsWithoutTypeSystemDirectives = utils_1.stripTypeSystemDirectivesFromTypeDefs(typeDefsWithoutExternalFields);
        for (const definition of typeDefsWithoutTypeSystemDirectives.definitions) {
            if (definition.kind === graphql_1.Kind.OBJECT_TYPE_DEFINITION ||
                definition.kind === graphql_1.Kind.OBJECT_TYPE_EXTENSION) {
                const typeName = definition.name.value;
                for (const keyDirective of utils_1.findDirectivesOnNode(definition, 'key')) {
                    if (keyDirective.arguments &&
                        utils_1.isStringValueNode(keyDirective.arguments[0].value)) {
                        keyDirectivesMap[typeName] = keyDirectivesMap[typeName] || {};
                        keyDirectivesMap[typeName][serviceName] =
                            keyDirectivesMap[typeName][serviceName] || [];
                        keyDirectivesMap[typeName][serviceName].push(utils_1.parseSelections(keyDirective.arguments[0].value.value));
                    }
                }
                for (const field of (_a = definition.fields) !== null && _a !== void 0 ? _a : []) {
                    captureTagUsages(field, typeName, typeNameToFieldDirectivesMap, otherKnownDirectiveUsages);
                }
            }
            if (graphql_1.isTypeDefinitionNode(definition)) {
                const typeName = definition.name.value;
                if (!typeToServiceMap[typeName]) {
                    typeToServiceMap[typeName] = {
                        extensionFieldsToOwningServiceMap: Object.create(null),
                    };
                }
                typeToServiceMap[typeName].owningService = serviceName;
                if (typeDefinitionsMap[typeName]) {
                    const isValueType = utils_1.typeNodesAreEquivalent(typeDefinitionsMap[typeName][typeDefinitionsMap[typeName].length - 1], definition);
                    if (isValueType) {
                        valueTypes.add(typeName);
                    }
                    typeDefinitionsMap[typeName].push({ ...definition, serviceName });
                }
                else {
                    typeDefinitionsMap[typeName] = [{ ...definition, serviceName }];
                }
            }
            else if (graphql_1.isTypeExtensionNode(definition)) {
                const typeName = definition.name.value;
                if (definition.kind === graphql_1.Kind.OBJECT_TYPE_EXTENSION ||
                    definition.kind === graphql_1.Kind.INPUT_OBJECT_TYPE_EXTENSION) {
                    if (!definition.fields)
                        break;
                    const fields = utils_1.mapFieldNamesToServiceName(definition.fields, serviceName);
                    if (typeToServiceMap[typeName]) {
                        typeToServiceMap[typeName].extensionFieldsToOwningServiceMap = {
                            ...typeToServiceMap[typeName].extensionFieldsToOwningServiceMap,
                            ...fields,
                        };
                    }
                    else {
                        typeToServiceMap[typeName] = {
                            extensionFieldsToOwningServiceMap: fields,
                        };
                    }
                }
                if (definition.kind === graphql_1.Kind.ENUM_TYPE_EXTENSION) {
                    if (!definition.values)
                        break;
                    const values = utils_1.mapFieldNamesToServiceName(definition.values, serviceName);
                    if (typeToServiceMap[typeName]) {
                        typeToServiceMap[typeName].extensionFieldsToOwningServiceMap = {
                            ...typeToServiceMap[typeName].extensionFieldsToOwningServiceMap,
                            ...values,
                        };
                    }
                    else {
                        typeToServiceMap[typeName] = {
                            extensionFieldsToOwningServiceMap: values,
                        };
                    }
                }
                if (typeExtensionsMap[typeName]) {
                    typeExtensionsMap[typeName].push({ ...definition, serviceName });
                }
                else {
                    typeExtensionsMap[typeName] = [{ ...definition, serviceName }];
                }
            }
            else if (utils_1.isDirectiveDefinitionNode(definition)) {
                const directiveName = definition.name.value;
                const executableLocations = definition.locations.filter(location => utils_1.executableDirectiveLocations.includes(location.value));
                if (executableLocations.length === 0)
                    continue;
                const definitionWithExecutableLocations = {
                    ...definition,
                    locations: executableLocations,
                };
                if (directiveDefinitionsMap[directiveName]) {
                    directiveDefinitionsMap[directiveName][serviceName] = definitionWithExecutableLocations;
                }
                else {
                    directiveDefinitionsMap[directiveName] = {
                        [serviceName]: definitionWithExecutableLocations,
                    };
                }
            }
        }
    }
    for (const { parentTypeName, field } of externalFields) {
        captureTagUsages(field, parentTypeName, typeNameToFieldDirectivesMap, otherKnownDirectiveUsages);
    }
    if (!typeDefinitionsMap.Query)
        typeDefinitionsMap.Query = [EmptyQueryDefinition];
    if (typeExtensionsMap.Mutation && !typeDefinitionsMap.Mutation)
        typeDefinitionsMap.Mutation = [EmptyMutationDefinition];
    return {
        typeToServiceMap,
        typeDefinitionsMap,
        typeExtensionsMap,
        directiveDefinitionsMap,
        externalFields,
        keyDirectivesMap,
        valueTypes,
        typeNameToFieldDirectivesMap,
        otherKnownDirectiveUsages,
    };
}
exports.buildMapsFromServiceList = buildMapsFromServiceList;
function captureTagUsages(field, typeName, typeNameToFieldDirectivesMap, otherKnownDirectiveUsages) {
    const tagUsages = utils_1.findDirectivesOnNode(field, 'tag');
    if (tagUsages.length > 0) {
        otherKnownDirectiveUsages.add('tag');
        const fieldToDirectivesMap = utilities_1.mapGetOrSet(typeNameToFieldDirectivesMap, typeName, new Map());
        const directives = utilities_1.mapGetOrSet(fieldToDirectivesMap, field.name.value, []);
        directives.push(...tagUsages);
    }
}
function buildSchemaFromDefinitionsAndExtensions({ typeDefinitionsMap, typeExtensionsMap, directiveDefinitionsMap, otherKnownDirectiveUsages, }) {
    let errors = undefined;
    const otherKnownDirectiveDefinitionsToInclude = directives_1.otherKnownDirectiveDefinitions.filter((directive) => otherKnownDirectiveUsages.has(directive.name));
    let schema = new graphql_1.GraphQLSchema({
        query: undefined,
        directives: [
            ...graphql_1.specifiedDirectives,
            ...directives_1.federationDirectives,
            ...otherKnownDirectiveDefinitionsToInclude,
        ],
    });
    function nodeHasInterfaces(node) {
        return 'interfaces' in node;
    }
    const definitionsDocument = {
        kind: graphql_1.Kind.DOCUMENT,
        definitions: [
            ...Object.values(typeDefinitionsMap).flatMap((typeDefinitions) => {
                if (!typeDefinitions.some(nodeHasInterfaces))
                    return typeDefinitions;
                const uniqueInterfaces = typeDefinitions.reduce((map, objectTypeDef) => {
                    var _a;
                    (_a = objectTypeDef.interfaces) === null || _a === void 0 ? void 0 : _a.forEach((iface) => map.set(iface.name.value, iface));
                    return map;
                }, new Map());
                if (uniqueInterfaces.size === 0)
                    return typeDefinitions;
                const [first, ...rest] = typeDefinitions;
                return [
                    ...rest,
                    {
                        ...first,
                        interfaces: Array.from(uniqueInterfaces.values()),
                    },
                ];
            }),
            ...Object.values(directiveDefinitionsMap).map((definitions) => Object.values(definitions)[0]),
        ],
    };
    errors = validate_1.validateSDL(definitionsDocument, schema, rules_1.compositionRules);
    try {
        schema = graphql_1.extendSchema(schema, definitionsDocument, {
            assumeValidSDL: true,
        });
    }
    catch (e) { }
    const extensionsDocument = {
        kind: graphql_1.Kind.DOCUMENT,
        definitions: Object.values(typeExtensionsMap).flat(),
    };
    errors.push(...validate_1.validateSDL(extensionsDocument, schema, rules_1.compositionRules));
    try {
        schema = graphql_1.extendSchema(schema, extensionsDocument, {
            assumeValidSDL: true,
        });
    }
    catch { }
    schema = new graphql_1.GraphQLSchema({
        ...schema.toConfig(),
        directives: [
            ...schema.getDirectives().filter((x) => !utils_1.isFederationDirective(x)),
        ],
    });
    return { schema, errors };
}
exports.buildSchemaFromDefinitionsAndExtensions = buildSchemaFromDefinitionsAndExtensions;
function addFederationMetadataToSchemaNodes({ schema, typeToServiceMap, externalFields, keyDirectivesMap, valueTypes, directiveDefinitionsMap, typeNameToFieldDirectivesMap, }) {
    var _a;
    for (const [typeName, { owningService, extensionFieldsToOwningServiceMap },] of Object.entries(typeToServiceMap)) {
        const namedType = schema.getType(typeName);
        if (!namedType)
            continue;
        const isValueType = valueTypes.has(typeName);
        const serviceName = isValueType ? null : owningService;
        const federationMetadata = {
            ...utils_1.getFederationMetadata(namedType),
            serviceName,
            isValueType,
            ...(keyDirectivesMap[typeName] && {
                keys: keyDirectivesMap[typeName],
            }),
        };
        namedType.extensions = {
            ...namedType.extensions,
            federation: federationMetadata,
        };
        if (graphql_1.isObjectType(namedType)) {
            for (const field of Object.values(namedType.getFields())) {
                const [providesDirective] = utils_1.findDirectivesOnNode(field.astNode, 'provides');
                if (providesDirective &&
                    providesDirective.arguments &&
                    utils_1.isStringValueNode(providesDirective.arguments[0].value)) {
                    const fieldFederationMetadata = {
                        ...utils_1.getFederationMetadata(field),
                        serviceName,
                        provides: utils_1.parseSelections(providesDirective.arguments[0].value.value),
                        belongsToValueType: isValueType,
                    };
                    field.extensions = {
                        ...field.extensions,
                        federation: fieldFederationMetadata,
                    };
                }
            }
        }
        for (const [fieldName, extendingServiceName] of Object.entries(extensionFieldsToOwningServiceMap)) {
            if (graphql_1.isObjectType(namedType)) {
                const field = namedType.getFields()[fieldName];
                if (!field)
                    continue;
                const fieldFederationMetadata = {
                    ...utils_1.getFederationMetadata(field),
                    serviceName: extendingServiceName,
                };
                field.extensions = {
                    ...field.extensions,
                    federation: fieldFederationMetadata,
                };
                const [requiresDirective] = utils_1.findDirectivesOnNode(field.astNode, 'requires');
                if (requiresDirective &&
                    requiresDirective.arguments &&
                    utils_1.isStringValueNode(requiresDirective.arguments[0].value)) {
                    const fieldFederationMetadata = {
                        ...utils_1.getFederationMetadata(field),
                        requires: utils_1.parseSelections(requiresDirective.arguments[0].value.value),
                    };
                    field.extensions = {
                        ...field.extensions,
                        federation: fieldFederationMetadata,
                    };
                }
            }
        }
    }
    for (const field of externalFields) {
        const namedType = schema.getType(field.parentTypeName);
        if (!namedType)
            continue;
        const existingMetadata = utils_1.getFederationMetadata(namedType);
        const typeFederationMetadata = {
            ...existingMetadata,
            externals: {
                ...existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.externals,
                [field.serviceName]: [
                    ...(((_a = existingMetadata === null || existingMetadata === void 0 ? void 0 : existingMetadata.externals) === null || _a === void 0 ? void 0 : _a[field.serviceName]) || []),
                    field,
                ],
            },
        };
        namedType.extensions = {
            ...namedType.extensions,
            federation: typeFederationMetadata,
        };
    }
    for (const directiveName of Object.keys(directiveDefinitionsMap)) {
        const directive = schema.getDirective(directiveName);
        if (!directive)
            continue;
        const directiveFederationMetadata = {
            ...utils_1.getFederationMetadata(directive),
            directiveDefinitions: directiveDefinitionsMap[directiveName],
        };
        directive.extensions = {
            ...directive.extensions,
            federation: directiveFederationMetadata,
        };
    }
    for (const [typeName, fieldsToDirectivesMap] of typeNameToFieldDirectivesMap.entries()) {
        const type = schema.getType(typeName);
        if (!type)
            continue;
        for (const [fieldName, otherKnownDirectiveUsages,] of fieldsToDirectivesMap.entries()) {
            const field = type.getFields()[fieldName];
            const seenNonRepeatableDirectives = {};
            const filteredDirectives = otherKnownDirectiveUsages.filter((directive) => {
                const name = directive.name.value;
                const matchingDirective = directives_1.default.find((d) => d.name === name);
                if (matchingDirective === null || matchingDirective === void 0 ? void 0 : matchingDirective.isRepeatable)
                    return true;
                if (seenNonRepeatableDirectives[name])
                    return false;
                seenNonRepeatableDirectives[name] = true;
                return true;
            });
            const existingMetadata = utils_1.getFederationMetadata(field);
            const fieldFederationMetadata = {
                ...existingMetadata,
                otherKnownDirectiveUsages: filteredDirectives,
            };
            field.extensions = {
                ...field.extensions,
                federation: fieldFederationMetadata,
            };
        }
    }
}
exports.addFederationMetadataToSchemaNodes = addFederationMetadataToSchemaNodes;
function composeServices(services) {
    const { typeToServiceMap, typeDefinitionsMap, typeExtensionsMap, directiveDefinitionsMap, externalFields, keyDirectivesMap, valueTypes, typeNameToFieldDirectivesMap, otherKnownDirectiveUsages, } = buildMapsFromServiceList(services);
    let { schema, errors } = buildSchemaFromDefinitionsAndExtensions({
        typeDefinitionsMap,
        typeExtensionsMap,
        directiveDefinitionsMap,
        otherKnownDirectiveUsages,
    });
    schema = new graphql_1.GraphQLSchema({
        ...schema.toConfig(),
        ...utilities_1.mapValues(utils_1.defaultRootOperationNameLookup, typeName => typeName
            ? schema.getType(typeName)
            : undefined),
        extensions: {
            serviceList: services
        }
    });
    schema = apollo_graphql_1.transformSchema(schema, type => {
        if (graphql_1.isObjectType(type)) {
            const config = type.toConfig();
            return new graphql_1.GraphQLObjectType({
                ...config,
                interfaces: Array.from(new Set(config.interfaces)),
            });
        }
        return undefined;
    });
    schema = graphql_1.lexicographicSortSchema(schema);
    addFederationMetadataToSchemaNodes({
        schema,
        typeToServiceMap,
        externalFields,
        keyDirectivesMap,
        valueTypes,
        directiveDefinitionsMap,
        typeNameToFieldDirectivesMap,
    });
    if (errors.length > 0) {
        return { schema, errors };
    }
    else {
        return {
            schema,
            supergraphSdl: printSupergraphSdl_1.printSupergraphSdl(schema, services),
        };
    }
}
exports.composeServices = composeServices;
//# sourceMappingURL=compose.js.map