"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

/**
 * Confirmation-gated delete button. `action` is a server action that
 * performs the delete and redirects.
 */
export function DeleteButton({
  action,
  title = "Delete record",
  message = "This action cannot be undone.",
  label = "Delete",
}: {
  action: () => Promise<void>;
  title?: string;
  message?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() => startTransition(() => action())}
            >
              <Trash2 className="h-4 w-4" /> Confirm Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{message}</p>
      </Modal>
    </>
  );
}
