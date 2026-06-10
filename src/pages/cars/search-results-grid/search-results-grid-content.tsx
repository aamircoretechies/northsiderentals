import { SearchResults } from './components';

export function CarsSearchResultsGridContent() {
  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="flex flex-col gap-10 lg:gap-14 rounded-3xl mt-0">
        <div className="flex flex-col gap-5 lg:gap-7">
          <SearchResults mode="card" />
        </div>
      </div>
    </div>
  );
}
