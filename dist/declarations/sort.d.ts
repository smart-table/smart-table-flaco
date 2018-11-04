import { VNode } from 'flaco';
import { SortConfiguration, SortDirective } from 'smart-table-core';
import { StDirective } from './interfaces';
export interface StSortConfiguration<T> extends StDirective<T> {
    stPointer: string;
    stCycle?: boolean;
}
export interface StSortArguments<T> {
    state: SortConfiguration;
    config: StSortConfiguration<T>;
    directive: SortDirective;
}
export interface StSortComponentFunction<T, K> {
    (props: K, directiveData: StSortArguments<T>): VNode;
}
export declare const withSort: <T, K>(comp: StSortComponentFunction<T, K>) => (conf: StSortConfiguration<T> & K) => (props: K) => VNode;
