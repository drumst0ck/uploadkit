'use client';

import * as React from 'react';
import { CreateProjectDialog } from '../create-project-dialog';

/**
 * The one white pill on the overview. Uses the dialog in controlled mode so the
 * button is part of the server-rendered HTML (no trigger-slot hydration gap).
 */
export function NewProjectButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        className="pd-button pd-button--primary"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        New project
      </button>
      <CreateProjectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
