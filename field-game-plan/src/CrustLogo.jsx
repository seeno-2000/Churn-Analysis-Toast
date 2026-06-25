// Minimal geometric mark: a single precise ring with a deliberate gap and an
// inset dot, read as a "C" without resorting to literal pizza iconography.
// Uses currentColor so it inherits the toast-orange accent from its container.
export default function CrustLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="62 75.4"
        strokeDashoffset="-6"
      />
      <circle cx="16" cy="16" r="2.25" fill="currentColor" />
    </svg>
  );
}
