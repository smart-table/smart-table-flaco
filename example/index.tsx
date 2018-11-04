import {h, input, mount} from 'flaco';
import {Job, User, users} from './fixture';
import {DisplayedItem, FilterOperator, FilterType, smartTable, SmartTable, SortDirection} from 'smart-table-core';
import {withFilter, withIndicator, withListChange, withPagination, withSearch, withSort} from '../dist/src';

const table = smartTable<User>({
    data: users, tableState: {
        sort: {},
        filter: {},
        search: {},
        slice: {page: 1, size: 25}
    }
});

const debounce = (fn: Function, time = 300) => {
    let timer;
    return (...args) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), time);
    };
};

const UserRow = (UserItem: DisplayedItem<User>) => <tr>
    <td>{UserItem.value.name.first}</td>
    <td>{UserItem.value.name.last}</td>
    <td>{UserItem.value.job}</td>
    <td>{new Date(UserItem.value.birthDate).toLocaleDateString()}</td>
    <td>{UserItem.value.balance}</td>
</tr>;

const UserList = withListChange<User, { id: string }>((props, stProps) => {
    const {state} = stProps;
    return <tbody id={props.id}>
    {state.length ? state.map(UserRow) : <tr>
        <td colspan="5">
            No matching item found
        </td>
    </tr>}
    </tbody>;
});

const Header = withSort<User, any>((props, stProps) => {
    const {state, directive, config} = stProps;
    const className = state.pointer !== config.stPointer || state.direction === SortDirection.NONE ?
        '' : (state.direction === SortDirection.DESC ?
            'st-sort-desc' : 'st-sort-asc');
    const onclick = () => directive.toggle('whatever');
    return <th onclick={onclick} class={className}>
        {props.children}
    </th>;
});

const SearchBar = withSearch<User, any>((props, stProps) => {
    const {state, directive} = stProps;
    const onInput = debounce(ev => directive.search(ev.target.value, {flags: 'i'}));
    return <input placeholder="Search..." type="search" value={state.value || ''} oninput={onInput}/>;
});

const JobFilter = withFilter<User, any>((props, stProps) => {
    const {state, directive, config} = stProps;
    const onChange = (ev) => directive.filter(ev.target.value);

    return <select onchange={onChange}>
        <option value="">-</option>
        <option value={Job.DEV}>{Job.DEV}</option>
        <option value={Job.MANAGER}>{Job.MANAGER}</option>
        <option value={Job.QA}>{Job.QA}</option>
    </select>;
});

const LoadingIndicator = withIndicator<User, any>((props, stProps) => {
    const {state: {working}} = stProps;
    let classNames = (props['class'] || '').split(' ');
    if (working === false) {
        classNames.push('hidden');
    } else {
        const index = classNames.findIndex(x => x === 'hidden');
        if (index >= 0) {
            classNames.splice(index, 1);
        }
    }
    return <div class={classNames.join(' ')}>Loading ...</div>;
});

const BalanceFilter = withFilter<User, any>((props, stProps) => {
    // go directly with table instance
    const {config: {stTable: table}, state} = stProps;
    const clause = state.balance || [];
    const lowerBoundValue = (clause.find(c => c.operator === FilterOperator.GREATER_THAN_OR_EQUAL) || {value: 0}).value;
    const higherBoundValue = (clause.find(c => c.operator === FilterOperator.LOWER_THAN_OR_EQUAL) || {value: 5000}).value;
    const changePartialClause = (operator: FilterOperator) => debounce(ev => {
        const {value} = ev.target;
        const partialClauseIndex = clause.findIndex(c => c.operator === operator);
        if (partialClauseIndex >= 0) {
            clause.splice(partialClauseIndex, 1);
        }
        clause.push({operator, type: FilterType.NUMBER, value: Number(value)});
        table.filter(Object.assign(state, {balance: clause}));
    });

    return <div>
        <label>
            <span>Balance lower bound:</span>
            <input value={lowerBoundValue} onchange={changePartialClause(FilterOperator.GREATER_THAN_OR_EQUAL)}
                   type="range" min="0" max="5000"
                   step="100"/>
        </label>
        <label>
            <span>Balance higher bound:</span>
            <input onChange={changePartialClause(FilterOperator.LOWER_THAN_OR_EQUAL)}
                   type="range" min="0" max="5000"
                   step="100" value={higherBoundValue}/>
        </label>
    </div>;
});

const InputFilter = withFilter<User, any>((props, stProps) => {
    const {children, ...others} = props;
    const onInput = debounce((ev) => {
        stProps.directive.filter(ev.target.value);
    });
    return <input {...others} oninput={onInput}/>;
});

const Pagination = withPagination<User, any>((props, stProps) => {
    const {state, directive} = stProps;
    return <div class="pagination">
        <p class="summary">Showing
            items <em>{state.lowerBoundIndex + 1}</em> - <em>{state.higherBoundIndex + 1}</em> of <em>{state.filteredCount}</em> matching
            items</p>
        <div>
            <button disabled={!directive.isPreviousPageEnabled()}
                    onclick={() => directive.selectPreviousPage()}>Previous
            </button>
            <button disabled={!directive.isNextPageEnabled()} onclick={() => directive.selectNextPage()}>Next</button>
        </div>
    </div>;
});

const App = ({table}) => <div>
    <div id="filter-container">
        <h2>Filter options</h2>
        <label>
            <span>First name:</span>
            <InputFilter placeholder="Search for first name" stTable={table} stPointer="name.first"/>
        </label>
        <label>
            <span>Last name:</span>
            <InputFilter placeholder="Search for last name" stTable={table} stPointer="name.last"/>
        </label>
        <label>
            <span>Filter by job type:</span>
            <JobFilter stTable={table} stPointer="job"/>
        </label>
        <label>
            <span>Born after:</span>
            <InputFilter autocomplete="birthdate" type="date" stTable={table} stPointer="birthDate"
                         stType={FilterType.DATE}
                         stOperator={FilterOperator.GREATER_THAN}/>
        </label>
        <BalanceFilter stPointer="balance" stTable={table}/>
    </div>
    <Pagination stTable={table}/>
    <div id="table-container">
        <LoadingIndicator stTable={table} class="loader"/>
        <table>
            <thead>
            <tr>
                <Header stTable={table} stPointer="name.first" stCycle={true}>First Name</Header>
                <Header stTable={table} stPointer="name.last">Last Name</Header>
                <Header stTable={table} stPointer="job">Job</Header>
                <Header stTable={table} stPointer="birthDate">Birth Date</Header>
                <Header stTable={table} stPointer="balance">Balance</Header>
            </tr>
            <tr>
                <td colspan="5">
                    <SearchBar stTable={table} stScope={['name.first', 'name.last']}/>
                </td>
            </tr>
            </thead>
            <UserList id="Hello" stTable={table}/>
        </table>
        <Pagination stTable={table} />
    </div>
</div>;

const container = document.getElementById('app-container');


mount(<App table={table}/>, {}, container);

