import R, { pipe } from 'ramda';
const {
  add,
  andThen,
  ascend,
  compose,
  cond,
  curry,
  eqProps,
  equals,
  filter,
  fromPairs,
  groupWith,
  map,
  mergeWith,
  pipeWith,
  reduce,
  sortWith,
  takeLast,
  tap,
  useWith,
  when
} = R;
import {
  dateComparator,
  dateFromFriendlyDate,
  getEntryByFilename,
  getEntryFilenames,
  mapAsync,
  partialEq,
  pathString
} from '../util';

/**
 * @todo Add support --{aspect}.descriptors for matching elements of array
 */

const DEFAULT_SORT_FIELDS = ['date'];
const DEFAULT_FIELDS = ['coffee.roaster', 'coffee.origin.region', 'coffee.grind', 'score'];

// Assume --sort and  --fields are numbers
const flattenEntriesByAverage = curry((sortField, entries) => pipe(
  groupWith(eqProps(sortField)),
  map(duplicates => {
    const length = duplicates.length;
    const reduced = reduce(mergeWith(add), {}, duplicates);
    return map(value => parseFloat((value / length).toFixed(1)), reduced);
  })
)(entries));

// Include only fields in entry
const strainBy = curry((fields, entry) => fromPairs(map(field => [field, pathString(field, entry)], fields)));

export const command = 'stats <type> [fn]';
export const desc = 'Analyze journal entries';
export const builder = yargs => yargs
  .positional('type', {
    describe: 'Type of journal entry',
    type: 'string',
    choices: ['pourover', 'cupping'],
    required: true
  })
  .positional('fn', {
    describe: 'Perform a function on the journal entries matching criteria',
    type: 'string',
    choices: ['average']
  })
  .option('fields', {
    describe: 'Fields to include',
    type: 'array',
    default: DEFAULT_FIELDS
  })
  .option('limit', {
    describe: 'Maximum entries to display',
    type: 'number',
    default: 30
  })
  .option('sort', {
    describe: 'Sort results by fields',
    type: 'array',
    default: DEFAULT_SORT_FIELDS
  })
export const handler = ({ ['$0']: pos, _, stats, fn, fields, limit, sort, ...filters }) => pipeWith(andThen, [
  getEntryFilenames,
  mapAsync(getEntryByFilename),
  filter(partialEq(filters)),
  sortWith([
    ...map(
      cond([
        [equals('date'), () => useWith(dateComparator, [dateFromFriendlyDate, dateFromFriendlyDate])],
        [() => true, compose(ascend, pathString)]
      ])
    , sort),
  ]),
  map(strainBy([...sort, ...fields])),
  when(() => fn === 'average', flattenEntriesByAverage(sort[0])),
  /**
   * @todo takeLast() is more specific to sorting by date.
   * How can we takeFirst() in other cases?
   */
  takeLast(limit),
  tap(console.table),
])();
