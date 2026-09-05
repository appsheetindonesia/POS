import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (props: P) => {
  const { size = 20, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
};

export const IconPlus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);

export const IconMinus = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14" /></svg>
);

export const IconTrash = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
  </svg>
);

export const IconSearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m21 21-3.8-3.8" /></svg>
);

export const IconBanknote = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M5.5 10v.01M18.5 14v.01" />
  </svg>
);

export const IconQr = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M18 18h3v3h-3z" />
  </svg>
);

export const IconCard = (p: P) => (
  <svg {...base(p)}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </svg>
);

export const IconReceipt = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21V3z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </svg>
);

/* ── Glyph merek duotone: isi + aksen emas, berbeda dari ikon utilitas ── */
export const IconRegister = (p: P) => {
  const { size = 20, ...rest } = p;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M5.9 9.5 7.4 4.9A1.7 1.7 0 0 1 9 3.7h6a1.7 1.7 0 0 1 1.6 1.2l1.5 4.6H5.9Z" fill="currentColor" opacity="0.42" />
      <path d="M3.6 11.3h16.8l1.2 7.7a1.6 1.6 0 0 1-1.6 1.8H4a1.6 1.6 0 0 1-1.6-1.8l1.2-7.7Z" fill="currentColor" />
      <rect x="6.6" y="14" width="6.4" height="2.1" rx="1" fill="#F0A82D" />
      <circle cx="16.6" cy="14.9" r="1.05" fill="#F0A82D" />
      <circle cx="16.6" cy="18" r="1.05" fill="#F0A82D" opacity="0.55" />
    </svg>
  );
};

export const IconHistory = (p: P) => {
  const { size = 20, ...rest } = p;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <circle cx="12" cy="12.6" r="8.4" fill="currentColor" opacity="0.42" />
      <circle cx="12" cy="12.6" r="6" fill="currentColor" />
      <path d="M12 9.4v3.4l2.5 1.7" stroke="#F0A82D" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.2 1.9 4.2 5.6l4.1-.7L6.2 1.9Z" fill="#F0A82D" />
    </svg>
  );
};

export const IconPrinter = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" rx="1" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="m4 12.5 5 5L20 6.5" /></svg>
);

export const IconCart = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="20" r="1.6" />
    <circle cx="17" cy="20" r="1.6" />
    <path d="M2.5 3h2l2.6 12.4a1.5 1.5 0 0 0 1.5 1.1h8.9a1.5 1.5 0 0 0 1.5-1.2L21 7H6" />
  </svg>
);

export const IconTag = (p: P) => (
  <svg {...base(p)}>
    <path d="m12.6 2.6 8.8 8.8a2 2 0 0 1 0 2.8l-7.2 7.2a2 2 0 0 1-2.8 0L2.6 12.6A2 2 0 0 1 2 11.2V4a2 2 0 0 1 2-2h7.2a2 2 0 0 1 1.4.6z" />
    <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconArrowRight = (p: P) => (
  <svg {...base(p)}><path d="M4 12h16m-6-6 6 6-6 6" /></svg>
);

export const IconBroom = (p: P) => (
  <svg {...base(p)}>
    <path d="m14 4 6 6M9.5 8.5 4 14c-1.3 1.3-1.3 3.2 0 4.5l1.5 1.5c1.3 1.3 3.2 1.3 4.5 0l5.5-5.5" />
    <path d="m9.5 8.5 6-6 4.5 4.5-6 6z" />
  </svg>
);

export const IconChart = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M8 16v-5M13 16V7M18 16v-8" />
  </svg>
);

export const IconCup = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9h13v5.5A5.5 5.5 0 0 1 11.5 20h-2A5.5 5.5 0 0 1 4 14.5V9z" />
    <path d="M17 10.5h1.5a3 3 0 0 1 0 6H17" />
  </svg>
);

export const IconBox = (p: P) => {
  const { size = 20, ...rest } = p;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <path d="M12 2.9 3.6 7.2v9.6l8.4 4.3 8.4-4.3V7.2L12 2.9Z" fill="currentColor" opacity="0.42" />
      <path d="M3.6 7.2 12 11.5l8.4-4.3L12 2.9 3.6 7.2Z" fill="currentColor" />
      <path d="M12 11.5v9.6" stroke="#F0A82D" strokeWidth="1.9" strokeLinecap="round" />
      <path d="m7.8 5.1 8.3 4.2" stroke="#F0A82D" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
};

export const IconSettings = (p: P) => (
  <svg {...base(p)}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const IconDownload = (p: P) => (
  <svg {...base(p)}><path d="M12 3v12m-5-5 5 5 5-5M4 21h16" /></svg>
);

export const IconPlate = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
  </svg>
);

export const IconBag = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 8h12l1 13H5L6 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const IconChevronDown = (p: P) => (
  <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>
);

export const IconBackspace = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 5H9L2 12l7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
    <path d="m12 9 6 6m0-6-6 6" />
  </svg>
);

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 2.5 20h19L12 3z" />
    <path d="M12 10v4M12 17.5v.01" />
  </svg>
);

export const IconDatabase = (p: P) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

/** Logo cangkir dengan uap yang beranimasi */
export const LogoCup = (p: P) => {
  const { size = 30, ...rest } = p;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...rest}>
      <rect width="32" height="32" rx="9" fill="#1E4D3B" />
      <path
        d="M8 14h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6v-5zm13 1.5h2a3 3 0 0 1 0 6h-2"
        stroke="#F0A82D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M12 6c-1 1.2-1 2.1.2 3.2" stroke="#F5F1E4" strokeWidth="1.8" strokeLinecap="round" className="origin-center animate-steam" />
      <path d="M17 6c-1 1.2-1 2.1.2 3.2" stroke="#F5F1E4" strokeWidth="1.8" strokeLinecap="round" className="origin-center animate-steam" style={{ animationDelay: "0.9s" }} />
    </svg>
  );
};
