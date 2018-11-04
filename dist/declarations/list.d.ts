import { VNode } from 'flaco';
import { DisplayedItem } from 'smart-table-core';
import { StDirective } from './interfaces';
export interface StListArguments<T> {
    state: DisplayedItem<T>[];
    config: StDirective<T>;
}
export interface StListComponentFunction<T, K> {
    (props: K, listData: StListArguments<T>): VNode;
}
export declare const withListChange: <T, K>(comp: StListComponentFunction<T, K>) => (conf: StDirective<T> & K) => (props: K) => VNode;
