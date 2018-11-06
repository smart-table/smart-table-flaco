var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
import { h, mount } from 'flaco';
import { Job, users } from './fixture';
import { smartTable } from 'smart-table-core';
import { withFilter, withIndicator, withListChange, withPagination, withSearch, withSort, withTable } from '../dist/src';
const compose = (a, b) => (...args) => b(a(...args));
const table = smartTable({
    data: users, tableState: {
        sort: {},
        filter: {},
        search: {},
        slice: { page: 1, size: 25 }
    }
});
const withUserTable = withTable(table);
const sortable = compose(withSort, withUserTable);
const searchable = compose(withSearch, withUserTable);
const listable = compose(withListChange, withUserTable);
const filterable = compose(withFilter, withUserTable);
const paginable = compose(withPagination, withUserTable);
const indicable = compose(withIndicator, withUserTable);
const debounce = (fn, time = 300) => {
    let timer;
    return (...args) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), time);
    };
};
const UserRow = (UserItem) => h("tr", null,
    h("td", null, UserItem.value.name.first),
    h("td", null, UserItem.value.name.last),
    h("td", null, UserItem.value.job),
    h("td", null, new Date(UserItem.value.birthDate).toLocaleDateString()),
    h("td", null, UserItem.value.balance));
const UserList = listable((props, stProps) => {
    const { state } = stProps;
    return h("tbody", { id: props.id }, state.length ? state.map(UserRow) : h("tr", null,
        h("td", { colspan: "5" }, "No matching item found")));
});
const Header = sortable((props, stProps) => {
    const { state, directive, config } = stProps;
    const className = state.pointer !== config.stPointer || state.direction === "none" /* NONE */ ?
        '' : (state.direction === "desc" /* DESC */ ?
        'st-sort-desc' : 'st-sort-asc');
    const onclick = () => directive.toggle('whatever');
    return h("th", { onclick: onclick, class: className }, props.children);
});
const SearchBar = searchable((props, stProps) => {
    const { state, directive } = stProps;
    const onInput = debounce(ev => directive.search(ev.target.value, { flags: 'i' }));
    return h("input", { placeholder: "Search...", type: "search", value: state.value || '', oninput: onInput });
});
const JobFilter = filterable((props, stProps) => {
    const { directive } = stProps;
    const onChange = (ev) => directive.filter(ev.target.value);
    return h("select", { onchange: onChange },
        h("option", { value: "" }, "-"),
        h("option", { value: Job.DEV }, Job.DEV),
        h("option", { value: Job.MANAGER }, Job.MANAGER),
        h("option", { value: Job.QA }, Job.QA));
});
const LoadingIndicator = indicable((props, stProps) => {
    const { state: { working } } = stProps;
    let classNames = (props['class'] || '').split(' ');
    if (working === false) {
        classNames.push('hidden');
    }
    else {
        const index = classNames.findIndex(x => x === 'hidden');
        if (index >= 0) {
            classNames.splice(index, 1);
        }
    }
    return h("div", { class: classNames.join(' ') }, "Loading ...");
});
const BalanceFilter = filterable((props, stProps) => {
    // go directly with table instance
    const { config: { stTable: table }, state } = stProps;
    const clause = state.balance || [];
    const lowerBoundValue = (clause.find(c => c.operator === "gte" /* GREATER_THAN_OR_EQUAL */) || { value: 0 }).value;
    const higherBoundValue = (clause.find(c => c.operator === "lte" /* LOWER_THAN_OR_EQUAL */) || { value: 5000 }).value;
    const changePartialClause = (operator) => debounce(ev => {
        const { value } = ev.target;
        const partialClauseIndex = clause.findIndex(c => c.operator === operator);
        if (partialClauseIndex >= 0) {
            clause.splice(partialClauseIndex, 1);
        }
        clause.push({ operator, type: "number" /* NUMBER */, value: Number(value) });
        table.filter(Object.assign(state, { balance: clause }));
    });
    return h("div", null,
        h("label", null,
            h("span", null, "Balance lower bound:"),
            h("input", { value: lowerBoundValue, onchange: changePartialClause("gte" /* GREATER_THAN_OR_EQUAL */), type: "range", min: "0", max: "5000", step: "100" })),
        h("label", null,
            h("span", null, "Balance higher bound:"),
            h("input", { onChange: changePartialClause("lte" /* LOWER_THAN_OR_EQUAL */), type: "range", min: "0", max: "5000", step: "100", value: higherBoundValue })));
});
const InputFilter = filterable((props, stProps) => {
    const { children } = props, others = __rest(props, ["children"]);
    const onInput = debounce((ev) => {
        stProps.directive.filter(ev.target.value);
    });
    return h("input", Object.assign({}, others, { oninput: onInput }));
});
const Pagination = paginable((props, stProps) => {
    const { state, directive } = stProps;
    return h("div", { class: "pagination" },
        h("p", { class: "summary" },
            "Showing items ",
            h("em", null, state.lowerBoundIndex + 1),
            " - ",
            h("em", null, state.higherBoundIndex + 1),
            " of ",
            h("em", null, state.filteredCount),
            " matching items"),
        h("div", null,
            h("button", { disabled: !directive.isPreviousPageEnabled(), onclick: () => directive.selectPreviousPage() }, "Previous"),
            h("button", { disabled: !directive.isNextPageEnabled(), onclick: () => directive.selectNextPage() }, "Next")));
});
const App = ({ table }) => h("div", null,
    h("div", { id: "filter-container" },
        h("h2", null, "Filter options"),
        h("label", null,
            h("span", null, "First name:"),
            h(InputFilter, { placeholder: "Search for first name", stPointer: "name.first" })),
        h("label", null,
            h("span", null, "Last name:"),
            h(InputFilter, { placeholder: "Search for last name", stPointer: "name.last" })),
        h("label", null,
            h("span", null, "Filter by job type:"),
            h(JobFilter, { stPointer: "job" })),
        h("label", null,
            h("span", null, "Born after:"),
            h(InputFilter, { autocomplete: "birthdate", type: "date", stPointer: "birthDate", stType: "date" /* DATE */, stOperator: "gt" /* GREATER_THAN */ })),
        h(BalanceFilter, { stPointer: "balance" })),
    h(Pagination, null),
    h("div", { id: "table-container" },
        h(LoadingIndicator, { class: "loader" }),
        h("table", null,
            h("thead", null,
                h("tr", null,
                    h(Header, { stPointer: "name.first", stCycle: true }, "First Name"),
                    h(Header, { stPointer: "name.last" }, "Last Name"),
                    h(Header, { stPointer: "job" }, "Job"),
                    h(Header, { stPointer: "birthDate" }, "Birth Date"),
                    h(Header, { stPointer: "balance" }, "Balance")),
                h("tr", null,
                    h("td", { colspan: "5" },
                        h(SearchBar, { stScope: ['name.first', 'name.last'] })))),
            h(UserList, { id: "Hello" })),
        h(Pagination, null)));
const container = document.getElementById('app-container');
mount(h(App, { table: table }), {}, container);
