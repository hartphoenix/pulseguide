import { useEffect, useRef } from "react";

export interface ContextMenuProps {
	x: number;
	y: number;
	label: string;
	onAction: () => void;
	onClose: () => void;
}

export function ContextMenu({ x, y, label, onAction, onClose }: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		}
		function handleKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("mousedown", handleClick);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("keydown", handleKey);
		};
	}, [onClose]);

	useEffect(() => {
		const el = menuRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const clampedX = Math.min(x, window.innerWidth - rect.width - 4);
		const clampedY = Math.min(y, window.innerHeight - rect.height - 4);
		el.style.left = `${Math.max(0, clampedX)}px`;
		el.style.top = `${Math.max(0, clampedY)}px`;
	}, [x, y]);

	return (
		<div
			ref={menuRef}
			style={{
				position: "fixed",
				left: x,
				top: y,
				zIndex: 1000,
				background: "var(--bg-surface)",
				border: "1px solid var(--border)",
				borderRadius: 6,
				padding: "4px 0",
				boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
				minWidth: 180,
			}}
		>
			<button
				type="button"
				onClick={onAction}
				style={{
					display: "block",
					width: "100%",
					padding: "8px 16px",
					fontSize: 14,
					color: "var(--text-h)",
					background: "none",
					border: "none",
					textAlign: "left",
					cursor: "pointer",
					fontFamily: "inherit",
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "var(--bg-hover)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = "none";
				}}
			>
				{label}
			</button>
		</div>
	);
}
