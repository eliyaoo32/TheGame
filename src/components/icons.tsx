import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 22s5.15-1.23 6.36-2.36a3.37 3.37 0 0 0-3.36-5.64C3.23 15.15 2 22 2 22Z" />
      <path d="m14.23 14.23 2.12 2.12" />
      <path d="M4.22 19.78 2 22" />
      <path d="M12.4 12.4a3.37 3.37 0 0 0 5.64 3.36C19.19 14.61 22 10 22 10S17.23 2 10 2a8 8 0 0 0-8 8c0 1.45.23 2.85.64 4.16" />
    </svg>
  );
}
