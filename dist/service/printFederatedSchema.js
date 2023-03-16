"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printBlockString = exports.printType = exports.printIntrospectionSchema = exports.printSchema = void 0;
const graphql_1 = require("graphql");
const types_1 = require("../types");
const utils_1 = require("../composition/utils");
const directives_1 = require("../directives");
function printSchema(schema, options) {
    return printFilteredSchema(schema, (n) => !graphql_1.isSpecifiedDirective(n) && !utils_1.isApolloTypeSystemDirective(n), isDefinedType, options);
}
exports.printSchema = printSchema;
function printIntrospectionSchema(schema, options) {
    return printFilteredSchema(schema, graphql_1.isSpecifiedDirective, graphql_1.isIntrospectionType, options);
}
exports.printIntrospectionSchema = printIntrospectionSchema;
function isDefinedType(type) {
    return (!graphql_1.isSpecifiedScalarType(type) &&
        !graphql_1.isIntrospectionType(type) &&
        !types_1.isFederationType(type));
}
function printFilteredSchema(schema, directiveFilter, typeFilter, options) {
    const directives = schema.getDirectives().filter(directiveFilter);
    const types = Object.values(schema.getTypeMap())
        .sort((type1, type2) => type1.name.localeCompare(type2.name))
        .filter(typeFilter);
    return ([printSchemaDefinition(schema)]
        .concat(directives.map(directive => printDirective(directive, options)), types.map(type => printType(type, options)))
        .filter(Boolean)
        .join('\n\n') + '\n');
}
function printSchemaDefinition(schema) {
    if (isSchemaOfCommonNames(schema)) {
        return;
    }
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
    return `schema {\n${operationTypes.join('\n')}\n}`;
}
function isSchemaOfCommonNames(schema) {
    const queryType = schema.getQueryType();
    if (queryType && queryType.name !== 'Query') {
        return false;
    }
    const mutationType = schema.getMutationType();
    if (mutationType && mutationType.name !== 'Mutation') {
        return false;
    }
    const subscriptionType = schema.getSubscriptionType();
    if (subscriptionType && subscriptionType.name !== 'Subscription') {
        return false;
    }
    return true;
}
function printType(type, options) {
    if (graphql_1.isScalarType(type)) {
        return printScalar(type, options);
    }
    else if (graphql_1.isObjectType(type)) {
        return printObject(type, options);
    }
    else if (graphql_1.isInterfaceType(type)) {
        return printInterface(type, options);
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
function printObject(type, options) {
    const interfaces = type.getInterfaces();
    const implementedInterfaces = interfaces.length
        ? ' implements ' + interfaces.map(i => i.name).join(' & ')
        : '';
    const isExtension = type.extensionASTNodes && type.astNode && !type.astNode.fields;
    return (printDescription(options, type) +
        (isExtension ? 'extend ' : '') +
        `type ${type.name}${implementedInterfaces}` +
        printFederationDirectives(type) +
        printFields(options, type));
}
function printInterface(type, options) {
    const isExtension = type.extensionASTNodes && type.astNode && !type.astNode.fields;
    return (printDescription(options, type) +
        (isExtension ? 'extend ' : '') +
        `interface ${type.name}` +
        printFederationDirectives(type) +
        printFields(options, type));
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
        printDeprecated(value));
    return (printDescription(options, type) + `enum ${type.name}` + printBlock(values));
}
function printInputObject(type, options) {
    const fields = Object.values(type.getFields()).map((f, i) => printDescription(options, f, '  ', !i) + '  ' + printInputValue(f));
    return (printDescription(options, type) + `input ${type.name}` + printBlock(fields));
}
function printFields(options, type) {
    const fields = Object.values(type.getFields()).map((f, i) => printDescription(options, f, '  ', !i) +
        '  ' +
        f.name +
        printArgs(options, f.args, '  ') +
        ': ' +
        String(f.type) +
        printDeprecated(f) +
        printFederationDirectives(f) +
        printOtherKnownDirectiveUsages(f));
    return printBlock(fields);
}
function printFederationDirectives(typeOrField) {
    if (!typeOrField.astNode)
        return '';
    if (graphql_1.isInputObjectType(typeOrField))
        return '';
    const federationDirectivesOnTypeOrField = directives_1.gatherDirectives(typeOrField)
        .filter((n) => directives_1.federationDirectives.some((fedDir) => fedDir.name === n.name.value))
        .map(graphql_1.print);
    const dedupedDirectives = [...new Set(federationDirectivesOnTypeOrField)];
    return dedupedDirectives.length > 0 ? ' ' + dedupedDirectives.join(' ') : '';
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
function printBlock(items) {
    return items.length !== 0 ? ' {\n' + items.join('\n') + '\n}' : '';
}
function printArgs(options, args, indentation = '') {
    if (args.length === 0) {
        return '';
    }
    if (args.every(arg => !arg.description)) {
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
    if (reasonAST && reason !== '' && reason !== graphql_1.DEFAULT_DEPRECATION_REASON) {
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
        .map(line => indentation + (line !== '' ? '# ' + line : '#'))
        .join('\n');
    return prefix + comment + '\n';
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
//# sourceMappingURL=printFederatedSchema.js.map