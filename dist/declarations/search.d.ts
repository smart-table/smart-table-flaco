import { VNode } from 'flaco';
import { SearchConfiguration, SearchDirective } from 'smart-table-core';
import { StDirective } from './interfaces';
export interface StSearchConfiguration<T> extends StDirective<T> {
    stScope: string[];
}
export interface StSearchArguments<T> {
    state: SearchConfiguration;
    config: StSearchConfiguration<T>;
    directive: SearchDirective;
}
export interface StSearchComponentFunction<T, K> {
    (props: K, directiveData: StSearchArguments<T>): VNode;
}
export declare const withSearch: <T, K>(comp: StSearchComponentFunction<T, K>) => (conf: StSearchConfiguration<T> & K) => (props: K) => VNode;
