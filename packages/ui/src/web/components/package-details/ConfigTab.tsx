import { Pencil, Plus, Save, X } from 'lucide-react';
import type { PackageDetails } from '@quark/registry';

import { usePackageMetadataEditor } from '../../../hooks/usePackageMetadataEditor';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { CardContent } from '../ui/card-content';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export interface ConfigTabProps {
  packageName: string;
  detail: PackageDetails;
  onSaved: () => void;
}

export function ConfigTab({ detail, onSaved }: ConfigTabProps) {
  const editor = usePackageMetadataEditor(detail, undefined, onSaved);

  if (!editor.isEditing) {
    return (
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <p className="text-sm text-foreground">
              {detail.description || 'No description provided.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label>Tags</Label>
            {detail.tags.length === 0 ? (
              <span className="text-sm text-muted-foreground">No tags</span>
            ) : (
              detail.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label>Authors</Label>
            {detail.authors.length === 0 ? (
              <span className="text-sm text-muted-foreground">No authors</span>
            ) : (
              detail.authors.map((author) => (
                <Badge key={author} variant="outline">
                  {author}
                </Badge>
              ))
            )}
          </div>
          <Button variant="outline" size="sm" onClick={editor.startEditing}>
            <Pencil aria-hidden="true" />
            Edit metadata
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="config-description">Description</Label>
          <Textarea
            id="config-description"
            value={editor.description}
            onChange={(event) => editor.setDescription(event.target.value)}
            rows={4}
          />
          {editor.validation.description ? (
            <p className="text-sm text-destructive">
              {editor.validation.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              data-testid="tag-input"
              value={editor.tagInput}
              onChange={(event) => editor.setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  editor.addTag();
                }
              }}
              placeholder="Add a tag…"
            />
            <Button variant="secondary" size="sm" onClick={editor.addTag}>
              <Plus aria-hidden="true" />
              Add
            </Button>
          </div>
          {editor.validation.tags ? (
            <p className="text-sm text-destructive">{editor.validation.tags}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {editor.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => editor.removeTag(tag)}
                  className="rounded p-0.5 hover:bg-secondary-foreground/10"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Authors</Label>
          <div className="flex gap-2">
            <Input
              data-testid="author-input"
              value={editor.authorInput}
              onChange={(event) => editor.setAuthorInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  editor.addAuthor();
                }
              }}
              placeholder="Add an author…"
            />
            <Button variant="secondary" size="sm" onClick={editor.addAuthor}>
              <Plus aria-hidden="true" />
              Add
            </Button>
          </div>
          {editor.validation.authors ? (
            <p className="text-sm text-destructive">
              {editor.validation.authors}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {editor.authors.map((author) => {
              const locked = editor.cannotRemoveAuthor(author);
              return (
                <Badge key={author} variant="outline" className="gap-1 pr-1">
                  {author}
                  <button
                    type="button"
                    disabled={locked}
                    aria-label={
                      locked
                        ? `You cannot remove ${author} as an author`
                        : `Remove author ${author}`
                    }
                    title={locked ? 'You cannot remove yourself' : undefined}
                    onClick={() => editor.removeAuthor(author)}
                    className="rounded p-0.5 hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>

        {editor.saveError ? (
          <p className="text-sm text-destructive">
            Could not save changes: {editor.saveError.message}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button onClick={() => void editor.save()} disabled={editor.saving}>
            <Save aria-hidden="true" />
            {editor.saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button variant="ghost" onClick={editor.cancelEdit}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
