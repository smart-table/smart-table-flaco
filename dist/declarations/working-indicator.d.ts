import { WorkingIndicator, WorkingIndicatorDirective } from 'smart-table-core';
import { StDirective } from './interfaces';
import { VNode } from 'flaco';
export interface StWorkingArguments<T> {
    state: WorkingIndicator;
    config: StDirective<T>;
    directive: WorkingIndicatorDirective;
}
export interface StWorkingComponentFunction<T, K> {
    (props: K, directiveData: StWorkingArguments<T>): VNode;
}
export declare const withIndicator: <T, K>(comp: StWorkingComponentFunction<T, K>) => (conf: StDirective<T> & K) => (props: K) => VNode;
