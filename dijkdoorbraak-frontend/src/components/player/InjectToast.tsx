'use client';

import { useEffect } from 'react';
import { useGameStore, INJECT_VARIANT_STYLES } from '@/lib/store';

export default function InjectToast() {
    const { toasts, removeToast, setActiveInject } = useGameStore();

    useEffect(() => {
        if (toasts.length === 0) return;
        const latest = toasts[toasts.length - 1];
        const timer = setTimeout(() => removeToast(latest.id), 6000);
        return () => clearTimeout(timer);
    }, [toasts]);

    if (toasts.length === 0) return null;

    const toast = toasts[toasts.length - 1];
    const v = INJECT_VARIANT_STYLES[toast.variant ?? 'alert'];

    return (
        <div className="absolute top-4 left-0 right-0 z-20 flex justify-center px-4">
            <div
                className={`${v.toastBg} backdrop-blur border ${v.toastBorder} rounded-2xl px-5 py-4 max-w-sm w-full shadow-xl cursor-pointer`}
                onClick={() => {
                    setActiveInject(toast);
                    removeToast(toast.id);
                }}
            >
                <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full ${v.toastDot} animate-pulse mt-1.5 shrink-0`} />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-base leading-none">{v.icon}</span>
                            <p className={`${v.toastLabelColor} text-xs uppercase tracking-widest font-medium`}>{v.label}</p>
                            {toast.targetRole && (
                                <span className="bg-white/20 text-white text-xs font-mono px-1.5 py-0.5 rounded">
                                    → {toast.targetRole}
                                </span>
                            )}
                        </div>
                        <p className="text-white font-bold text-sm">{toast.title}</p>
                        <p className={`${v.toastSubColor} text-xs mt-1 line-clamp-2`}>{toast.content}</p>
                        <p className={`${v.toastLabelColor} text-xs mt-2`}>Tik voor details</p>
                    </div>
                </div>
            </div>
        </div>
    );
}