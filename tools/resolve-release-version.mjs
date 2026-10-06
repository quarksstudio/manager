import { appendFileSync } from 'node:fs';
const ref = process.env.RELEASE_REF ?? '';
const version = ref.replace(/^manager-v/, '');
if (
  !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?$/.test(
    version,
  )
) {
  throw new Error('Invalid release version');
}
if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
