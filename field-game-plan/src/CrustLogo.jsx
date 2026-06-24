export default function CrustLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 27 L16 4 L29 27 Z" fill="#ff4c00" />
      <path d="M3 27 L16 4 L29 27" stroke="#d63e00" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
      <circle cx="16" cy="10" r="2" fill="#fff3e6" />
      <circle cx="11.5" cy="15.5" r="1.5" fill="#fff3e6" />
      <circle cx="20.5" cy="15.5" r="1.5" fill="#fff3e6" />
      <circle cx="16" cy="20.5" r="1.7" fill="#fff3e6" />
      <circle cx="9" cy="22" r="1.2" fill="#fff3e6" />
      <circle cx="23" cy="22" r="1.2" fill="#fff3e6" />
    </svg>
  );
}
