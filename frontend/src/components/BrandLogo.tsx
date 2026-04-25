export function BrandLogo() {
  return (
    <span className="brand-mark">
      <svg className="brand-logo" viewBox="0 0 32 32" role="img" aria-label="gpt-image-palette logo">
        <rect x="5" y="4" width="19" height="24" rx="5" fill="#fff" stroke="#181817" strokeWidth="1.4" />
        <path d="M11 10h8M11 15h11M11 20h6" stroke="#181817" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="24" cy="22" r="5" fill="#2f3842" />
        <circle cx="22.4" cy="20.8" r="1.2" fill="#f7f8fa" />
        <circle cx="25.4" cy="22.6" r="1.1" fill="#d8c777" />
      </svg>
      <span>gpt-image-palette</span>
    </span>
  );
}
