import type { PackageDetails } from '@quarks.studio/registry/client';
export interface ConfigTabProps {
  packageName: string;
  detail: PackageDetails;
  action?: string;
  error?: string;
  draft?: { description: string; tags: string; authors: string };
}
export function ConfigTab({ detail, action, error, draft }: ConfigTabProps) {
  return (
    <form method="post" action={action} className="space-y-4">
      {error && <p role="alert">{error}</p>}
      <label className="block">
        Description
        <textarea
          name="description"
          required
          maxLength={500}
          defaultValue={draft?.description ?? detail.description}
          className="block w-full rounded border p-2"
        />
      </label>
      <label className="block">
        Tags (comma separated)
        <input
          name="tags"
          defaultValue={draft?.tags ?? detail.tags.join(', ')}
          className="block w-full rounded border p-2"
        />
      </label>
      <label className="block">
        Authors (comma separated)
        <input
          name="authors"
          required
          defaultValue={draft?.authors ?? detail.authors.join(', ')}
          className="block w-full rounded border p-2"
        />
      </label>
      <button
        type="submit"
        disabled={!action}
        className="rounded border px-4 py-2"
      >
        Save changes
      </button>
    </form>
  );
}
