import { StDirective } from './interfaces';
import { PaginationDirective, Summary } from 'smart-table-core';
import { VNode } from 'flaco';
export interface StSummary extends Summary {
    lowerBoundIndex: number;
    higherBoundIndex: number;
}
export interface StPaginationArguments<T> {
    state: StSummary;
    config: StDirective<T>;
    directive: PaginationDirective;
}
export interface StPaginationComponentFunction<T, K> {
    (props: K, directiveDate: StPaginationArguments<T>): VNode;
}
export declare const withPagination: <T, K>(comp: StPaginationComponentFunction<T, K>) => (conf: StDirective<T> & K) => (props: K) => VNode;
