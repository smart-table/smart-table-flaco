const compose = (first, ...fns) => (...args) => fns.reduce((previous, current) => current(previous), first(...args));
const curry = (fn, arityLeft) => {
    const arity = arityLeft || fn.length;
    return (...args) => {
        const argLength = args.length || 1;
        if (arity === argLength) {
            return fn(...args);
        }
        const func = (...moreArgs) => fn(...args, ...moreArgs);
        return curry(func, arity - args.length);
    };
};
const tap = (fn) => arg => {
    fn(arg);
    return arg;
};

const onNextTick = (fn) => setTimeout(fn, 0);
const pairify = (holder) => (key) => [key, holder[key]];
const isShallowEqual = (a, b) => {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    return aKeys.length === bKeys.length && aKeys.every(k => a[k] === b[k]);
};
// no attributes
const NA = Object.freeze({});
const noop = () => {
};
const isVTextNode = (vnode) => vnode.nodeType === 'Text';
const isVNode = (vnode) => typeof vnode !== 'function';

const SVG_NP = 'http://www.w3.org/2000/svg';
var EventSubscriptionMethod;
(function (EventSubscriptionMethod) {
    EventSubscriptionMethod["removeEventListener"] = "removeEventListener";
    EventSubscriptionMethod["addEventListener"] = "addEventListener";
})(EventSubscriptionMethod || (EventSubscriptionMethod = {}));
const updateDomNodeFactory = (method) => (items) => tap(domNode => {
    for (const pair of items) {
        domNode[method](...pair);
    }
});
const removeEventListeners = updateDomNodeFactory(EventSubscriptionMethod.removeEventListener);
const addEventListeners = updateDomNodeFactory(EventSubscriptionMethod.addEventListener);
const setAttributes = (attributePairs) => tap((dom) => {
    const attributes = attributePairs.filter(([key, value]) => typeof value !== 'function');
    for (const [key, value] of attributes) {
        if (value === false) {
            dom.removeAttribute(key);
        }
        else {
            dom.setAttribute(key, value);
        }
    }
});
const removeAttributes = (attributes) => tap((dom) => {
    for (const attr of attributes) {
        dom.removeAttribute(attr);
    }
});
const setTextNode = (val) => (node) => {
    node.textContent = val;
};
const createDomNode = (vnode, parent) => {
    if (vnode.nodeType === 'svg') {
        return document.createElementNS(SVG_NP, vnode.nodeType);
    }
    else if (vnode.nodeType === 'Text') {
        return document.createTextNode(vnode.nodeType);
    }
    return parent.namespaceURI === SVG_NP ?
        document.createElementNS(SVG_NP, vnode.nodeType) :
        document.createElement(vnode.nodeType);
};
// @ts-ignore
const getEventListeners = (props) => Object.keys(props)
    .filter(k => k.substr(0, 2) === 'on')
    .map(k => [k.substr(2).toLowerCase(), props[k]]);

function* traverse(vnode) {
    yield vnode;
    if (vnode.children.length > 0) {
        for (const child of vnode.children) {
            yield* traverse(child);
        }
    }
}

var LifeCycles;
(function (LifeCycles) {
    LifeCycles["onMount"] = "onMount";
    LifeCycles["onUnMount"] = "onUnMount";
    LifeCycles["onUpdate"] = "onUpdate";
})(LifeCycles || (LifeCycles = {}));
const lifeCycleFactory = (method) => curry((fn, comp) => (props, ...args) => {
    const n = comp(props, ...args);
    const applyFn = () => fn(n, ...args);
    const current = n[method];
    n[method] = current ? compose(current, applyFn) : applyFn; // allow multiple hooks;
    return n;
});
const onMount = lifeCycleFactory(LifeCycles.onMount);
const onUnMount = lifeCycleFactory(LifeCycles.onUnMount);
const onUpdate = lifeCycleFactory(LifeCycles.onUpdate);

const updateEventListeners = (newNode, oldNode) => {
    const newNodeEvents = getEventListeners(newNode.props);
    const oldNodeEvents = getEventListeners(oldNode.props);
    return newNodeEvents.length || oldNodeEvents.length ?
        compose(removeEventListeners(oldNodeEvents), addEventListeners(newNodeEvents)) : noop;
};
const updateAttributes = (newVNode, oldVNode) => {
    const newVNodeProps = newVNode.props;
    const oldVNodeProps = oldVNode.props;
    if (isShallowEqual(newVNodeProps, oldVNodeProps)) {
        return noop;
    }
    if (isVTextNode(newVNode)) {
        return setTextNode(newVNode.props.value);
    }
    const newNodeKeys = Object.keys(newVNodeProps);
    const oldNodeKeys = Object.keys(oldVNodeProps);
    const attributesToRemove = oldNodeKeys.filter(k => !newNodeKeys.includes(k));
    return compose(removeAttributes(attributesToRemove), setAttributes(newNodeKeys.map(pairify(newVNodeProps))));
};
const domFactory = createDomNode;
// Apply vnode diffing to actual dom node (if new node => it will be mounted into the parent)
const domify = (oldVnode, newVnode, parentDomNode) => {
    if (oldVnode === null && newVnode) { // There is no previous vnode
        newVnode.dom = parentDomNode.appendChild(domFactory(newVnode, parentDomNode));
        newVnode.lifeCycle = 1;
        return { vnode: newVnode, garbage: null };
    }
    // There is a previous vnode
    if (newVnode === null) { // We must remove the related dom node
        parentDomNode.removeChild(oldVnode.dom);
        return ({ garbage: oldVnode, vnode: null });
    }
    else if (newVnode.nodeType !== oldVnode.nodeType) { // It must be replaced (todo check with keys)
        newVnode.dom = domFactory(newVnode, parentDomNode);
        newVnode.lifeCycle = 1;
        parentDomNode.replaceChild(newVnode.dom, oldVnode.dom);
        return { garbage: oldVnode, vnode: newVnode };
    }
    // Only update attributes
    newVnode.dom = oldVnode.dom;
    // Pass the unMountHook
    if (oldVnode.onUnMount) {
        newVnode.onUnMount = oldVnode.onUnMount;
    }
    newVnode.lifeCycle = oldVnode.lifeCycle + 1;
    return { garbage: null, vnode: newVnode };
};
const noNode = 'none';
const falseNode = Object.freeze({
    nodeType: noNode,
    lifeCycle: -1,
    children: [],
    props: {}
});
const render = (oldVnode, newVnode, parentDomNode, nextBatchOperations = []) => {
    // 1. transform the new vnode to a vnode connected to an actual dom element based on vnode versions diffing
    // 	i. note at this step occur dom insertions/removals
    // 	ii. it may collect sub tree to be dropped (or "unmounted")
    const { vnode, garbage } = domify(oldVnode, newVnode, parentDomNode);
    if (garbage !== null) {
        // Defer unmount lifecycle as it is not "visual"
        for (const g of traverse(garbage)) {
            if (typeof g[LifeCycles.onUnMount] === 'function') {
                nextBatchOperations.push(g.onUnMount);
            }
        }
    }
    // Normalisation of old node (in case of a replace we will consider old node as empty node (no children, no props))
    const tempOldNode = garbage !== null || !oldVnode ? falseNode : oldVnode;
    if (vnode !== null) {
        // 2. update dom attributes based on vnode prop diffing.
        // Sync
        if (typeof vnode[LifeCycles.onUpdate] === 'function' && vnode.lifeCycle > 1) {
            vnode.onUpdate();
        }
        updateAttributes(vnode, tempOldNode)(vnode.dom);
        // Fast path
        if (vnode.nodeType === 'Text') {
            return nextBatchOperations;
        }
        if (typeof vnode.onMount === 'function' && vnode.lifeCycle === 1) {
            nextBatchOperations.push(() => vnode.onMount());
        }
        const childrenCount = Math.max(tempOldNode.children.length, vnode.children.length);
        // Async will be deferred as it is not "visual"
        const setListeners = updateEventListeners(vnode, tempOldNode);
        if (setListeners !== noop) {
            nextBatchOperations.push(() => setListeners(vnode.dom));
        }
        // 3. recursively traverse children to update dom and collect functions to process on next tick
        if (childrenCount > 0) {
            for (let i = 0; i < childrenCount; i++) {
                // We pass nextBatchOperations as reference (improve perf: memory + speed)
                render(tempOldNode.children[i] || null, vnode.children[i] || null, vnode.dom, nextBatchOperations);
            }
        }
    }
    return nextBatchOperations;
};
// todo
const hydrate = (vnode, dom) => {
    const hydrated = Object.assign({}, vnode);
    const domChildren = Array.from(dom.childNodes).filter((n) => n.nodeType !== 3 || n.nodeValue.trim() !== '');
    hydrated.dom = dom;
    hydrated.children = vnode.children.map((child, i) => hydrate(child, domChildren[i]));
    return hydrated;
};
const mount = curry((comp, initProp, root) => {
    const vnode = isVNode(comp) ? comp : comp(initProp || {});
    const oldVNode = root.children.length ? hydrate(vnode, root.children[0]) : null;
    const batch = render(oldVNode, vnode, root);
    onNextTick(() => {
        for (const op of batch) {
            op();
        }
    });
    return vnode;
});

const update = (comp, initialVNode) => {
    let oldNode = initialVNode;
    return (props, ...args) => {
        const mountNode = oldNode.dom.parentNode;
        const newNode = comp(Object.assign({}, oldNode.props, props), ...args);
        const nextBatch = render(oldNode, newNode, mountNode);
        // Danger zone !!!!
        // Change by keeping the same reference so the eventual parent node does not need to be "aware" tree may have changed downstream:
        // oldNode may be the child of someone ...(well that is a tree data structure after all :P )
        oldNode = Object.assign(oldNode || {}, newNode);
        // End danger zone
        onNextTick(() => {
            for (const op of nextBatch) {
                op();
            }
        });
        return newNode;
    };
};
// Interactive elements
// todo

const filterOutFunction = (props) => Object
    .entries(props || {})
    .filter(([key, value]) => typeof value !== 'function');
const escapeHTML = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const renderAsString = curry((comp, initProp) => {
    const vnode = isVNode(comp) ? comp : comp(initProp || {});
    const { nodeType, children, props } = vnode;
    const attributes = escapeHTML(filterOutFunction(props)
        .map(([key, value]) => typeof value === 'boolean' ? (value === true ? key : '') : `${key}="${value}"`)
        .join(' '));
    const childrenHtml = children !== void 0 && children.length > 0 ? children.map(ch => renderAsString(ch)()).join('') : '';
    return isVTextNode(vnode) ? escapeHTML(String(vnode.props.value)) : `<${nodeType}${attributes ? ` ${attributes}` : ''}>${childrenHtml}</${nodeType}>`;
});

var __rest = (undefined && undefined.__rest) || function (s$$1, e) {
    var t = {};
    for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
        t[p$$1] = s$$1[p$$1];
    if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
            t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
    return t;
};
const withListChange = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable } = conf, otherConf = __rest(conf, ["stTable"]);
    const normalizedConf = { stTable };
    const table$$1 = normalizedConf.stTable;
    const listener = (items) => {
        updateFunc({ items });
    };
    table$$1.onDisplayChange(listener);
    const WrappingComponent = props => {
        const { items, stTable: whatever } = props, otherProps = __rest(props, ["items", "stTable"]);
        const stState = items || [];
        const fullProps = Object.assign({}, otherConf, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf });
    };
    const subsribe = onMount((vnode) => {
        updateFunc = update(WrappingComponent, vnode);
        table$$1.exec();
    });
    const unsubscribe = onUnMount(() => {
        table$$1.off("DISPLAY_CHANGED" /* DISPLAY_CHANGED */, listener);
    });
    return unsubscribe(subsribe(WrappingComponent));
};

const proxyListener = (eventMap) => ({ emitter }) => {
    const eventListeners = {};
    const proxy = {
        off(ev) {
            if (!ev) {
                Object.keys(eventListeners).forEach(eventName => proxy.off(eventName));
            }
            if (eventListeners[ev]) {
                emitter.off(ev, ...eventListeners[ev]);
            }
            return proxy;
        }
    };
    for (const ev of Object.keys(eventMap)) {
        const method = eventMap[ev];
        eventListeners[ev] = [];
        proxy[method] = function (...listeners) {
            eventListeners[ev] = eventListeners[ev].concat(listeners);
            emitter.on(ev, ...listeners);
            return proxy;
        };
    }
    return proxy;
};

var Type;
(function (Type) {
    Type["BOOLEAN"] = "boolean";
    Type["NUMBER"] = "number";
    Type["DATE"] = "date";
    Type["STRING"] = "string";
})(Type || (Type = {}));
var FilterOperator;
(function (FilterOperator) {
    FilterOperator["INCLUDES"] = "includes";
    FilterOperator["IS"] = "is";
    FilterOperator["IS_NOT"] = "isNot";
    FilterOperator["LOWER_THAN"] = "lt";
    FilterOperator["GREATER_THAN"] = "gt";
    FilterOperator["GREATER_THAN_OR_EQUAL"] = "gte";
    FilterOperator["LOWER_THAN_OR_EQUAL"] = "lte";
    FilterOperator["EQUALS"] = "equals";
    FilterOperator["NOT_EQUALS"] = "notEquals";
    FilterOperator["ANY_OF"] = "anyOf";
})(FilterOperator || (FilterOperator = {}));

var SortDirection;
(function (SortDirection) {
    SortDirection["ASC"] = "asc";
    SortDirection["DESC"] = "desc";
    SortDirection["NONE"] = "none";
})(SortDirection || (SortDirection = {}));

var SmartTableEvents;
(function (SmartTableEvents) {
    SmartTableEvents["TOGGLE_SORT"] = "TOGGLE_SORT";
    SmartTableEvents["DISPLAY_CHANGED"] = "DISPLAY_CHANGED";
    SmartTableEvents["PAGE_CHANGED"] = "CHANGE_PAGE";
    SmartTableEvents["EXEC_CHANGED"] = "EXEC_CHANGED";
    SmartTableEvents["FILTER_CHANGED"] = "FILTER_CHANGED";
    SmartTableEvents["SUMMARY_CHANGED"] = "SUMMARY_CHANGED";
    SmartTableEvents["SEARCH_CHANGED"] = "SEARCH_CHANGED";
    SmartTableEvents["EXEC_ERROR"] = "EXEC_ERROR";
})(SmartTableEvents || (SmartTableEvents = {}));

const filterListener = proxyListener({ ["FILTER_CHANGED" /* FILTER_CHANGED */]: 'onFilterChange' });
// todo expose and re-export from smart-table-filter
var FilterType;
(function (FilterType) {
    FilterType["BOOLEAN"] = "boolean";
    FilterType["NUMBER"] = "number";
    FilterType["DATE"] = "date";
    FilterType["STRING"] = "string";
})(FilterType || (FilterType = {}));
const filterDirective = ({ table, pointer: pointer$$1, operator = "includes" /* INCLUDES */, type = "string" /* STRING */ }) => {
    const proxy = filterListener({ emitter: table });
    return Object.assign({
        filter(input) {
            const filterConf = {
                [pointer$$1]: [
                    {
                        value: input,
                        operator,
                        type
                    }
                ]
            };
            return table.filter(filterConf);
        },
        state() {
            return table.getTableState().filter;
        }
    }, proxy);
};

const searchListener = proxyListener({ ["SEARCH_CHANGED" /* SEARCH_CHANGED */]: 'onSearchChange' });
const searchDirective = ({ table, scope = [] }) => {
    const proxy = searchListener({ emitter: table });
    return Object.assign(proxy, {
        search(input, opts = {}) {
            return table.search(Object.assign({}, { value: input, scope }, opts));
        },
        state() {
            return table.getTableState().search;
        }
    }, proxy);
};

const sliceListener = proxyListener({
    ["CHANGE_PAGE" /* PAGE_CHANGED */]: 'onPageChange',
    ["SUMMARY_CHANGED" /* SUMMARY_CHANGED */]: 'onSummaryChange'
});
const paginationDirective = ({ table }) => {
    let { slice: { page: currentPage, size: currentSize } } = table.getTableState();
    let itemListLength = table.filteredCount;
    const proxy = sliceListener({ emitter: table });
    const api = {
        selectPage(p) {
            return table.slice({ page: p, size: currentSize });
        },
        selectNextPage() {
            return api.selectPage(currentPage + 1);
        },
        selectPreviousPage() {
            return api.selectPage(currentPage - 1);
        },
        changePageSize(size) {
            return table.slice({ page: 1, size });
        },
        isPreviousPageEnabled() {
            return currentPage > 1;
        },
        isNextPageEnabled() {
            return Math.ceil(itemListLength / currentSize) > currentPage;
        },
        state() {
            return Object.assign(table.getTableState().slice, { filteredCount: itemListLength });
        }
    };
    const directive = Object.assign(api, proxy);
    directive.onSummaryChange(({ page: p, size: s, filteredCount }) => {
        currentPage = p;
        currentSize = s;
        itemListLength = filteredCount;
    });
    return directive;
};

const debounce = (fn, time) => {
    let timer = null;
    return (...args) => {
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), time);
    };
};
const sortListeners = proxyListener({ ["TOGGLE_SORT" /* TOGGLE_SORT */]: 'onSortToggle' });
const directions = ["asc" /* ASC */, "desc" /* DESC */];
const sortDirective = ({ pointer: pointer$$1, table, cycle = false, debounceTime = 0 }) => {
    const cycleDirections = cycle === true ? ["none" /* NONE */].concat(directions) : [...directions].reverse();
    const commit = debounce(table.sort, debounceTime);
    let hit = 0;
    const proxy = sortListeners({ emitter: table });
    const directive = Object.assign({
        toggle() {
            hit++;
            const direction = cycleDirections[hit % cycleDirections.length];
            return commit({ pointer: pointer$$1, direction });
        },
        state() {
            return table.getTableState().sort;
        }
    }, proxy);
    directive.onSortToggle(({ pointer: p }) => {
        hit = pointer$$1 !== p ? 0 : hit;
    });
    const { pointer: statePointer, direction = "asc" /* ASC */ } = directive.state();
    hit = statePointer === pointer$$1 ? (direction === "asc" /* ASC */ ? 1 : 2) : 0;
    return directive;
};

const executionListener = proxyListener({ ["EXEC_CHANGED" /* EXEC_CHANGED */]: 'onExecutionChange' });
const workingIndicatorDirective = ({ table }) => executionListener({ emitter: table });

var __rest$1 = (undefined && undefined.__rest) || function (s$$1, e) {
    var t = {};
    for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
        t[p$$1] = s$$1[p$$1];
    if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
            t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
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
    const { stTable: table$$1, stScope: scope } = normalizedConf;
    const directive = searchDirective({ table: table$$1, scope });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSearchChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stScope } = props, otherProps = __rest$1(props, ["stState", "stTable", "stScope"]);
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("SEARCH_CHANGED" /* SEARCH_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

var __rest$2 = (undefined && undefined.__rest) || function (s$$1, e) {
    var t = {};
    for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
        t[p$$1] = s$$1[p$$1];
    if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
            t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
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
    const { stPointer: pointer, stTable: table$$1, stCycle: cycle } = normalizedConf; //convenient aliases
    const directive = sortDirective({ table: table$$1, pointer, cycle });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onSortToggle(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stCycle, stPointer } = props, otherProps = __rest$2(props, ["stState", "stTable", "stCycle", "stPointer"]);
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("TOGGLE_SORT" /* TOGGLE_SORT */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

var __rest$3 = (undefined && undefined.__rest) || function (s$$1, e) {
    var t = {};
    for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
        t[p$$1] = s$$1[p$$1];
    if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
            t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
    return t;
};
const withFilter = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable, stType = "string" /* STRING */, stOperator = "includes" /* INCLUDES */, stPointer } = conf, otherConfProps = __rest$3(conf, ["stTable", "stType", "stOperator", "stPointer"]);
    const normalizedConf = {
        stTable, stType, stOperator, stPointer
    };
    const { stTable: table$$1, stOperator: operator, stType: type, stPointer: pointer } = normalizedConf;
    const directive = filterDirective({
        table: table$$1, operator, pointer, type
    });
    const listener = newState => updateFunction({ stState: newState });
    directive.onFilterChange(listener);
    const WrappingComponent = props => {
        const { stState = directive.state(), stTable, stType, stOperator, stPointer } = props, otherProps = __rest$3(props, ["stState", "stTable", "stType", "stOperator", "stPointer"]);
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("FILTER_CHANGED" /* FILTER_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

var __rest$4 = (undefined && undefined.__rest) || function (s$$1, e) {
    var t = {};
    for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
        t[p$$1] = s$$1[p$$1];
    if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
            t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
    return t;
};
const withIndicator = (comp) => (conf) => {
    let updateFunction;
    // @ts-ignore
    const { stTable } = conf, otherConfProps = __rest$4(conf, ["stTable"]);
    const normalizedConf = {
        stTable
    };
    const { stTable: table$$1 } = normalizedConf;
    const directive = workingIndicatorDirective({ table: table$$1 });
    const listener = (newState) => updateFunction({ stState: newState });
    directive.onExecutionChange(listener);
    const WrappingComponent = props => {
        const { stState = { working: false }, stTable } = props, otherProps = __rest$4(props, ["stState", "stTable"]);
        const fullProps = Object.assign({}, otherConfProps, otherProps);
        return comp(fullProps, { state: stState, config: normalizedConf, directive });
    };
    const subscribe = onMount((vnode) => {
        updateFunction = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("EXEC_CHANGED" /* EXEC_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

var __rest$5 = (undefined && undefined.__rest) || function (s$$1, e) {
    var t = {};
    for (var p$$1 in s$$1) if (Object.prototype.hasOwnProperty.call(s$$1, p$$1) && e.indexOf(p$$1) < 0)
        t[p$$1] = s$$1[p$$1];
    if (s$$1 != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i$$1 = 0, p$$1 = Object.getOwnPropertySymbols(s$$1); i$$1 < p$$1.length; i$$1++) if (e.indexOf(p$$1[i$$1]) < 0)
            t[p$$1[i$$1]] = s$$1[p$$1[i$$1]];
    return t;
};
const withPagination = (comp) => (conf) => {
    let updateFunc;
    // @ts-ignore
    const { stTable } = conf, otherConfProps = __rest$5(conf, ["stTable"]);
    const directive = paginationDirective({ table: stTable });
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
    const subscribe = onMount((vnode) => {
        updateFunc = update(WrappingComponent, vnode);
    });
    const unsubscribe = onUnMount(() => {
        directive.off("SUMMARY_CHANGED" /* SUMMARY_CHANGED */);
    });
    return unsubscribe(subscribe(WrappingComponent));
};

export { withListChange, withSearch, withSort, withFilter, withIndicator, withPagination };
//# sourceMappingURL=smart-table-flaco.es.js.map
