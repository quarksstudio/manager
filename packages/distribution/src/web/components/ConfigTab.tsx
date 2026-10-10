import { useEffect, useState } from 'react';
import type { PackageDetails } from '../../index';
import { Alert, Button, Input, Switch, Tag } from 'antd';
import { QuarkTheme } from '@quarks.studio/web-ui';

import { usePackageMetadataEditor } from '../../hooks/usePackageMetadataEditor';

export interface ConfigTabProps {
  detail: PackageDetails;
}

/**
 * The package's configuration panel. Every edit is issued from the browser
 * against the registry, so the server pages only ever render this.
 */
export function ConfigTab({ detail }: ConfigTabProps) {
  const editor = usePackageMetadataEditor(detail);
  const { startEditing } = editor;
  const [seeded, setSeeded] = useState(false);

  // Seed once from the server props: the first render already shows them, and
  // every later render reads the same state the save button writes.
  useEffect(() => {
    startEditing();
    setSeeded(true);
  }, [startEditing]);

  const authors = seeded ? editor.authors : (detail.authors ?? []);
  const description = seeded ? editor.description : detail.description;
  const isPrivate = seeded ? editor.isPrivate : (detail.isPrivate ?? false);

  return (
    <QuarkTheme>
      <div className="space-y-8" data-testid="config-tab">
        <section aria-label="Miembros autorizados">
          <h3 className="!mb-2 text-base font-semibold">
            Miembros autorizados
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Cada miembro puede publicar y editar este paquete.
          </p>
          <div className="my-3 flex flex-wrap gap-2">
            {authors.length === 0 && (
              <span className="text-sm text-slate-500">
                No hay miembros autorizados.
              </span>
            )}
            {authors.map((author) => (
              <Tag
                key={author}
                closable={!editor.cannotRemoveAuthor(author)}
                onClose={() => editor.removeAuthor(author)}
                data-testid={`member-${author}`}
              >
                {author}
              </Tag>
            ))}
          </div>
          <div className="flex max-w-xl gap-2">
            <Input
              aria-label="Nuevo miembro"
              placeholder="Usuario o uid"
              value={editor.authorInput}
              onChange={(event) => editor.setAuthorInput(event.target.value)}
              onPressEnter={editor.addAuthor}
            />
            <Button onClick={editor.addAuthor}>Añadir miembro</Button>
          </div>
          {editor.validation.authors && (
            <p role="alert" className="mt-2 text-sm text-red-400">
              {editor.validation.authors}
            </p>
          )}
        </section>

        <section aria-label="Detalles">
          <h3 className="!mb-3 text-base font-semibold">Detalles</h3>
          <div className="max-w-xl space-y-4">
            <div>
              <Input.TextArea
                aria-label="Descripción"
                maxLength={500}
                rows={4}
                value={description}
                onChange={(event) => editor.setDescription(event.target.value)}
              />
              {editor.validation.description && (
                <p role="alert" className="mt-1 text-sm text-red-400">
                  {editor.validation.description}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Paquete privado</p>
                <p className="text-sm text-slate-500">
                  Solo los miembros autorizados pueden verlo.
                </p>
              </div>
              <Switch
                aria-label="Paquete privado"
                checked={isPrivate}
                onChange={editor.setIsPrivate}
              />
            </div>
            {editor.saveError && (
              <Alert
                type="error"
                showIcon
                message="No se pudieron guardar los cambios."
                description={editor.saveError.message}
              />
            )}
            <Button
              type="primary"
              loading={editor.saving}
              onClick={() => void editor.save()}
            >
              Guardar cambios
            </Button>
          </div>
        </section>
      </div>
    </QuarkTheme>
  );
}
