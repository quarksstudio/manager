import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface InstalledSkill {
  name: string;
  version: string;
  path: string;
  hash?: string;
  source?: string;
  dependencies?: Record<string, string>;
  enabled: boolean;
  installedAt: string;
}

export interface StoreCatalog {
  schemaVersion: 1;
  skills: Record<string, InstalledSkill>;
}

const EMPTY_CATALOG = (): StoreCatalog => ({ schemaVersion: 1, skills: {} });

export function getStorePath(isGlobal = false, cwd = process.cwd()): string {
  const homedir = os.homedir();
  if (isGlobal || cwd === homedir) {
    return path.join(homedir, '.quark', 'skills');
  }
  return path.join(cwd, '.quark', 'skills');
}

export function loadCatalog(
  isGlobal = false,
  cwd = process.cwd(),
): StoreCatalog {
  const storePath = getStorePath(isGlobal, cwd);
  const catalogPath = path.join(storePath, 'store.json');

  if (!fs.existsSync(catalogPath)) {
    return EMPTY_CATALOG();
  }

  try {
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreCatalog>;
    if (!parsed.skills || typeof parsed.skills !== 'object') {
      throw new Error(`Invalid Quark store catalog: ${catalogPath}`);
    }
    return { schemaVersion: 1, skills: parsed.skills };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read Quark store catalog: ${catalogPath}: ${message}`,
    );
  }
}

export function saveCatalog(
  catalog: StoreCatalog,
  isGlobal = false,
  cwd = process.cwd(),
): void {
  const storePath = getStorePath(isGlobal, cwd);
  const catalogPath = path.join(storePath, 'store.json');

  if (!fs.existsSync(storePath)) {
    fs.mkdirSync(storePath, { recursive: true });
  }

  const tempPath = `${catalogPath}.${process.pid}-${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(catalog, null, 2), {
    encoding: 'utf8',
    flag: 'wx',
  });
  fs.renameSync(tempPath, catalogPath);
}

function saveLock(catalog: StoreCatalog, isGlobal: boolean, cwd: string): void {
  const lockPath = path.join(getStorePath(isGlobal, cwd), 'skill.lock');
  const tempPath = `${lockPath}.${process.pid}-${Date.now()}.tmp`;
  const packages = Object.fromEntries(
    Object.entries(catalog.skills).map(([key, skill]) => [
      key,
      {
        version: skill.version,
        hash: skill.hash,
        source: skill.source,
        dependencies: skill.dependencies || {},
      },
    ]),
  );
  fs.writeFileSync(
    tempPath,
    JSON.stringify({ schemaVersion: 1, packages }, null, 2),
    {
      encoding: 'utf8',
      flag: 'wx',
    },
  );
  fs.renameSync(tempPath, lockPath);
}

export function getSkillPath(
  name: string,
  version: string,
  isGlobal = false,
  cwd = process.cwd(),
): string {
  const storePath = getStorePath(isGlobal, cwd);
  if (!/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i.test(name)) {
    throw new Error(`Invalid skill name: ${name}`);
  }
  if (!/^[a-z0-9][a-z0-9.+_-]*$/i.test(version)) {
    throw new Error(`Invalid skill version: ${version}`);
  }
  const sanitizedName = name.replace(/^@/, '').split('/').join(path.sep);
  return path.join(storePath, sanitizedName, version);
}

export function isInstalled(
  name: string,
  version: string,
  isGlobal = false,
  cwd = process.cwd(),
): boolean {
  const catalog = loadCatalog(isGlobal, cwd);
  return !!catalog['skills']?.[`${name}@${version}`];
}

export function registerInstall(
  name: string,
  version: string,
  isGlobal = false,
  cwd = process.cwd(),
  metadata: Pick<InstalledSkill, 'hash' | 'source' | 'dependencies'> = {},
): void {
  const catalog = loadCatalog(isGlobal, cwd);
  if (!catalog['skills']) {
    catalog['skills'] = {};
  }

  const skillPath = getSkillPath(name, version, isGlobal, cwd);
  catalog['skills'][`${name}@${version}`] = {
    name,
    version,
    path: skillPath,
    hash: metadata.hash,
    source: metadata.source,
    dependencies: metadata.dependencies,
    enabled: true,
    installedAt: new Date().toISOString(),
  };

  saveCatalog(catalog, isGlobal, cwd);
  saveLock(catalog, isGlobal, cwd);
}

export function unregisterInstall(
  name: string,
  version: string,
  isGlobal = false,
  cwd = process.cwd(),
): void {
  const catalog = loadCatalog(isGlobal, cwd);
  delete catalog.skills[`${name}@${version}`];
  saveCatalog(catalog, isGlobal, cwd);
  saveLock(catalog, isGlobal, cwd);
}

export function listInstalled(
  isGlobal = false,
  cwd = process.cwd(),
): InstalledSkill[] {
  return Object.values(loadCatalog(isGlobal, cwd).skills);
}

export function removeSkill(
  name: string,
  version: string,
  isGlobal = false,
  cwd = process.cwd(),
): void {
  const skillPath = getSkillPath(name, version, isGlobal, cwd);
  if (fs.existsSync(skillPath))
    fs.rmSync(skillPath, { recursive: true, force: true });
  unregisterInstall(name, version, isGlobal, cwd);
}
