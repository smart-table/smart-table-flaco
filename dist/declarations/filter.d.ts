import { VNode } from 'flaco';
import { StDirective } from './interfaces';
import { FilterType, FilterOperator, FilterConfiguration, FilterDirective } from 'smart-table-core';
export interface StFilterConfiguration<T> extends StDirective<T> {
    stPointer: string;
    stOperator?: FilterOperator;
    stType?: FilterType;
}
export interface StFilterArguments<T> {
    state: FilterConfiguration;
    config: StFilterConfiguration<T>;
    directive: FilterDirective;
}
export interface StFilterComponentFunction<T, K> {
    (props: K, directiveData: StFilterArguments<T>): VNode;
}
export declare const withFilter: <T, K>(comp: StFilterComponentFunction<T, K>) => (conf: StFilterConfiguration<T> & K) => (props: K) => VNode;
