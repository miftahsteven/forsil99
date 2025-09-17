import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
};

export default function Modal({ open, onClose, title, children }: ModalProps) {
    const closeBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // fokus awal ke tombol close
        closeBtnRef.current?.focus();

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    if (!open) return null;

    const content = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onMouseDown={(e) => {
                // klik backdrop untuk close
                if (e.target === e.currentTarget) onClose();
            }}
            aria-hidden={!open}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                className="bg-white p-6 rounded shadow-lg max-w-lg w-[92%] relative"
            >
                {title && <h2 id="modal-title" className="text-xl font-bold mb-4">{title}</h2>}
                <button
                    ref={closeBtnRef}
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    aria-label="Close"
                >
                    ×
                </button>
                {children}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}