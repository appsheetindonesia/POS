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

export const IconRegister = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 10h16l1.5 9a1 1 0 0 1-1 1.2h-17a1 1 0 0 1-1-1.2L4 10z" />
    <path d="M6 10 7.5 4.5A1.5 1.5 0 0 1 9 3.5h6a1.5 1.5 0 0 1 1.5 1L18 10M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17h7" />
  </svg>
);

export const IconHistory = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3.5 2" />
  </svg>
);

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
