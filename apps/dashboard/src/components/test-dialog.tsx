'use client';

import * as React from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, Button } from '@uploadkit/ui';

export function TestDialog() {
  const [open, setOpen] = React.useState(false);
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <p>Open state: {String(open)}</p>
      <button onClick={() => setOpen(true)} style={{ padding: '8px 16px', background: 'green', color: 'white', borderRadius: '6px', marginRight: '8px', cursor: 'pointer' }}>
        Native button open
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Radix DialogTrigger</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <p>If you see this, Dialog works!</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
