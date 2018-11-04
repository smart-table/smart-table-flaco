'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var flaco = require('flaco');
var smartTableCore = require('smart-table-core');

var __rest = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const withListChange = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable } = conf, otherConf = __rest(conf, ["stTable"]);
    const normalizedConf = { stTable };
    const table = normalizedConf.stTable;
    const listener = (items) => {
        updateFunc({ items });
    };
    table.onDisplayChange(listener);
    const WrappingComponent = props => {
        const { items, stTable: whatever } = props, otherProps = __rest(props, ["items", "stTable"]);
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

var __rest$1 = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const withSearch = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stScope } = conf, otherConfProps = __rest$1(conf, ["stTable", "stScope"]);
    const normalizedConf = {
        stTable,
        stScope
    };
    const { stTable: table, stScope: scope } = normalizedConf;
    const directive = smartTableCore.searchDirective({ table, scope });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSearchChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stScope } = props, otherProps = __rest$1(props, ["stState", "stTable", "stScope"]);
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

var __rest$2 = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const withSort = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stPointer, stCycle = false } = conf, otherConfProps = __rest$2(conf, ["stTable", "stPointer", "stCycle"]);
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
        const { stState = directive.state(), stTable, stCycle, stPointer } = props, otherProps = __rest$2(props, ["stState", "stTable", "stCycle", "stPointer"]);
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

var __rest$3 = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const withFilter = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stType = "string" /* STRING */, stOperator = "includes" /* INCLUDES */, stPointer } = conf, otherConfProps = __rest$3(conf, ["stTable", "stType", "stOperator", "stPointer"]);
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
        const { stState = directive.state(), stTable, stType, stOperator, stPointer } = props, otherProps = __rest$3(props, ["stState", "stTable", "stType", "stOperator", "stPointer"]);
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

var __rest$4 = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const withIndicator = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable } = conf, otherConfProps = __rest$4(conf, ["stTable"]);
    const normalizedConf = {
        stTable
    };
    const { stTable: table } = normalizedConf;
    const directive = smartTableCore.workingIndicatorDirective({ table });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onExecutionChange(listener);
    const WrappingComponent = props => {
        const { stState = { working: false }, stTable } = props, otherProps = __rest$4(props, ["stState", "stTable"]);
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

var __rest$5 = (undefined && undefined.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
const withPagination = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable } = conf, otherConfProps = __rest$5(conf, ["stTable"]);
    const directive = smartTableCore.paginationDirective({ table: stTable });
    const listener = (newSummary) => {
        const { page, size, filteredCount } = newSummary;
        updateFunc({
            stState: Object.assign({ lowerBoundIndex: (page - 1) * size, higherBoundIndex: Math.min(page * size - 1, filteredCount - 1) }, newSummary)
        });
    };
    directive.onSummaryChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable } = props, otherProps = __rest$5(props, ["stState", "stTable"]);
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

exports.withListChange = withListChange;
exports.withSearch = withSearch;
exports.withSort = withSort;
exports.withFilter = withFilter;
exports.withIndicator = withIndicator;
exports.withPagination = withPagination;
