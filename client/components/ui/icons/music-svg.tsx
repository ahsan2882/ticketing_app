export default function MusicIcon({ customClass }: { customClass: string }) {
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
      className={`${customClass}`}
    >
      <circle cx="8" cy="18" r="4"></circle>
      <path d="M12 18V2l7 4"></path>
    </svg>
  );
}
