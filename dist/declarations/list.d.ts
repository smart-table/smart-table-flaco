import { VNode } from 'flaco';
import { DisplayedItem, SmartTable } from 'smart-table-core';
export interface ListChangeConfigurationObject<T> {
    stTable: SmartTable<T>;
}
export declare type ListChangeConfiguration<T> = ListChangeConfigurationObject<T> | {
    stConfig: ListChangeConfigurationObject<T>;
};
export interface ListChangeArguments<T> {
    state: DisplayedItem<T>[];
    config: ListChangeConfigurationObject<T>;
}
export interface ListChangeComponentFunction<T, K> {
    (props: K, listDate: ListChangeArguments<T>): any;
}
export declare const withListChange: <T, K>(comp: ListChangeComponentFunction<T, K>) => (conf: (ListChangeConfigurationObject<T> & K) | ({
    stConfig: ListChangeConfigurationObject<T>;
} & K)) => (props: K) => VNode;
