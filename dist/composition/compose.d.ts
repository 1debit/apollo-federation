import { GraphQLSchema, GraphQLError, TypeDefinitionNode, DirectiveDefinitionNode, TypeExtensionNode, DirectiveNode } from 'graphql';
import { CompositionResult } from './utils';
import { ServiceDefinition, ExternalFieldDefinition, ServiceNameToKeyDirectivesMap } from './types';
interface TypeDefinitionsMap {
    [name: string]: TypeDefinitionNode[];
}
interface TypeExtensionsMap {
    [name: string]: TypeExtensionNode[];
}
interface DirectiveDefinitionsMap {
    [name: string]: {
        [serviceName: string]: DirectiveDefinitionNode;
    };
}
interface TypeToServiceMap {
    [typeName: string]: {
        owningService?: string;
        extensionFieldsToOwningServiceMap: {
            [fieldName: string]: string;
        };
    };
}
export interface KeyDirectivesMap {
    [typeName: string]: ServiceNameToKeyDirectivesMap;
}
declare type ValueTypes = Set<string>;
declare type FieldDirectivesMap = Map<string, DirectiveNode[]>;
declare type TypeNameToFieldDirectivesMap = Map<string, FieldDirectivesMap>;
declare type OtherKnownDirectiveUsages = Set<string>;
export declare function buildMapsFromServiceList(serviceList: ServiceDefinition[]): {
    typeToServiceMap: TypeToServiceMap;
    typeDefinitionsMap: TypeDefinitionsMap;
    typeExtensionsMap: TypeExtensionsMap;
    directiveDefinitionsMap: DirectiveDefinitionsMap;
    externalFields: ExternalFieldDefinition[];
    keyDirectivesMap: KeyDirectivesMap;
    valueTypes: ValueTypes;
    typeNameToFieldDirectivesMap: TypeNameToFieldDirectivesMap;
    otherKnownDirectiveUsages: OtherKnownDirectiveUsages;
};
export declare function buildSchemaFromDefinitionsAndExtensions({ typeDefinitionsMap, typeExtensionsMap, directiveDefinitionsMap, otherKnownDirectiveUsages, }: {
    typeDefinitionsMap: TypeDefinitionsMap;
    typeExtensionsMap: TypeExtensionsMap;
    directiveDefinitionsMap: DirectiveDefinitionsMap;
    otherKnownDirectiveUsages: OtherKnownDirectiveUsages;
}): {
    schema: GraphQLSchema;
    errors: GraphQLError[];
};
export declare function addFederationMetadataToSchemaNodes({ schema, typeToServiceMap, externalFields, keyDirectivesMap, valueTypes, directiveDefinitionsMap, typeNameToFieldDirectivesMap, }: {
    schema: GraphQLSchema;
    typeToServiceMap: TypeToServiceMap;
    externalFields: ExternalFieldDefinition[];
    keyDirectivesMap: KeyDirectivesMap;
    valueTypes: ValueTypes;
    directiveDefinitionsMap: DirectiveDefinitionsMap;
    typeNameToFieldDirectivesMap: TypeNameToFieldDirectivesMap;
}): void;
export declare function composeServices(services: ServiceDefinition[]): CompositionResult;
export {};
//# sourceMappingURL=compose.d.ts.map