import { Info as InfoCommand } from '@quarks.studio/distribution/CLI';
import { createPresentationServices } from '../composition/presentation-services';
export default async function Info(name: string): Promise<void> {
  InfoCommand(name, createPresentationServices().distribution);
}
