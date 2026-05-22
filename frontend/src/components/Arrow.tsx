export default function Arrow({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className={`size-5 stroke-2 fill-none stroke-current ${className}`}
        >
            <line
                x1="5"
                y1="12"
                x2="19"
                y2="12"
                className="translate-x-3 group-hover:translate-x-0 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-in-out"
            />
            <polyline
                points="12 5 19 12 12 19"
                className="-translate-x-1 group-hover:translate-x-0 transition-transform duration-300 ease-in-out"
            />
        </svg>
    );
}
