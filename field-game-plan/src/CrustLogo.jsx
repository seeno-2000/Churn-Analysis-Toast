export default function CrustLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 3C9 3 4 8.2 4 15.2v5.6C4 25 7.2 28 11.4 28h9.2c4.2 0 7.4-3 7.4-7.2v-5.6C28 8.2 23 3 16 3Z"
        fill="#c9893f"
        stroke="#8a4f1f"
        strokeWidth="1.3"
      />
      <path
        d="M16 7.2c-5 0-8 3.5-8 8.3v4.9c0 2.9 2.1 5 5 5h6c2.9 0 5-2.1 5-5v-4.9c0-4.8-3-8.3-8-8.3Z"
        fill="#f6e2b8"
      />
      <circle cx="12.5" cy="15" r="1.1" fill="#e3c890" />
      <circle cx="19.2" cy="13.6" r="0.9" fill="#e3c890" />
      <circle cx="16.5" cy="19.2" r="1.3" fill="#e3c890" />
      <circle cx="13.2" cy="20.8" r="0.7" fill="#e3c890" />
      <circle cx="18.8" cy="18.2" r="0.7" fill="#e3c890" />
    </svg>
  );
}
