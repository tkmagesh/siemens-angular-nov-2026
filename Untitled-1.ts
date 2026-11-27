// typeahead search

import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, delay } from 'rxjs/operators';

const searchInput$ = new Subject<string>();
const fakeApi = (term: string) => of([`${term} result 1`, `${term} result 2`])
  .pipe(delay(300));

searchInput$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(term => fakeApi(term))
).subscribe(results => console.log(results));

searchInput$.next('rx');
searchInput$.next('rxjs'); // Cancels 'rx' request if still pending







// prevent double form submissions
import { fromEvent, of } from 'rxjs';
import { exhaustMap, delay } from 'rxjs/operators';

const submitBtn = document.querySelector('#submit')!;
const saveRequest = () => of('Saved!').pipe(delay(1500));

fromEvent(submitBtn, 'click').pipe(
  exhaustMap(() => saveRequest())
).subscribe(status => console.log(status));
