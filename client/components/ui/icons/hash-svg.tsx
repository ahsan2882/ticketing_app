export default function HashIcon({ customClass }: { customClass: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={customClass}
    >
      <line x1="4" x2="20" y1="9" y2="9"></line>
      <line x1="4" x2="20" y1="15" y2="15"></line>
      <line x1="10" x2="8" y1="3" y2="21"></line>
      <line x1="16" x2="14" y1="3" y2="21"></line>
    </svg>
  );
}
