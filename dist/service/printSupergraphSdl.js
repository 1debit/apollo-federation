"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBlockString = exports.printType = exports.printIntrospectionSchema = exports.printSupergraphSdl = void 0;
const graphql_1 = require("graphql");
const utilities_1 = require("../utilities");
const coreSpec_1 = require("../coreSpec");
const joinSpec_1 = require("../joinSpec");
const utils_1 = require("../composition/utils");
const directives_1 = require("../directives");
function printSupergraphSdl(schema, serviceList, options) {
    const config = schema.toConfig();
    const { FieldSetScalar, JoinFieldDirective, JoinTypeDirective, JoinOwnerDirective, JoinGraphEnum, JoinGraphDirective, graphNameToEnumValueName, } = joinSpec_1.getJoinDefinitions(serviceList);
    schema = new graphql_1.GraphQLSchema({
        ...config,
        directives: [
            coreSpec_1.CoreDirective,
            JoinFieldDirective,
            JoinTypeDirective,
            JoinOwnerDirective,
            JoinGraphDirective,
            ...config.directives,
        ],
        types: [FieldSetScalar, JoinGraphEnum, ...config.types],
    });
    const context = {
        graphNameToEnumValueName,
    };
    return printFilteredSchema(schema, (n) => !graphql_1.isSpecifiedDirective(n), isDefinedType, context, options);
}
exports.printSupergraphSdl = printSupergraphSdl;
function printIntrospectionSchema(schema, options) {
    return printFilteredSchema(schema, graphql_1.isSpecifiedDirective, graphql_1.isIntrospectionType, {}, options);
}
exports.printIntrospectionSchema = printIntrospectionSchema;
function isDefinedType(type) {
    return !graphql_1.isSpecifiedScalarType(type) && !graphql_1.isIntrospectionType(type);
}
function printFilteredSchema(schema, directiveFilter, typeFilter, context, options) {
    const directives = schema.getDirectives().filter(directiveFilter);
    const types = Object.values(schema.getTypeMap())
        .sort((type1, type2) => type1.name.localeCompare(type2.name))
        .filter(typeFilter);
    return ([printSchemaDefinition(schema)]
        .concat(directives.map((directive) => printDirective(directive, options)), types.map((type) => printType(type, context, options)))
        .filter(Boolean)
        .join('\n\n') + '\n');
}
function printSchemaDefinition(schema) {
    const operationTypes = [];
    const queryType = schema.getQueryType();
    if (queryType) {
        operationTypes.push(`  query: ${queryType.name}`);
    }
    const mutationType = schema.getMutationType();
    if (mutationType) {
        operationTypes.push(`  mutation: ${mutationType.name}`);
    }
    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType) {
        operationTypes.push(`  subscription: ${subscriptionType.name}`);
    }
    return ('schema' +
        printCoreDirectives(schema) +
        `\n{\n${operationTypes.join('\n')}\n}`);
}
function printCoreDirectives(schema) {
    const otherKnownDirectiveNames = directives_1.otherKnownDirectiveDefinitions.map(({ name }) => name);
    const schemaDirectiveNames = schema.getDirectives().map(({ name }) => name);
    const otherKnownDirectivesToInclude = schemaDirectiveNames.filter((name) => otherKnownDirectiveNames.includes(name));
    const otherKnownDirectiveSpecUrls = otherKnownDirectivesToInclude.map((name) => `https://specs.apollo.dev/${name}/v0.1`);
    return [
        'https://specs.apollo.dev/core/v0.1',
        'https://specs.apollo.dev/join/v0.1',
        ...otherKnownDirectiveSpecUrls,
    ].map((feature) => `\n  @core(feature: ${printStringLiteral(feature)})`);
}
function printType(type, context, options) {
    if (graphql_1.isScalarType(type)) {
        return printScalar(type, options);
    }
    else if (graphql_1.isObjectType(type)) {
        return printObject(type, context, options);
    }
    else if (graphql_1.isInterfaceType(type)) {
        return printInterface(type, context, options);
    }
    else if (graphql_1.isUnionType(type)) {
        return printUnion(type, options);
    }
    else if (graphql_1.isEnumType(type)) {
        return printEnum(type, options);
    }
    else if (graphql_1.isInputObjectType(type)) {
        return printInputObject(type, options);
    }
    throw Error('Unexpected type: ' + type.toString());
}
exports.printType = printType;
function printScalar(type, options) {
    return printDescription(options, type) + `scalar ${type.name}`;
}
function printObject(type, context, options) {
    const interfaces = type.getInterfaces();
    const implementedInterfaces = interfaces.length
        ? ' implements ' + interfaces.map((i) => i.name).join(' & ')
        : '';
    return (printDescription(options, type) +
        `type ${type.name}` +
        implementedInterfaces +
        printTypeJoinDirectives(type, context) +
        printFields(options, type, context));
}
function printTypeJoinDirectives(type, context) {
    var _a, _b;
    const metadata = (_a = type.extensions) === null || _a === void 0 ? void 0 : _a.federation;
    if (!metadata)
        return '';
    const { serviceName: ownerService, keys } = metadata;
    if (!ownerService || !keys)
        return '';
    const { [ownerService]: ownerKeys = [], ...restKeys } = keys;
    const ownerEntry = [
        ownerService,
        ownerKeys,
    ];
    const restEntries = Object.entries(restKeys);
    const shouldPrintOwner = graphql_1.isObjectType(type);
    const ownerGraphEnumValue = (_b = context.graphNameToEnumValueName) === null || _b === void 0 ? void 0 : _b[ownerService];
    utilities_1.assert(ownerGraphEnumValue, `Unexpected enum value missing for subgraph ${ownerService}`);
    const joinOwnerString = shouldPrintOwner
        ? `\n  @join__owner(graph: ${ownerGraphEnumValue})`
        : '';
    return (joinOwnerString +
        [ownerEntry, ...restEntries]
            .map(([service, keys = []]) => keys
            .map((selections) => {
            var _a;
            const typeGraphEnumValue = (_a = context.graphNameToEnumValueName) === null || _a === void 0 ? void 0 : _a[service];
            utilities_1.assert(typeGraphEnumValue, `Unexpected enum value missing for subgraph ${service}`);
            return `\n  @join__type(graph: ${typeGraphEnumValue}, key: ${printStringLiteral(utils_1.printFieldSet(selections))})`;
        })
            .join(''))
            .join(''));
}
function printInterface(type, context, options) {
    return (printDescription(options, type) +
        `interface ${type.name}` +
        printTypeJoinDirectives(type, context) +
        printFields(options, type, context));
}
function printUnion(type, options) {
    const types = type.getTypes();
    const possibleTypes = types.length ? ' = ' + types.join(' | ') : '';
    return printDescription(options, type) + 'union ' + type.name + possibleTypes;
}
function printEnum(type, options) {
    const values = type
        .getValues()
        .map((value, i) => printDescription(options, value, '  ', !i) +
        '  ' +
        value.name +
        printDeprecated(value) +
        printDirectivesOnEnumValue(type, value));
    return (printDescription(options, type) + `enum ${type.name}` + printBlock(values));
}
function printDirectivesOnEnumValue(type, value) {
    var _a;
    if (type.name === "join__Graph") {
        return ` @join__graph(name: ${printStringLiteral((value.value.name))} url: ${printStringLiteral((_a = value.value.url) !== null && _a !== void 0 ? _a : '')})`;
    }
    return '';
}
function printInputObject(type, options) {
    const fields = Object.values(type.getFields()).map((f, i) => printDescription(options, f, '  ', !i) + '  ' + printInputValue(f));
    return (printDescription(options, type) + `input ${type.name}` + printBlock(fields));
}
function printFields(options, type, context) {
    var _a, _b;
    const fields = Object.values(type.getFields()).map((f, i) => printDescription(options, f, '  ', !i) +
        '  ' +
        f.name +
        printArgs(options, f.args, '  ') +
        ': ' +
        String(f.type) +
        printDeprecated(f) +
        (graphql_1.isObjectType(type)
            ? printJoinFieldDirectives(f, type, context) +
                printOtherKnownDirectiveUsages(f)
            : ''));
    const isEntity = Boolean((_b = (_a = type.extensions) === null || _a === void 0 ? void 0 : _a.federation) === null || _b === void 0 ? void 0 : _b.keys);
    return printBlock(fields, isEntity);
}
function printJoinFieldDirectives(field, parentType, context) {
    var _a, _b, _c, _d;
    const directiveArgs = [];
    const fieldMetadata = (_a = field.extensions) === null || _a === void 0 ? void 0 : _a.federation;
    let serviceName = fieldMetadata === null || fieldMetadata === void 0 ? void 0 : fieldMetadata.serviceName;
    if (!serviceName && ((_b = parentType.extensions) === null || _b === void 0 ? void 0 : _b.federation.keys)) {
        serviceName = (_c = parentType.extensions) === null || _c === void 0 ? void 0 : _c.federation.serviceName;
    }
    if (serviceName) {
        const enumValue = (_d = context.graphNameToEnumValueName) === null || _d === void 0 ? void 0 : _d[serviceName];
        utilities_1.assert(enumValue, `Unexpected enum value missing for subgraph ${serviceName}`);
        directiveArgs.push(`graph: ${enumValue}`);
    }
    const requires = fieldMetadata === null || fieldMetadata === void 0 ? void 0 : fieldMetadata.requires;
    if (requires && requires.length > 0) {
        directiveArgs.push(`requires: ${printStringLiteral(utils_1.printFieldSet(requires))}`);
    }
    const provides = fieldMetadata === null || fieldMetadata === void 0 ? void 0 : fieldMetadata.provides;
    if (provides && provides.length > 0) {
        directiveArgs.push(`provides: ${printStringLiteral(utils_1.printFieldSet(provides))}`);
    }
    if (directiveArgs.length < 1)
        return '';
    return ` @join__field(${directiveArgs.join(', ')})`;
}
function printOtherKnownDirectiveUsages(field) {
    var _a, _b, _c;
    const otherKnownDirectiveUsages = ((_c = (_b = (_a = field.extensions) === null || _a === void 0 ? void 0 : _a.federation) === null || _b === void 0 ? void 0 : _b.otherKnownDirectiveUsages) !== null && _c !== void 0 ? _c : []);
    if (otherKnownDirectiveUsages.length < 1)
        return '';
    return ` ${otherKnownDirectiveUsages
        .slice()
        .sort((a, b) => a.name.value.localeCompare(b.name.value))
        .map(graphql_1.print)
        .join(' ')}`;
}
;
function printBlock(items, onNewLine) {
    return items.length !== 0
        ? onNewLine
            ? '\n{\n' + items.join('\n') + '\n}'
            : ' {\n' + items.join('\n') + '\n}'
        : '';
}
function printArgs(options, args, indentation = '') {
    if (args.length === 0) {
        return '';
    }
    if (args.every((arg) => !arg.description)) {
        return '(' + args.map(printInputValue).join(', ') + ')';
    }
    return ('(\n' +
        args
            .map((arg, i) => printDescription(options, arg, '  ' + indentation, !i) +
            '  ' +
            indentation +
            printInputValue(arg))
            .join('\n') +
        '\n' +
        indentation +
        ')');
}
function printInputValue(arg) {
    const defaultAST = graphql_1.astFromValue(arg.defaultValue, arg.type);
    let argDecl = arg.name + ': ' + String(arg.type);
    if (defaultAST) {
        argDecl += ` = ${graphql_1.print(defaultAST)}`;
    }
    return argDecl;
}
function printDirective(directive, options) {
    return (printDescription(options, directive) +
        'directive @' +
        directive.name +
        printArgs(options, directive.args) +
        (directive.isRepeatable ? ' repeatable' : '') +
        ' on ' +
        directive.locations.join(' | '));
}
function printDeprecated(fieldOrEnumVal) {
    if (!fieldOrEnumVal.isDeprecated) {
        return '';
    }
    const reason = fieldOrEnumVal.deprecationReason;
    const reasonAST = graphql_1.astFromValue(reason, graphql_1.GraphQLString);
    if (reasonAST && reason !== graphql_1.DEFAULT_DEPRECATION_REASON) {
        return ' @deprecated(reason: ' + graphql_1.print(reasonAST) + ')';
    }
    return ' @deprecated';
}
function printDescription(options, def, indentation = '', firstInBlock = true) {
    const { description } = def;
    if (description == null) {
        return '';
    }
    if ((options === null || options === void 0 ? void 0 : options.commentDescriptions) === true) {
        return printDescriptionWithComments(description, indentation, firstInBlock);
    }
    const preferMultipleLines = description.length > 70;
    const blockString = printBlockString(description, '', preferMultipleLines);
    const prefix = indentation && !firstInBlock ? '\n' + indentation : indentation;
    return prefix + blockString.replace(/\n/g, '\n' + indentation) + '\n';
}
function printDescriptionWithComments(description, indentation, firstInBlock) {
    const prefix = indentation && !firstInBlock ? '\n' : '';
    const comment = description
        .split('\n')
        .map((line) => indentation + (line !== '' ? '# ' + line : '#'))
        .join('\n');
    return prefix + comment + '\n';
}
function printStringLiteral(value) {
    return JSON.stringify(value);
}
function printBlockString(value, indentation = '', preferMultipleLines = false) {
    const isSingleLine = value.indexOf('\n') === -1;
    const hasLeadingSpace = value[0] === ' ' || value[0] === '\t';
    const hasTrailingQuote = value[value.length - 1] === '"';
    const hasTrailingSlash = value[value.length - 1] === '\\';
    const printAsMultipleLines = !isSingleLine ||
        hasTrailingQuote ||
        hasTrailingSlash ||
        preferMultipleLines;
    let result = '';
    if (printAsMultipleLines && !(isSingleLine && hasLeadingSpace)) {
        result += '\n' + indentation;
    }
    result += indentation ? value.replace(/\n/g, '\n' + indentation) : value;
    if (printAsMultipleLines) {
        result += '\n';
    }
    return '"""' + result.replace(/"""/g, '\\"""') + '"""';
}
exports.printBlockString = printBlockString;
//# sourceMappingURL=printSupergraphSdl.js.map