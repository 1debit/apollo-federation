"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagDirective = void 0;
const directives_1 = require("../../../directives");
const graphql_1 = require("graphql");
const KnownArgumentNamesRule_1 = require("graphql/validation/rules/KnownArgumentNamesRule");
const ProvidedRequiredArgumentsRule_1 = require("graphql/validation/rules/ProvidedRequiredArgumentsRule");
const validate_1 = require("graphql/validation/validate");
const utils_1 = require("../../utils");
const errorsMessagesToFilter = directives_1.federationDirectives.map((directive) => `Unknown directive "@${directive.name}".`);
const tagDirective = ({ name: serviceName, typeDefs, }) => {
    const directiveRules = [
        KnownArgumentNamesRule_1.KnownArgumentNamesOnDirectivesRule,
        graphql_1.KnownDirectivesRule,
        ProvidedRequiredArgumentsRule_1.ProvidedRequiredArgumentsOnDirectivesRule,
    ];
    const errors = validate_1.validateSDL(typeDefs, undefined, directiveRules);
    let tagDirectiveDefinition;
    graphql_1.visit(typeDefs, {
        DirectiveDefinition(node) {
            if (node.name.value === 'tag') {
                tagDirectiveDefinition = node;
                return graphql_1.BREAK;
            }
        },
    });
    if (tagDirectiveDefinition) {
        const printedTagDefinition = 'directive @tag(name: String!) repeatable on FIELD_DEFINITION';
        if (graphql_1.print(utils_1.stripDescriptions(tagDirectiveDefinition)) !== printedTagDefinition) {
            errors.push(utils_1.errorWithCode('TAG_DIRECTIVE_DEFINITION_INVALID', utils_1.logDirective('tag') +
                `Found @tag definition in service ${serviceName}, but the @tag directive definition was invalid. Please ensure the directive definition in your schema's type definitions matches the following:\n\t${printedTagDefinition}`, tagDirectiveDefinition));
        }
    }
    return errors.filter(({ message }) => !errorsMessagesToFilter.some((keyWord) => message === keyWord));
};
exports.tagDirective = tagDirective;
//# sourceMappingURL=tagDirective.js.map