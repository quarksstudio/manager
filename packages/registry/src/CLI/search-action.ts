import { Search as SearchCommand } from '@quarks.studio/package-search/CLI';
import { createPresentationServices } from '../composition/presentation-services';
export default async function Search(query: string): Promise<void> {
  SearchCommand(query, createPresentationServices().search);
}
