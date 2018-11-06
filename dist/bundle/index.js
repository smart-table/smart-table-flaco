'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var flaco = require('flaco');
var smartTableCore = require('smart-table-core');

const withListChange = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable, ...otherConf } = conf;
    const normalizedConf = { stTable };
    const table = normalizedConf.stTable;
    const listener = (items) => {
        updateFunc({ items });
    };
    table.onDisplayChange(listener);
    const WrappingComponent = props => {
        const { items, stTable: whatever, ...otherProps } = props;
        const stState = items || [];
        const fullProps = Object.assign({}, otherConf, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf });
    };
    const subsribe = flaco.onMount((vnode) => {
        updateFunc = flaco.update(WrappingComponent, vnode);
        table.exec();
    });
    const unsubscribe = flaco.onUnMount(() => {
        table.off("DISPLAY_CHANGED" /* DISPLAY_CHANGED */, listener);
    });
    return unsubscribe(subsribe(WrappingComponent));
};

const withSearch = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stScope, ...otherConfProps } = conf;
    const normalizedConf = {
        stTable,
        stScope
    };
    const { stTable: table, stScope: scope } = normalizedConf;
    const directive = smartTableCore.searchDirective({ table, scope });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSearchChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stScope, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = flaco.onMount((vnode) => {
        updateFunction = flaco.update(WrappingComponent, vnode);
    });
    const unsubscribe = flaco.onUnMount(() => {
        directive.off("SEARCH_CHANGED" /* SEARCH_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

const withSort = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stPointer, stCycle = false, ...otherConfProps } = conf;
    const normalizedConf = {
        stPointer,
        stCycle,
        stTable
    };
    const { stPointer: pointer, stTable: table, stCycle: cycle } = normalizedConf; //convenient aliases
    const directive = smartTableCore.sortDirective({ table, pointer, cycle });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSortToggle(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stCycle, stPointer, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = flaco.onMount((vnode) => {
        updateFunction = flaco.update(WrappingComponent, vnode);
    });
    const unsubscribe = flaco.onUnMount(() => {
        directive.off("TOGGLE_SORT" /* TOGGLE_SORT */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

const withFilter = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stType = "string" /* STRING */, stOperator = "includes" /* INCLUDES */, stPointer, ...otherConfProps } = conf;
    const normalizedConf = {
        stTable, stType, stOperator, stPointer
    };
    const { stTable: table, stOperator: operator, stType: type, stPointer: pointer } = normalizedConf;
    const directive = smartTableCore.filterDirective({
        table, operator, pointer, type
    });
    const listener = newState => updateFunction({ stState: newState });
    directive.onFilterChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stType, stOperator, stPointer, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = flaco.onMount((vnode) => {
        updateFunction = flaco.update(WrappingComponent, vnode);
    });
    const unsubscribe = flaco.onUnMount(() => {
        directive.off("FILTER_CHANGED" /* FILTER_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

const withIndicator = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, ...otherConfProps } = conf;
    const normalizedConf = {
        stTable
    };
    const { stTable: table } = normalizedConf;
    const directive = smartTableCore.workingIndicatorDirective({ table });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onExecutionChange(listener);
    const WrappingComponent = props => {
        const { stState = { working: false }, stTable, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = flaco.onMount((vnode) => {
        updateFunction = flaco.update(WrappingComponent, vnode);
    });
    const unsubscribe = flaco.onUnMount(() => {
        directive.off("EXEC_CHANGED" /* EXEC_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

const withPagination = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable, ...otherConfProps } = conf;
    const directive = smartTableCore.paginationDirective({ table: stTable });
    const listener = (newSummary) => {
        const { page, size, filteredCount } = newSummary;
        updateFunc({
            stState: {
                lowerBoundIndex: (page - 1) * size,
                higherBoundIndex: Math.min(page * size - 1, filteredCount - 1),
                ...newSummary
            }
        });
    };
    directive.onSummaryChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, ...otherProps } = props;
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: { stTable }, directive });
    };
    const subscribe = flaco.onMount((vnode) => {
        updateFunc = flaco.update(WrappingComponent, vnode);
    });
    const unsubscribe = flaco.onUnMount(() => {
        directive.off("SUMMARY_CHANGED" /* SUMMARY_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

const withTable = (table) => (comp) => (props, ...rest) => comp(Object.assign({ stTable: table }, props), ...rest);

exports.withListChange = withListChange;
exports.withSearch = withSearch;
exports.withSort = withSort;
exports.withFilter = withFilter;
exports.withIndicator = withIndicator;
exports.withPagination = withPagination;
exports.withTable = withTable;
