const ico = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export const MoonIcon = () => <svg {...ico}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>;
export const SunIcon = () => <svg {...ico}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
export const ResetIcon = () => <svg {...ico}><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>;
export const CloseIcon = () => <svg {...ico}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const ExternalIcon = () => <svg {...ico} width={16} height={16} className="cy-ext"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>;
export const PaletteIcon = () => <svg {...ico}><path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.6-9-7.6z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14.5" cy="7" r="1" /><circle cx="17" cy="11" r="1" /></svg>;
export const CheckIcon = () => <svg {...ico} width={16} height={16}><path d="M5 12l5 5L20 7" /></svg>;
